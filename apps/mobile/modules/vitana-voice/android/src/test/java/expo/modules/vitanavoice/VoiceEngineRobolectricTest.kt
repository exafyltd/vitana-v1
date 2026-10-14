// VTID-05181 — Robolectric tests with the real android.media classes (plan Change 14):
//  - audio-focus loss → `onInterruption {kind:'began'}` (and playback stopped);
//  - AcousticEchoCanceler unavailable / create() null → getCapabilities() {aec:false, fullDuplexSafe:false};
//  - the platform constants the pure core copies are the android.media values.
package expo.modules.vitanavoice

import android.Manifest
import android.app.Application
import android.content.Context
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.os.Looper
import androidx.test.core.app.ApplicationProvider
import expo.modules.vitanavoice.core.AttachedEffect
import expo.modules.vitanavoice.core.AudioEffectsProvider
import expo.modules.vitanavoice.core.EffectKind
import expo.modules.vitanavoice.core.EncodedFrame
import expo.modules.vitanavoice.core.FocusPolicy
import expo.modules.vitanavoice.core.PlaybackState
import expo.modules.vitanavoice.core.RouteMapper
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config

private class RecordingListener : VoiceEngine.Listener {
  val interruptions = ArrayList<String>()
  val states = ArrayList<PlaybackState>()
  val routes = ArrayList<Pair<String, String>>()
  var backgrounds = 0

  override fun onFrame(frame: EncodedFrame) {}

  override fun onPlaybackState(state: PlaybackState) {
    states.add(state)
  }

  override fun onInterruption(kind: String) {
    interruptions.add(kind)
  }

  override fun onRouteChange(reason: String, output: String) {
    routes.add(reason to output)
  }

  override fun onBackground() {
    backgrounds++
  }
}

/** Effects that report available but whose create() returns null (plan Q3). */
private class AvailableButUncreatable : AudioEffectsProvider {
  override fun isAvailable(kind: EffectKind) = true

  override fun attach(kind: EffectKind, audioSessionId: Int): AttachedEffect? = null
}

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class VoiceEngineRobolectricTest {
  private val context: Context = ApplicationProvider.getApplicationContext()
  private val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager

  @Test
  fun focusLossIsAnInterruption() {
    val l = RecordingListener()
    val engine = VoiceEngine(context, l)
    assertTrue(engine.focus.request())
    val request = shadowOf(audioManager).lastAudioFocusRequest
    assertEquals(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE, request.durationHint)

    request.listener.onAudioFocusChange(AudioManager.AUDIOFOCUS_LOSS_TRANSIENT)
    request.listener.onAudioFocusChange(AudioManager.AUDIOFOCUS_GAIN)
    request.listener.onAudioFocusChange(AudioManager.AUDIOFOCUS_LOSS)
    shadowOf(Looper.getMainLooper()).idle()
    assertEquals(listOf("began", "ended", "began"), l.interruptions)
    assertFalse(engine.playback.state().playing)

    engine.focus.abandon()
    request.listener.onAudioFocusChange(AudioManager.AUDIOFOCUS_LOSS)
    assertEquals("no events once focus is abandoned", 3, l.interruptions.size)
  }

  @Test
  fun aecUnavailableOnTheDeviceMeansHalfDuplex() {
    // Robolectric registers no audio effects, so AcousticEchoCanceler.isAvailable() is false.
    val caps = VoiceEngine(context, RecordingListener()).capabilities()
    assertFalse(caps.aec)
    assertFalse(caps.fullDuplexSafe)
    assertEquals("none", caps.aecPath)
    assertEquals(false, caps.toMap()["fullDuplexSafe"])
  }

  @Test
  fun aecCreateReturningNullMeansHalfDuplexOnceStarted() {
    shadowOf(context as Application).grantPermissions(Manifest.permission.RECORD_AUDIO)
    val engine = VoiceEngine(context, RecordingListener(), effectsProvider = AvailableButUncreatable())
    engine.start(leadFirstOnly = true, playbackRate = 1.05)
    try {
      val caps = engine.capabilities()
      assertFalse(caps.aec)
      assertFalse(caps.ns)
      assertFalse(caps.agc)
      assertFalse(caps.fullDuplexSafe)
      assertEquals("none", caps.aecPath)
      assertEquals(AudioManager.MODE_IN_COMMUNICATION, audioManager.mode)
    } finally {
      engine.stop()
    }
    assertFalse(engine.running)
    assertEquals(AudioManager.MODE_NORMAL, audioManager.mode)
  }

  @Test
  fun startRefusesWithoutMicrophonePermission() {
    shadowOf(context as Application).denyPermissions(Manifest.permission.RECORD_AUDIO)
    val engine = VoiceEngine(context, RecordingListener())
    val e = runCatching { engine.start(leadFirstOnly = false, playbackRate = 1.05) }.exceptionOrNull()
    assertTrue(e is VoiceEngineException)
    assertFalse(engine.running)
    assertFalse(engine.focus.held)
  }

  @Test
  fun copiedConstantsMatchAndroidMedia() {
    assertEquals(AudioManager.AUDIOFOCUS_GAIN, FocusPolicy.AUDIOFOCUS_GAIN)
    assertEquals(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT, FocusPolicy.AUDIOFOCUS_GAIN_TRANSIENT)
    assertEquals(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE, FocusPolicy.AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE)
    assertEquals(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK, FocusPolicy.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
    assertEquals(AudioManager.AUDIOFOCUS_LOSS, FocusPolicy.AUDIOFOCUS_LOSS)
    assertEquals(AudioManager.AUDIOFOCUS_LOSS_TRANSIENT, FocusPolicy.AUDIOFOCUS_LOSS_TRANSIENT)
    assertEquals(AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK, FocusPolicy.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK)

    assertEquals(AudioDeviceInfo.TYPE_BUILTIN_EARPIECE, RouteMapper.TYPE_BUILTIN_EARPIECE)
    assertEquals(AudioDeviceInfo.TYPE_BUILTIN_SPEAKER, RouteMapper.TYPE_BUILTIN_SPEAKER)
    assertEquals(AudioDeviceInfo.TYPE_WIRED_HEADSET, RouteMapper.TYPE_WIRED_HEADSET)
    assertEquals(AudioDeviceInfo.TYPE_WIRED_HEADPHONES, RouteMapper.TYPE_WIRED_HEADPHONES)
    assertEquals(AudioDeviceInfo.TYPE_BLUETOOTH_SCO, RouteMapper.TYPE_BLUETOOTH_SCO)
    assertEquals(AudioDeviceInfo.TYPE_BLUETOOTH_A2DP, RouteMapper.TYPE_BLUETOOTH_A2DP)
    assertEquals(AudioDeviceInfo.TYPE_USB_DEVICE, RouteMapper.TYPE_USB_DEVICE)
    assertEquals(AudioDeviceInfo.TYPE_USB_HEADSET, RouteMapper.TYPE_USB_HEADSET)
    assertEquals(AudioDeviceInfo.TYPE_HEARING_AID, RouteMapper.TYPE_HEARING_AID)
    assertEquals(AudioDeviceInfo.TYPE_BLE_HEADSET, RouteMapper.TYPE_BLE_HEADSET)
    assertEquals(AudioDeviceInfo.TYPE_BLE_SPEAKER, RouteMapper.TYPE_BLE_SPEAKER)
  }
}
