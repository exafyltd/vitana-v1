// VTID-05181 — rate mode (A) varispeed vs (B) resample: same duration within 1 ms per chunk
// at 1.0×, 1.05× and 1.1×, and the pitch rises with the rate in both (plan Change 9/12/14).
package expo.modules.vitanavoice.core

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertSame
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.sin

class PlaybackRateTest {
  private val rates = listOf(1.0, 1.05, 1.1)
  private val chunkSizes = listOf(1, 160, 480, 960, 1234, 2400, 4800, 24000)

  @Test
  fun defaultModeIsVarispeed() {
    assertEquals(PlaybackRateMode.VARISPEED, PlaybackRateConfig.PLAYBACK_RATE_MODE)
    assertEquals("varispeed", PlaybackRateMode.VARISPEED.wire)
    assertEquals("resample", PlaybackRateMode.RESAMPLE.wire)
  }

  @Test
  fun bothModesGiveTheSameDurationWithinOneMillisecond() {
    for (sr in Pcm.SUPPORTED_OUT_RATES_HZ) for (rate in rates) for (n in chunkSizes) {
      val pcm = ShortArray(n) { (it % 100).toShort() }
      val a = RateProcessor.prepare(pcm, sr, rate, PlaybackRateMode.VARISPEED)
      val b = RateProcessor.prepare(pcm, sr, rate, PlaybackRateMode.RESAMPLE)
      val expected = Pcm.durationMs(n, sr, rate)
      assertEquals("A sr=$sr rate=$rate n=$n", expected, a.durationMs, 1e-9)
      assertTrue("B sr=$sr rate=$rate n=$n: ${b.durationMs} vs $expected", abs(b.durationMs - a.durationMs) <= 1.0)
      assertEquals(1.0, b.speed, 0.0)
      assertEquals(rate, a.speed, 0.0)
    }
  }

  @Test
  fun varispeedWritesThePcmUnchanged() {
    val pcm = ShortArray(100) { it.toShort() }
    assertSame(pcm, RateProcessor.prepare(pcm, 24000, 1.1, PlaybackRateMode.VARISPEED).samples)
  }

  @Test
  fun resampleAtRateOneIsIdentity() {
    val pcm = ShortArray(100) { (it * 7).toShort() }
    assertArrayEquals(pcm, RateProcessor.prepare(pcm, 24000, 1.0, PlaybackRateMode.RESAMPLE).samples)
    assertArrayEquals(pcm, Resampler.resample(pcm, 1.0))
  }

  @Test
  fun resampleRaisesThePitchByTheRate() {
    val sr = 24000
    val f = 440.0
    val pcm = ShortArray(sr) { (12000 * sin(2 * PI * f * it / sr)).toInt().toShort() }
    for (rate in listOf(1.05, 1.1)) {
      val out = Resampler.resample(pcm, rate)
      assertEquals(Resampler.outputLength(pcm.size, rate), out.size)
      val measured = zeroCrossingFrequency(out, sr)
      assertEquals("rate=$rate", f * rate, measured, f * rate * 0.01)
    }
  }

  @Test
  fun resampleNeverOverflows() {
    val pcm = ShortArray(1000) { if (it % 2 == 0) Short.MAX_VALUE else Short.MIN_VALUE }
    val out = Resampler.resample(pcm, 1.1)
    assertTrue(out.isNotEmpty())
  }

  @Test
  fun rateValidation() {
    assertEquals(1.05, PlaybackRateConfig.validate(1.05), 0.0)
    for (bad in listOf(0.0, -1.0, 0.49, 2.01, Double.NaN, Double.POSITIVE_INFINITY)) {
      assertThrows("rate=$bad", IllegalArgumentException::class.java) { PlaybackRateConfig.validate(bad) }
    }
    assertThrows(IllegalArgumentException::class.java) { Resampler.outputLength(10, 0.0) }
  }

  @Test
  fun widgetReferenceRates() {
    assertEquals(1.05, PlaybackRateConfig.PLAYBACK_RATE, 0.0)
    assertEquals(1.1, PlaybackRateConfig.PLAYBACK_RATE_DE, 0.0)
  }

  private fun zeroCrossingFrequency(s: ShortArray, sr: Int): Double {
    var crossings = 0
    for (i in 1 until s.size) if ((s[i - 1] < 0) != (s[i] < 0)) crossings++
    return crossings / 2.0 / (s.size.toDouble() / sr)
  }
}
