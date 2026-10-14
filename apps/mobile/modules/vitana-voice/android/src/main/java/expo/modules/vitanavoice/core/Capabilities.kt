// VTID-05181 — device capabilities and the full-duplex safety decision (plan Change 12,
// sparring round 1 Q3).
//
// Rule: full duplex is safe only when an AcousticEchoCanceler is actually attached to the
// capture session and enabled. `AcousticEchoCanceler.isAvailable()` false, `create()` null,
// or `setEnabled(true)` failing all mean `aec: false, fullDuplexSafe: false`, and the TS
// client then runs the legacy half-duplex path on this device whatever the server says.
// The VOICE_COMMUNICATION source alone never counts as AEC (some devices process there
// without exposing it); such a device is promoted only by a passing echo bench recorded in
// the device checklist, through FULL_DUPLEX_MODEL_ALLOWLIST — empty in N6.
package expo.modules.vitanavoice.core

/** The effects actually attached to the capture session (or, before start(), only available). */
data class EffectState(val aec: Boolean, val ns: Boolean, val agc: Boolean)

data class Capabilities(
  val aec: Boolean,
  val ns: Boolean,
  val agc: Boolean,
  val voiceProcessing: Boolean,
  val aecPath: String,
  val fullDuplexSafe: Boolean,
  val playbackRateMode: String,
) {
  fun toMap(): Map<String, Any> = mapOf(
    "aec" to aec,
    "ns" to ns,
    "agc" to agc,
    "voiceProcessing" to voiceProcessing,
    "aecPath" to aecPath,
    "fullDuplexSafe" to fullDuplexSafe,
    "playbackRateMode" to playbackRateMode,
  )
}

object CapabilityResolver {
  const val AEC_PATH_ANDROID = "android-aec"
  const val AEC_PATH_NONE = "none"

  /**
   * Device models ("MANUFACTURER/MODEL", lower case) promoted to full duplex without an exposed
   * AcousticEchoCanceler, each only after a passing echo bench recorded in
   * docs/validation/<VTID>/device-checklist.md. Empty in N6.
   */
  val FULL_DUPLEX_MODEL_ALLOWLIST: Set<String> = emptySet()

  fun modelKey(manufacturer: String, model: String): String = "${manufacturer.trim()}/${model.trim()}".lowercase()

  fun resolve(
    effects: EffectState,
    modelKey: String,
    mode: PlaybackRateMode,
    allowlist: Set<String> = FULL_DUPLEX_MODEL_ALLOWLIST,
  ): Capabilities = Capabilities(
    aec = effects.aec,
    ns = effects.ns,
    agc = effects.agc,
    voiceProcessing = effects.aec || effects.ns || effects.agc,
    aecPath = if (effects.aec) AEC_PATH_ANDROID else AEC_PATH_NONE,
    fullDuplexSafe = effects.aec || modelKey.lowercase() in allowlist,
    playbackRateMode = mode.wire,
  )
}

/**
 * Seam over android.media.audiofx so the decision above is tested on the JVM with fakes and
 * under Robolectric with the real classes. [attach] returns null whenever the effect is not
 * available, `create()` returned null, or enabling it failed — all count as "not attached".
 */
interface AudioEffectsProvider {
  fun isAvailable(kind: EffectKind): Boolean

  fun attach(kind: EffectKind, audioSessionId: Int): AttachedEffect?
}

enum class EffectKind { AEC, NS, AGC }

fun interface AttachedEffect {
  fun release()
}

/** Attaches every available effect to [audioSessionId]; failures are recorded, never thrown. */
class EffectChain(private val provider: AudioEffectsProvider) {
  private val attached = LinkedHashMap<EffectKind, AttachedEffect>()

  fun attachAll(audioSessionId: Int): EffectState {
    releaseAll()
    for (kind in EffectKind.values()) {
      val effect = try {
        if (provider.isAvailable(kind)) provider.attach(kind, audioSessionId) else null
      } catch (_: RuntimeException) {
        null
      }
      if (effect != null) attached[kind] = effect
    }
    return state()
  }

  fun state(): EffectState = EffectState(
    aec = EffectKind.AEC in attached,
    ns = EffectKind.NS in attached,
    agc = EffectKind.AGC in attached,
  )

  /** Before start(): what the device says is available (nothing attached yet). */
  fun availability(): EffectState = EffectState(
    aec = safeAvailable(EffectKind.AEC),
    ns = safeAvailable(EffectKind.NS),
    agc = safeAvailable(EffectKind.AGC),
  )

  fun releaseAll() {
    for (e in attached.values) {
      try {
        e.release()
      } catch (_: RuntimeException) {
        // already released by the platform
      }
    }
    attached.clear()
  }

  private fun safeAvailable(kind: EffectKind): Boolean = try {
    provider.isAvailable(kind)
  } catch (_: RuntimeException) {
    false
  }
}
