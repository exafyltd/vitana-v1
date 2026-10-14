// VTID-05181 — holds AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE for the length of a voice session
// (plan Change 12). Every focus change while held is forwarded; VoiceEngine maps it through
// FocusPolicy to `onInterruption`.
package expo.modules.vitanavoice

import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.Build
import android.os.Handler

class FocusController(
  private val audioManager: AudioManager,
  private val handler: Handler,
  private val onChange: (Int) -> Unit,
) {
  private val listener = AudioManager.OnAudioFocusChangeListener { change -> if (held) onChange(change) }
  private var request: AudioFocusRequest? = null

  @Volatile
  var held: Boolean = false
    private set

  /** Requests exclusive transient focus. Returns false when the system refuses it (e.g. during a call). */
  fun request(): Boolean {
    if (held) return true
    val result = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val req = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE)
        .setAudioAttributes(VoiceAudioAttributes.communication())
        .setAcceptsDelayedFocusGain(false)
        .setWillPauseWhenDucked(true)
        .setOnAudioFocusChangeListener(listener, handler)
        .build()
      request = req
      audioManager.requestAudioFocus(req)
    } else {
      @Suppress("DEPRECATION")
      audioManager.requestAudioFocus(listener, AudioManager.STREAM_VOICE_CALL, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE)
    }
    held = result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
    return held
  }

  fun abandon() {
    if (!held) return
    held = false
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      request?.let { audioManager.abandonAudioFocusRequest(it) }
      request = null
    } else {
      @Suppress("DEPRECATION")
      audioManager.abandonAudioFocus(listener)
    }
  }
}

internal object VoiceAudioAttributes {
  fun communication(): AudioAttributes = AudioAttributes.Builder()
    .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
    .build()
}
