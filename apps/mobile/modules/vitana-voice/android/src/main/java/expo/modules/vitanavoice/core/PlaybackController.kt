// VTID-05181 — playback queue and the `playing` / `startedAt` state machine (plan F2,
// Change 12). Pure Kotlin with an injected clock and scheduler, so the JVM tests drive it
// deterministically; VoiceEngine runs the writer thread that drains it into an AudioTrack.
//
// Semantics mirrored from the web widget (orb-widget.js:2196-2263):
//  - `playing` turns true when the first chunk of a burst is scheduled, and `startedAt` is
//    stamped only on that false→true edge (the duplex gate's AEC warm-up counts from it);
//  - the first burst of a session starts after a 0.3 s lead; later bursts use 0.05 s when the
//    server set `playback_lead_first_only`, otherwise 0.3 s again;
//  - chunks play back to back; `playing` turns false 400 ms after the last chunk ends;
//  - stopPlayback() (barge-in / server `interrupted`) clears the queue synchronously and
//    turns `playing` false at once, with no grace.
package expo.modules.vitanavoice.core

import java.util.concurrent.TimeUnit
import java.util.concurrent.locks.ReentrantLock
import kotlin.concurrent.withLock
import kotlin.math.max

fun interface Clock {
  /** Epoch milliseconds — the same clock stamps capture frames, so the TS gate compares like with like. */
  fun nowMs(): Long
}

fun interface Cancellable {
  fun cancel()
}

fun interface Scheduler {
  fun schedule(delayMs: Long, task: Runnable): Cancellable
}

data class PlaybackState(val playing: Boolean, val startedAt: Double) {
  fun toMap(): Map<String, Any> = mapOf("playing" to playing, "startedAt" to startedAt)
}

/** One queued chunk. [notBeforeMs] > 0 only on the first chunk of a burst (the lead). */
class QueuedChunk(val generation: Long, val chunk: PreparedChunk, val notBeforeMs: Long, val burstStart: Boolean)

