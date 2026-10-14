// VTID-05181 — ORB native voice engine, Android (plan N6c, Change 12).
//
// What it does — and only this; every decision (silent vs verbatim frame, barge-in, legacy
// pre-roll, cooldowns) lives in the TypeScript duplex gate (plan Change 1):
//  - captures 16 kHz mono PCM16 from AudioSource.VOICE_COMMUNICATION, assembles exact
//    1024-sample frames on a dedicated thread and emits {b64, rms, ts};
//  - attaches AcousticEchoCanceler / NoiseSuppressor / AutomaticGainControl to the capture
//    session when available and reports what is attached (no AEC ⇒ fullDuplexSafe false);
//  - plays server PCM (16 or 24 kHz, from the mime) through an AudioTrack per output rate,
//    at the session playback rate with the pitch following (PlaybackParams, or the resample
//    fallback), with the widget's `playing` / `startedAt` / 400 ms grace semantics;
//  - holds exclusive transient audio focus, MODE_IN_COMMUNICATION, speaker by default,
//    Bluetooth HFP when connected; reports focus loss, route changes and app background.
// It never synthesises speech and never chooses a voice (plan rule 41/42a scan): it only
// plays the PCM the gateway sends.
package expo.modules.vitanavoice

import android.Manifest
import android.annotation.SuppressLint
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.media.AudioDeviceCallback
import android.media.AudioDeviceInfo
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioRecord
import android.media.AudioTrack
import android.media.MediaRecorder
import android.media.PlaybackParams
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.Process
import androidx.core.content.ContextCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.ProcessLifecycleOwner
import expo.modules.vitanavoice.core.AudioEffectsProvider
import expo.modules.vitanavoice.core.Base64Codec
import expo.modules.vitanavoice.core.Cancellable
import expo.modules.vitanavoice.core.Capabilities
import expo.modules.vitanavoice.core.CapabilityResolver
import expo.modules.vitanavoice.core.Clock
import expo.modules.vitanavoice.core.EffectChain
import expo.modules.vitanavoice.core.EncodedFrame
import expo.modules.vitanavoice.core.FocusPolicy
import expo.modules.vitanavoice.core.FrameAssembler
import expo.modules.vitanavoice.core.Pcm
import expo.modules.vitanavoice.core.PlaybackController
import expo.modules.vitanavoice.core.PlaybackRateConfig
import expo.modules.vitanavoice.core.PlaybackRateMode
import expo.modules.vitanavoice.core.PlaybackState
import expo.modules.vitanavoice.core.QueuedChunk
import expo.modules.vitanavoice.core.RouteMapper
import expo.modules.vitanavoice.core.RouteReason
import expo.modules.vitanavoice.core.Scheduler
import kotlin.math.max

class VoiceEngineException(message: String) : RuntimeException(message)

