// VTID-05181 — no attached AcousticEchoCanceler ⇒ {aec:false, fullDuplexSafe:false}, so the TS
// client runs half duplex on that device (plan Change 12, sparring round 1 Q3).
package expo.modules.vitanavoice.core

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class FakeEffects(
  private val available: Set<EffectKind> = EffectKind.values().toSet(),
  private val creatable: Set<EffectKind> = EffectKind.values().toSet(),
  private val throwing: Set<EffectKind> = emptySet(),
) : AudioEffectsProvider {
  val attachCalls = ArrayList<Pair<EffectKind, Int>>()
  var released = 0

  override fun isAvailable(kind: EffectKind): Boolean = kind in available

  override fun attach(kind: EffectKind, audioSessionId: Int): AttachedEffect? {
    attachCalls.add(kind to audioSessionId)
    if (kind in throwing) throw IllegalStateException("enable failed")
    return if (kind in creatable) AttachedEffect { released++ } else null
  }
}

class CapabilitiesTest {
  private fun caps(effects: EffectState, model: String = "acme/phone", allow: Set<String> = emptySet()) =
    CapabilityResolver.resolve(effects, model, PlaybackRateMode.VARISPEED, allow)

  @Test
  fun aecAttachedIsFullDuplexSafe() {
    val c = caps(EffectState(aec = true, ns = true, agc = false))
    assertTrue(c.aec)
    assertTrue(c.fullDuplexSafe)
    assertEquals("android-aec", c.aecPath)
    assertTrue(c.voiceProcessing)
    assertEquals("varispeed", c.playbackRateMode)
  }

  @Test
  fun noAecIsHalfDuplexWhateverElseIsAttached() {
    val c = caps(EffectState(aec = false, ns = true, agc = true))
    assertFalse(c.aec)
    assertFalse(c.fullDuplexSafe)
    assertEquals("none", c.aecPath)
  }

  @Test
  fun allowlistIsEmptyInN6AndPromotesOnlyListedModels() {
    assertTrue(CapabilityResolver.FULL_DUPLEX_MODEL_ALLOWLIST.isEmpty())
    val key = CapabilityResolver.modelKey(" Acme ", "Phone 9")
    assertEquals("acme/phone 9", key)
    assertFalse(caps(EffectState(false, false, false), key).fullDuplexSafe)
    val promoted = caps(EffectState(false, false, false), key, setOf("acme/phone 9"))
    assertTrue(promoted.fullDuplexSafe)
    assertFalse(promoted.aec)
    assertEquals("none", promoted.aecPath)
  }

  @Test
  fun mapHasExactlyTheInterfaceKeys() {
    assertEquals(
      setOf("aec", "ns", "agc", "voiceProcessing", "aecPath", "fullDuplexSafe", "playbackRateMode"),
      caps(EffectState(true, true, true)).toMap().keys,
    )
  }

  @Test
  fun createReturningNullMeansNoAec() {
    val fx = FakeEffects(creatable = setOf(EffectKind.NS, EffectKind.AGC))
    val state = EffectChain(fx).attachAll(42)
    assertEquals(EffectState(aec = false, ns = true, agc = true), state)
    assertFalse(caps(state).fullDuplexSafe)
    assertTrue(fx.attachCalls.all { it.second == 42 })
  }

  @Test
  fun enableFailingMeansNoAec() {
    val fx = FakeEffects(throwing = setOf(EffectKind.AEC))
    val state = EffectChain(fx).attachAll(7)
    assertFalse(state.aec)
    assertFalse(caps(state).fullDuplexSafe)
  }

  @Test
  fun unavailableEffectsAreNeverCreated() {
    val fx = FakeEffects(available = setOf(EffectKind.NS))
    val chain = EffectChain(fx)
    val state = chain.attachAll(1)
    assertEquals(listOf(EffectKind.NS to 1), fx.attachCalls)
    assertEquals(EffectState(aec = false, ns = true, agc = false), state)
    assertEquals(EffectState(aec = false, ns = true, agc = false), chain.availability())
  }

  @Test
  fun releaseAllReleasesEveryAttachedEffect() {
    val fx = FakeEffects()
    val chain = EffectChain(fx)
    chain.attachAll(1)
    chain.attachAll(2) // re-attach on a new capture session releases the old ones first
    assertEquals(3, fx.released)
    chain.releaseAll()
    assertEquals(6, fx.released)
    assertEquals(EffectState(false, false, false), chain.state())
  }
}
