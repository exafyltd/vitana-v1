// VTID-05181 — PCM conversion, byte order, RMS and base64 (plan Change 14).
package expo.modules.vitanavoice.core

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test
import kotlin.math.PI
import kotlin.math.sin
import kotlin.math.sqrt
import kotlin.random.Random

class PcmTest {
  @Test
  fun floatToInt16MirrorsTheWidgetEncoder() {
    // s < 0 ? s * 0x8000 : s * 0x7FFF, then Int16Array truncation toward zero.
    assertEquals(32767.toShort(), Pcm.floatToInt16(1f))
    assertEquals((-32768).toShort(), Pcm.floatToInt16(-1f))
    assertEquals(16383.toShort(), Pcm.floatToInt16(0.5f))
    assertEquals((-16384).toShort(), Pcm.floatToInt16(-0.5f))
    assertEquals(0.toShort(), Pcm.floatToInt16(0f))
    assertEquals(0.toShort(), Pcm.floatToInt16(-0f))
  }

  @Test
  fun floatToInt16Clamps() {
    assertEquals(32767.toShort(), Pcm.floatToInt16(2.5f))
    assertEquals((-32768).toShort(), Pcm.floatToInt16(-7f))
    assertEquals(0.toShort(), Pcm.floatToInt16(Float.NaN))
    assertEquals(32767.toShort(), Pcm.floatToInt16(Float.POSITIVE_INFINITY))
  }

  @Test
  fun littleEndianByteOrder() {
    val bytes = Pcm.toLittleEndianBytes(shortArrayOf(0x1234, -2, Short.MIN_VALUE, Short.MAX_VALUE))
    assertArrayEquals(
      byteArrayOf(0x34, 0x12, 0xFE.toByte(), 0xFF.toByte(), 0x00, 0x80.toByte(), 0xFF.toByte(), 0x7F),
      bytes,
    )
    assertArrayEquals(shortArrayOf(0x1234, -2, Short.MIN_VALUE, Short.MAX_VALUE), Pcm.fromLittleEndianBytes(bytes))
  }

  @Test
  fun oddTrailingByteIsDropped() {
    assertArrayEquals(shortArrayOf(1), Pcm.fromLittleEndianBytes(byteArrayOf(1, 0, 9)))
  }

  @Test
  fun silenceEncodesToAllZeroBytes() {
    val frame = FrameAssembler.encode(ShortArray(Pcm.FRAME_SAMPLES), 0.0)
    val bytes = Base64Codec.decode(frame.b64)
    assertEquals(Pcm.FRAME_BYTES, bytes.size)
    assertEquals(0, bytes.count { it != 0.toByte() })
    assertEquals(2732, frame.b64.length)
    assertEquals(Pcm.FRAME_B64_CHARS, frame.b64.length)
    assertEquals(0.0, frame.rms, 0.0)
  }

  @Test
  fun rmsOfKnownSignals() {
    // Constant positive sample s: float s/32767, RMS equals it exactly.
    val dc = ShortArray(Pcm.FRAME_SAMPLES) { 16384 }
    assertEquals(16384.0 / 32767.0, Pcm.rms(dc), 1e-6)
    // Full-scale square wave: +32767 / -32768 → floats +1 / -1 → RMS 1.
    val square = ShortArray(Pcm.FRAME_SAMPLES) { if (it % 2 == 0) Short.MAX_VALUE else Short.MIN_VALUE }
    assertEquals(1.0, Pcm.rms(square), 1e-6)
    // Half-scale alternating ±0.25.
    val alt = ShortArray(Pcm.FRAME_SAMPLES) { if (it % 2 == 0) Pcm.floatToInt16(0.25f) else Pcm.floatToInt16(-0.25f) }
    val expected = sqrt((Pcm.int16ToFloat(alt[0]).toDouble().let { it * it } + Pcm.int16ToFloat(alt[1]).toDouble().let { it * it }) / 2)
    assertEquals(expected, Pcm.rms(alt), 1e-6)
    assertEquals(0.25, Pcm.rms(alt), 1e-4)
  }

  @Test
  fun rmsOfASineIsAmplitudeOverRootTwo() {
    // 1000 Hz at 16 kHz: 16 samples per period, 64 whole periods in a frame.
    val a = 0.5
    val s = ShortArray(Pcm.FRAME_SAMPLES) { Pcm.floatToInt16((a * sin(2 * PI * 1000 * it / 16000.0)).toFloat()) }
    // Quantisation to Int16 bounds the error well below 1e-4.
    assertEquals(a / sqrt(2.0), Pcm.rms(s), 1e-4)
  }

  @Test
  fun rmsIsOverTheRequestedRangeOnly() {
    val s = ShortArray(10) { if (it < 5) 0 else Short.MAX_VALUE }
    assertEquals(0.0, Pcm.rms(s, 0, 5), 0.0)
    assertEquals(1.0, Pcm.rms(s, 5, 5), 1e-9)
    assertEquals(0.0, Pcm.rms(ShortArray(0)), 0.0)
    assertThrows(IllegalArgumentException::class.java) { Pcm.rms(s, 8, 5) }
  }

  @Test
  fun base64MatchesTheJdkEncoder() {
    val rnd = Random(5181)
    val jdk = java.util.Base64.getEncoder()
    for (len in (0..64) + listOf(1023, 1024, 2047, 2048, 4096)) {
      val data = ByteArray(len).also { rnd.nextBytes(it) }
      val ours = Base64Codec.encode(data)
      assertEquals("len=$len", jdk.encodeToString(data), ours)
      assertArrayEquals("len=$len", data, Base64Codec.decode(ours))
    }
  }

  @Test
  fun base64DecodeRejectsGarbage() {
    assertThrows(IllegalArgumentException::class.java) { Base64Codec.decode("abc") }
    assertThrows(IllegalArgumentException::class.java) { Base64Codec.decode("ab!d") }
    assertArrayEquals(byteArrayOf(1, 2, 3), Base64Codec.decode("AQ\nID"))
  }

  @Test
  fun durationsAtTheOutputRates() {
    assertEquals(1000.0, Pcm.durationMs(24000, 24000), 1e-9)
    assertEquals(1000.0, Pcm.durationMs(16000, 16000), 1e-9)
    assertEquals(1000.0 / 1.05, Pcm.durationMs(24000, 24000, 1.05), 1e-9)
    assertEquals(1000.0 / 1.1, Pcm.durationMs(16000, 16000, 1.1), 1e-9)
    assertEquals(64.0, Pcm.durationMs(Pcm.FRAME_SAMPLES, Pcm.IN_RATE_HZ), 1e-9)
  }
}