class VoiceEngine(
  private val context: Context,
  private val listener: Listener,
  effectsProvider: AudioEffectsProvider = SystemAudioEffects(),
  private val clock: Clock = Clock { System.currentTimeMillis() },
  mode: PlaybackRateMode = PlaybackRateConfig.PLAYBACK_RATE_MODE,
) {
  interface Listener {
    fun onFrame(frame: EncodedFrame)

    fun onPlaybackState(state: PlaybackState)

    fun onInterruption(kind: String)

    fun onRouteChange(reason: String, output: String)

    fun onBackground()
  }

  companion object {
    private const val READ_CHUNK_SAMPLES = 512
    private const val WRITE_SLICE_MS = 20
    private const val ROUTE_DEBOUNCE_MS = 250L
    private const val JOIN_MS = 300L
    private val WIRED_TYPES = setOf(
      RouteMapper.TYPE_WIRED_HEADSET, RouteMapper.TYPE_WIRED_HEADPHONES, RouteMapper.TYPE_USB_HEADSET,
    )
  }

  private val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
  private val mainHandler = Handler(Looper.getMainLooper())
  private val effects = EffectChain(effectsProvider)
  private val scheduler = Scheduler { delayMs, task ->
    mainHandler.postDelayed(task, delayMs)
    Cancellable { mainHandler.removeCallbacks(task) }
  }

  val playback = PlaybackController(clock, scheduler, mode) { listener.onPlaybackState(it) }

  internal val focus = FocusController(audioManager, mainHandler) { change -> handleFocusChange(change) }

  @Volatile
  var running: Boolean = false
    private set

  // Capture
  private var record: AudioRecord? = null
  private var recordThread: Thread? = null

  @Volatile
  private var captureGeneration = 0

  // Playback
  private val trackLock = Any()
  private val tracks = HashMap<Int, AudioTrack>()
  private var activeTrack: AudioTrack? = null
  private var activeSpeed = Double.NaN

  @Volatile
  private var tracksDirty = false
  private var writerThread: Thread? = null

  // Route / lifecycle
  private var savedMode: Int? = null
  private var savedSpeakerphone: Boolean? = null
  private var scoStarted = false
  private var deviceCallback: AudioDeviceCallback? = null
  private var headsetReceiver: BroadcastReceiver? = null
  private var lifecycleObserver: LifecycleEventObserver? = null
  private var pendingRouteReason = RouteReason.DEVICE_ADDED
  private val routeDebounce = Runnable { handleRouteChange(pendingRouteReason) }

  // ── Session ──────────────────────────────────────────────────────────────

  @Synchronized
  fun start(leadFirstOnly: Boolean, playbackRate: Double) {
    playback.configure(leadFirstOnly, playbackRate)
    if (running) return
    if (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
      // The in-app rationale and the OS prompt are N6d; the engine never asks by itself.
      throw VoiceEngineException("RECORD_AUDIO permission is not granted")
    }
    if (!focus.request()) throw VoiceEngineException("audio focus was refused")
    try {
      savedMode = audioManager.mode
      @Suppress("DEPRECATION")
      savedSpeakerphone = audioManager.isSpeakerphoneOn
      audioManager.mode = AudioManager.MODE_IN_COMMUNICATION
      applyRoute()
      startCapture()
      running = true
      startWriter()
      mainHandler.post { registerObservers() }
    } catch (e: RuntimeException) {
      teardown()
      throw e
    }
  }

  @Synchronized
  fun stop() {
    if (!running && record == null && !focus.held) return
    teardown()
  }

  private fun teardown() {
    running = false
    mainHandler.removeCallbacks(routeDebounce)
    playback.reset()
    stopCapture()
    writerThread?.let { t ->
      t.interrupt()
      joinQuietly(t)
    }
    writerThread = null
    releaseTracks()
    mainHandler.post { unregisterObservers() }
    restoreRoute()
    focus.abandon()
  }

  // ── Playback ─────────────────────────────────────────────────────────────

  /** Queues one server chunk: base64 Int16 LE mono at [sampleRate] (16000 or 24000, from the mime). */
  fun enqueue(b64: String, sampleRate: Int) {
    if (!running) throw VoiceEngineException("enqueue() before start()")
    val pcm = Pcm.fromLittleEndianBytes(Base64Codec.decode(b64))
    if (pcm.isEmpty()) return
    playback.enqueue(pcm, sampleRate)
  }

  /** Barge-in / `interrupted`: synchronous — the queue is empty and the track silent on return. */
  fun stopPlayback() {
    playback.stopPlayback()
    silenceActiveTrack()
  }

  fun setPlaybackRate(rate: Double) = playback.setPlaybackRate(rate)

  fun capabilities(): Capabilities {
    val state = if (running) effects.state() else effects.availability()
    return CapabilityResolver.resolve(
      state,
      CapabilityResolver.modelKey(Build.MANUFACTURER ?: "", Build.MODEL ?: ""),
      playback.playbackRateMode,
    )
  }

  private fun startWriter() {
    val t = Thread({ writerLoop() }, "VitanaVoice-playback")
    writerThread = t
    t.start()
  }

  private fun writerLoop() {
    Process.setThreadPriority(Process.THREAD_PRIORITY_URGENT_AUDIO)
    while (running) {
      val q = try {
        playback.awaitChunk(100)
      } catch (_: InterruptedException) {
        break
      } ?: continue
      if (!playback.isCurrent(q)) continue
      if (q.notBeforeMs > 0) {
        val wait = q.notBeforeMs - clock.nowMs()
        if (wait > 0) {
          try {
            Thread.sleep(wait)
          } catch (_: InterruptedException) {
            break
          }
        }
        if (!playback.isCurrent(q) || !running) continue
      }
      writeChunk(q)
    }
  }

  private fun writeChunk(q: QueuedChunk) {
    val chunk = q.chunk
    val track = trackFor(chunk.sampleRate, chunk.speed, q.burstStart) ?: return
    val slice = max(1, chunk.sampleRate * WRITE_SLICE_MS / 1000)
    var offset = 0
    while (offset < chunk.samples.size) {
      if (!running || !playback.isCurrent(q)) {
        // Stopped mid-chunk: whatever this thread wrote after the flush must not play later.
        silenceTrack(track)
        return
      }
      val n = minOf(slice, chunk.samples.size - offset)
      val written = track.write(chunk.samples, offset, n)
      if (written < 0) return
      offset += written
    }
  }

  private fun trackFor(sampleRate: Int, speed: Double, burstStart: Boolean): AudioTrack? = synchronized(trackLock) {
    if (tracksDirty) {
      // Route changed: finish what is buffered on the old track, rebuild on the next chunk.
      for (t in tracks.values) releaseTrack(t, drain = true)
      tracks.clear()
      activeTrack = null
      activeSpeed = Double.NaN
      tracksDirty = false
    }
    val previous = activeTrack
    val track = tracks.getOrPut(sampleRate) { buildTrack(sampleRate) ?: return@synchronized null }
    if (previous != null && previous !== track) {
      // Output rate changed (Nova 24 kHz ↔ Polly 16 kHz): MODE_STREAM stop() plays out the rest.
      try {
        previous.stop()
      } catch (_: IllegalStateException) {
      }
      activeSpeed = Double.NaN
    }
    activeTrack = track
    if (activeSpeed != speed) {
      // Pitch follows speed, like Web Audio playbackRate (plan F2).
      track.playbackParams = PlaybackParams().setSpeed(speed.toFloat()).setPitch(speed.toFloat())
      activeSpeed = speed
    }
    if (track.playState != AudioTrack.PLAYSTATE_PLAYING) {
      if (burstStart) track.flush()
      track.play()
    }
    track
  }

  private fun buildTrack(sampleRate: Int): AudioTrack? {
    val min = AudioTrack.getMinBufferSize(sampleRate, AudioFormat.CHANNEL_OUT_MONO, AudioFormat.ENCODING_PCM_16BIT)
    if (min <= 0) return null
    val track = AudioTrack.Builder()
      .setAudioAttributes(VoiceAudioAttributes.communication())
      .setAudioFormat(
        AudioFormat.Builder()
          .setSampleRate(sampleRate)
          .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
          .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
          .build(),
      )
      .setBufferSizeInBytes(max(min * 2, sampleRate / 5 * 2))
      .setTransferMode(AudioTrack.MODE_STREAM)
      .build()
    if (track.state != AudioTrack.STATE_INITIALIZED) {
      track.release()
      return null
    }
    return track
  }

  private fun silenceActiveTrack() {
    synchronized(trackLock) { activeTrack?.let { silenceTrack(it) } }
  }

  private fun silenceTrack(track: AudioTrack) {
    try {
      track.pause()
      track.flush()
    } catch (_: IllegalStateException) {
    }
  }

  private fun releaseTracks() {
    synchronized(trackLock) {
      for (t in tracks.values) releaseTrack(t, drain = false)
      tracks.clear()
      activeTrack = null
      activeSpeed = Double.NaN
      tracksDirty = false
    }
  }

  private fun releaseTrack(track: AudioTrack, drain: Boolean) {
    try {
      if (drain) track.stop() else silenceTrack(track)
    } catch (_: IllegalStateException) {
    }
    track.release()
  }

  // ── Capture ──────────────────────────────────────────────────────────────

  @SuppressLint("MissingPermission") // checked in start()
  private fun startCapture() {
    val min = AudioRecord.getMinBufferSize(Pcm.IN_RATE_HZ, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT)
    if (min <= 0) throw VoiceEngineException("AudioRecord.getMinBufferSize failed ($min)")
    val r = AudioRecord(
      MediaRecorder.AudioSource.VOICE_COMMUNICATION,
      Pcm.IN_RATE_HZ,
      AudioFormat.CHANNEL_IN_MONO,
      AudioFormat.ENCODING_PCM_16BIT,
      max(min * 2, Pcm.FRAME_BYTES * 2),
    )
    if (r.state != AudioRecord.STATE_INITIALIZED) {
      r.release()
      throw VoiceEngineException("AudioRecord could not be initialised")
    }
    effects.attachAll(r.audioSessionId)
    r.startRecording()
    if (r.recordingState != AudioRecord.RECORDSTATE_RECORDING) {
      effects.releaseAll()
      r.release()
      throw VoiceEngineException("AudioRecord did not start (microphone busy?)")
    }
    record = r
    val gen = ++captureGeneration
    val assembler = FrameAssembler { frame -> listener.onFrame(FrameAssembler.encode(frame, clock.nowMs().toDouble())) }
    val t = Thread({ readLoop(r, assembler, gen) }, "VitanaVoice-capture")
    recordThread = t
    t.start()
  }

  private fun readLoop(r: AudioRecord, assembler: FrameAssembler, gen: Int) {
    Process.setThreadPriority(Process.THREAD_PRIORITY_URGENT_AUDIO)
    val buf = ShortArray(READ_CHUNK_SAMPLES)
    while (captureGeneration == gen) {
      val n = r.read(buf, 0, buf.size)
      if (n > 0) {
        if (captureGeneration != gen) break
        assembler.push(buf, 0, n)
      } else if (n < 0) {
        break
      }
    }
  }

  private fun stopCapture() {
    captureGeneration++
    val r = record
    record = null
    if (r != null) {
      try {
        r.stop()
      } catch (_: IllegalStateException) {
      }
    }
    recordThread?.let { joinQuietly(it) }
    recordThread = null
    r?.release()
    effects.releaseAll()
  }

  // ── Focus, route, lifecycle ──────────────────────────────────────────────

  @Synchronized
  internal fun handleFocusChange(change: Int) {
    val kind = FocusPolicy.interruptionFor(change) ?: return
    if (kind == FocusPolicy.BEGAN) {
      // Stop sound and microphone at once; TS ends the session (no auto-resume, plan F9).
      stopPlayback()
      stopCapture()
    }
    listener.onInterruption(kind)
  }

  private fun registerObservers() {
    if (!running) return
    var primed = false
    val cb = object : AudioDeviceCallback() {
      override fun onAudioDevicesAdded(addedDevices: Array<out AudioDeviceInfo>) {
        // The first call after registration lists the devices already connected.
        if (!primed) {
          primed = true
          return
        }
        scheduleRouteChange(RouteReason.DEVICE_ADDED)
      }

      override fun onAudioDevicesRemoved(removedDevices: Array<out AudioDeviceInfo>) {
        scheduleRouteChange(RouteReason.DEVICE_REMOVED)
      }
    }
    audioManager.registerAudioDeviceCallback(cb, mainHandler)
    deviceCallback = cb

    val receiver = object : BroadcastReceiver() {
      override fun onReceive(ctx: Context, intent: Intent) {
        if (isInitialStickyBroadcast) return
        scheduleRouteChange(RouteReason.HEADSET_PLUG)
      }
    }
    ContextCompat.registerReceiver(context, receiver, IntentFilter(Intent.ACTION_HEADSET_PLUG), ContextCompat.RECEIVER_NOT_EXPORTED)
    headsetReceiver = receiver

    val observer = LifecycleEventObserver { _, event ->
      if (event == Lifecycle.Event.ON_STOP && running) listener.onBackground()
    }
    ProcessLifecycleOwner.get().lifecycle.addObserver(observer)
    lifecycleObserver = observer
  }

  private fun unregisterObservers() {
    deviceCallback?.let { audioManager.unregisterAudioDeviceCallback(it) }
    deviceCallback = null
    headsetReceiver?.let {
      try {
        context.unregisterReceiver(it)
      } catch (_: IllegalArgumentException) {
      }
    }
    headsetReceiver = null
    lifecycleObserver?.let { ProcessLifecycleOwner.get().lifecycle.removeObserver(it) }
    lifecycleObserver = null
  }

  private fun scheduleRouteChange(reason: String) {
    pendingRouteReason = reason
    mainHandler.removeCallbacks(routeDebounce)
    mainHandler.postDelayed(routeDebounce, ROUTE_DEBOUNCE_MS)
  }

  @Synchronized
  internal fun handleRouteChange(reason: String) {
    if (!running) return
    applyRoute()
    try {
      // Restart capture so the effects re-attach on the new route.
      stopCapture()
      startCapture()
    } catch (e: RuntimeException) {
      handleFocusChange(FocusPolicy.AUDIOFOCUS_LOSS)
      return
    }
    tracksDirty = true
    // AEC re-converges on the new route: the gate's warm-up applies again.
    playback.restampIfPlaying()
    listener.onRouteChange(reason, currentOutput())
  }

  private fun applyRoute() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      val devices = audioManager.availableCommunicationDevices
      val i = RouteMapper.preferredCommunicationDevice(devices.map { it.type })
      if (i >= 0) audioManager.setCommunicationDevice(devices[i])
    } else {
      val outputs = audioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS).map { it.type }
      @Suppress("DEPRECATION")
      if (RouteMapper.wantsBluetoothSco(outputs)) {
        if (!scoStarted) {
          audioManager.startBluetoothSco()
          audioManager.isBluetoothScoOn = true
          scoStarted = true
        }
        audioManager.isSpeakerphoneOn = false
      } else {
        stopSco()
        audioManager.isSpeakerphoneOn = outputs.none { it in WIRED_TYPES }
      }
    }
  }

  @Suppress("DEPRECATION")
  private fun stopSco() {
    if (!scoStarted) return
    audioManager.isBluetoothScoOn = false
    audioManager.stopBluetoothSco()
    scoStarted = false
  }

  private fun currentOutput(): String {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      return RouteMapper.outputFor(audioManager.communicationDevice?.type)
    }
    @Suppress("DEPRECATION")
    return when {
      scoStarted -> RouteMapper.BLUETOOTH
      audioManager.isSpeakerphoneOn -> RouteMapper.SPEAKER
      audioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS).any { it.type in WIRED_TYPES } -> RouteMapper.WIRED
      else -> RouteMapper.RECEIVER
    }
  }

  private fun restoreRoute() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      audioManager.clearCommunicationDevice()
    } else {
      stopSco()
      @Suppress("DEPRECATION")
      savedSpeakerphone?.let { audioManager.isSpeakerphoneOn = it }
    }
    savedMode?.let { audioManager.mode = it }
    savedMode = null
    savedSpeakerphone = null
  }

  private fun joinQuietly(t: Thread) {
    if (t === Thread.currentThread()) return
    try {
      t.join(JOIN_MS)
    } catch (_: InterruptedException) {
      Thread.currentThread().interrupt()
    }
  }
}
