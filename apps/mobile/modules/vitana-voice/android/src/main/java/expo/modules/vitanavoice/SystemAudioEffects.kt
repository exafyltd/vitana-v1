// VTID-05181 — the real android.media.audiofx effects behind AudioEffectsProvider.
package expo.modules.vitanavoice

import android.media.audiofx.AcousticEchoCanceler
import android.media.audiofx.AudioEffect
import android.media.audiofx.AutomaticGainControl
import android.media.audiofx.NoiseSuppressor
import expo.modules.vitanavoice.core.AttachedEffect
import expo.modules.vitanavoice.core.AudioEffectsProvider
import expo.modules.vitanavoice.core.EffectKind

class SystemAudioEffects : AudioEffectsProvider {
  override fun isAvailable(kind: EffectKind): Boolean = when (kind) {
    EffectKind.AEC -> AcousticEchoCanceler.isAvailable()
    EffectKind.NS -> NoiseSuppressor.isAvailable()
    EffectKind.AGC -> AutomaticGainControl.isAvailable()
  }

  override fun attach(kind: EffectKind, audioSessionId: Int): AttachedEffect? {
    // create() returns null when the effect cannot be created for this session.
    val effect: AudioEffect = when (kind) {
      EffectKind.AEC -> AcousticEchoCanceler.create(audioSessionId)
      EffectKind.NS -> NoiseSuppressor.create(audioSessionId)
      EffectKind.AGC -> AutomaticGainControl.create(audioSessionId)
    } ?: return null
    val ok = try {
      effect.setEnabled(true) == AudioEffect.SUCCESS && effect.enabled
    } catch (_: RuntimeException) {
      false
    }
    if (!ok) {
      effect.release()
      return null
    }
    return AttachedEffect { effect.release() }
  }
}