class PlaybackController(
  private val clock: Clock,
  private val scheduler: Scheduler,
  private val mode: PlaybackRateMode = PlaybackRateConfig.PLAYBACK_RATE_MODE,
  private val onState: (PlaybackState) -> Unit,
) {
  companion object {
    /** Widget: `audioPlaying` false 400 ms after the last source ends (orb-widget.js:2239-2245). */
    const val AUDIO_END_GRACE_MS = 400L

    /** Widget `_PLAYBACK_LEAD_FIRST_SEC` (mobile) and `_PLAYBACK_LEAD_LATER_SEC` (orb-widget.js:87-88). */
    const val LEAD_FIRST_MS = 300L
    const val LEAD_LATER_MS = 50L

    fun leadMsForBurst(burstIndex: Int, leadFirstOnly: Boolean): Long =
      if (burstIndex == 0 || !leadFirstOnly) LEAD_FIRST_MS else LEAD_LATER_MS
  }

  private val lock = ReentrantLock()
  private val nonEmpty = lock.newCondition()
  private val queue = ArrayDeque<QueuedChunk>()

  @Volatile
  var generation: Long = 0L
    private set

  private var playing = false
  private var startedAt = 0L
  private var burstIndex = 0
  private var playEndsAtMs = 0.0
  private var graceTask: Cancellable? = null
  private var leadFirstOnly = false
  private var rate = PlaybackRateConfig.PLAYBACK_RATE

  val playbackRateMode: PlaybackRateMode get() = mode

  /** Called on start(): a new session starts with the 0.3 s first-burst lead again. */
  fun configure(leadFirstOnly: Boolean, playbackRate: Double) {
    val r = PlaybackRateConfig.validate(playbackRate)
    lock.withLock {
      this.leadFirstOnly = leadFirstOnly
      this.rate = r
      burstIndex = 0
    }
  }

  fun setPlaybackRate(playbackRate: Double) {
    val r = PlaybackRateConfig.validate(playbackRate)
    lock.withLock { rate = r }
  }

  fun currentRate(): Double = lock.withLock { rate }

  /** Queues one decoded chunk; returns what will be written (for tests and logging). */
  fun enqueue(pcm: ShortArray, sampleRate: Int): PreparedChunk {
    require(sampleRate in Pcm.SUPPORTED_OUT_RATES_HZ) {
      "sampleRate must be one of ${Pcm.SUPPORTED_OUT_RATES_HZ}, got $sampleRate"
    }
    var emit: PlaybackState? = null
    val prepared: PreparedChunk
    lock.withLock {
      prepared = RateProcessor.prepare(pcm, sampleRate, rate, mode)
      val now = clock.nowMs()
      val burstStart = !playing
      val notBefore: Long
      val startAt: Double
      if (burstStart) {
        val lead = leadMsForBurst(burstIndex, leadFirstOnly)
        burstIndex++
        notBefore = now + lead
        startAt = notBefore.toDouble()
        playing = true
        startedAt = now
        emit = PlaybackState(true, now.toDouble())
      } else {
        notBefore = 0L
        startAt = max(playEndsAtMs, now.toDouble())
      }
      playEndsAtMs = startAt + prepared.durationMs
      queue.addLast(QueuedChunk(generation, prepared, notBefore, burstStart))
      nonEmpty.signalAll()
      armGraceLocked(now)
    }
    emit?.let(onState)
    return prepared
  }

  /** Writer side: waits up to [timeoutMs] for the next chunk. */
  fun awaitChunk(timeoutMs: Long): QueuedChunk? = lock.withLock {
    if (queue.isEmpty()) nonEmpty.await(timeoutMs, TimeUnit.MILLISECONDS)
    queue.removeFirstOrNull()
  }

  /** Non-blocking variant used by the JVM tests. */
  fun pollChunk(): QueuedChunk? = lock.withLock { queue.removeFirstOrNull() }

  fun isCurrent(chunk: QueuedChunk): Boolean = chunk.generation == generation

  val queuedChunks: Int get() = lock.withLock { queue.size }

  /** Estimated end of the last scheduled chunk (epoch ms), 0 when idle. */
  val estimatedEndMs: Double get() = lock.withLock { playEndsAtMs }

  fun state(): PlaybackState = lock.withLock { PlaybackState(playing, startedAt.toDouble()) }

  /**
   * Barge-in / server `interrupted`: synchronous queue clear, generation bump (the writer drops
   * anything it already took), `playing` false at once. The engine pauses + flushes the track.
   */
  fun stopPlayback() {
    var emit: PlaybackState? = null
    lock.withLock {
      generation++
      queue.clear()
      graceTask?.cancel()
      graceTask = null
      playEndsAtMs = 0.0
      if (playing) {
        playing = false
        emit = PlaybackState(false, startedAt.toDouble())
      }
      nonEmpty.signalAll()
    }
    emit?.let(onState)
  }

  /** Session end: like stopPlayback, and the next session starts with the first-burst lead. */
  fun reset() {
    stopPlayback()
    lock.withLock { burstIndex = 0 }
  }

  /**
   * Route change while playing: AEC re-converges on the new route, so the gate's warm-up must
   * apply again — `startedAt` is re-stamped to now (plan Change 9/12). No-op when idle.
   */
  fun restampIfPlaying(): Boolean {
    var emit: PlaybackState? = null
    lock.withLock {
      if (playing) {
        startedAt = clock.nowMs()
        emit = PlaybackState(true, startedAt.toDouble())
      }
    }
    emit?.let(onState)
    return emit != null
  }

  private fun armGraceLocked(now: Long) {
    graceTask?.cancel()
    val gen = generation
    val delay = max(0L, (playEndsAtMs + AUDIO_END_GRACE_MS - now).toLong())
    graceTask = scheduler.schedule(delay) { onGraceTimer(gen) }
  }

  private fun onGraceTimer(gen: Long) {
    var emit: PlaybackState? = null
    lock.withLock {
      if (gen != generation || !playing) return
      val now = clock.nowMs()
      if (now + 0.5 < playEndsAtMs + AUDIO_END_GRACE_MS) {
        // More audio was queued after this timer was armed; wait for the new end.
        armGraceLocked(now)
        return
      }
      playing = false
      playEndsAtMs = 0.0
      graceTask = null
      emit = PlaybackState(false, startedAt.toDouble())
    }
    emit?.let(onState)
  }
}
