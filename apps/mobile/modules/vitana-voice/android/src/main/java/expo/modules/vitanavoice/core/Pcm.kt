// VTID-05181 — ORB native voice, Android (N6c). Pure PCM helpers: no android.* imports,
// so the JVM unit tests run them as they ship.
//
// Capture format mirrors the web ORB widget (plan F1, platform orb-widget.js):
//   16 kHz mono, frames of exactly 1024 samples (64 ms), Int16 little-endian,
//   2048 bytes = 2732 base64 characters per frame.
// Float→Int16 mirrors `_encodeFrame` (orb-widget.js:4345-4352): clamp to [-1, 1],
// `s < 0 ? s * 0x8000 : s * 0x7FFF`, stored into an Int16Array (truncation toward zero).
// RMS is `sqrt(mean(x²))` over the frame on the float signal, the widget's definition.
package expo.modules.vitanavoice.core

import kotlin.math.sqrt

object Pcm {
  /** Gateway AUDIO_IN_RATE_HZ (orb/live/protocol.ts:26-41). The gateway never resamples. */
  const val IN_RATE_HZ = 16000

  /** Gateway AUDIO_OUT_RATE_HZ default; `rate=` in the mime overrides it (16000 for Polly). */
  const val OUT_RATE_DEFAULT_HZ = 24000

  /** Output rates the gateway sends (plan F2). Anything else is refused. */
  val SUPPORTED_OUT_RATES_HZ: Set<Int> = setOf(16000, 24000)

  /** createScriptProcessor(1024, 1, 1) — one frame is 1024 samples = 64 ms at 16 kHz. */
  const val FRAME_SAMPLES = 1024
  const val FRAME_BYTES = FRAME_SAMPLES * 2

  /** base64 length of one 2048-byte frame. */
  const val FRAME_B64_CHARS = ((FRAME_BYTES + 2) / 3) * 4

  /** Widget `_encodeFrame` conversion of one float sample. */
  fun floatToInt16(x: Float): Short {
    val s = if (x.isNaN()) 0f else x.coerceIn(-1f, 1f)
    val v = if (s < 0f) s * 0x8000 else s * 0x7FFF
    // Int16Array stores ToInt16(v): truncation toward zero; v is already in range.
    return v.toInt().toShort()
  }

  /** Inverse of [floatToInt16], used to compute RMS on the float signal. */
  fun int16ToFloat(s: Short): Float = if (s < 0) s / 32768f else s / 32767f

  /** `sqrt(mean(x²))` over [length] samples starting at [offset]. Empty input → 0. */
  fun rms(samples: ShortArray, offset: Int = 0, length: Int = samples.size - offset): Double {
    require(offset >= 0 && length >= 0 && offset + length <= samples.size) { "rms: range out of bounds" }
    if (length == 0) return 0.0
    var sum = 0.0
    for (i in offset until offset + length) {
      val f = int16ToFloat(samples[i]).toDouble()
      sum += f * f
    }
    return sqrt(sum / length)
  }

  /** Int16 → little-endian bytes (the wire byte order). */
  fun toLittleEndianBytes(samples: ShortArray, offset: Int = 0, length: Int = samples.size - offset): ByteArray {
    val out = ByteArray(length * 2)
    for (i in 0 until length) {
      val v = samples[offset + i].toInt()
      out[2 * i] = (v and 0xFF).toByte()
      out[2 * i + 1] = ((v shr 8) and 0xFF).toByte()
    }
    return out
  }

  /** Little-endian bytes → Int16. A trailing odd byte is dropped (never invented). */
  fun fromLittleEndianBytes(bytes: ByteArray): ShortArray {
    val n = bytes.size / 2
    val out = ShortArray(n)
    for (i in 0 until n) {
      val lo = bytes[2 * i].toInt() and 0xFF
      val hi = bytes[2 * i + 1].toInt()
      out[i] = ((hi shl 8) or lo).toShort()
    }
    return out
  }

  /** Duration in milliseconds of [samples] PCM samples at [sampleRate] played at [speed]. */
  fun durationMs(samples: Int, sampleRate: Int, speed: Double = 1.0): Double {
    require(sampleRate > 0 && speed > 0.0) { "durationMs: rate and speed must be positive" }
    return samples * 1000.0 / (sampleRate * speed)
  }
}

/**
 * RFC 4648 base64 (standard alphabet, padded). Written here because
 * `java.util.Base64` needs API 26 (minSdk is 24) and `android.util.Base64`
 * does not exist in JVM unit tests.
 */
object Base64Codec {
  private const val ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
  private val DECODE = IntArray(128) { -1 }.also { t -> ALPHABET.forEachIndexed { i, c -> t[c.code] = i } }

  fun encode(data: ByteArray): String {
    val out = StringBuilder(((data.size + 2) / 3) * 4)
    var i = 0
    while (i + 3 <= data.size) {
      val n = ((data[i].toInt() and 0xFF) shl 16) or ((data[i + 1].toInt() and 0xFF) shl 8) or (data[i + 2].toInt() and 0xFF)
      out.append(ALPHABET[(n shr 18) and 63]).append(ALPHABET[(n shr 12) and 63])
        .append(ALPHABET[(n shr 6) and 63]).append(ALPHABET[n and 63])
      i += 3
    }
    val rest = data.size - i
    if (rest == 1) {
      val n = (data[i].toInt() and 0xFF) shl 16
      out.append(ALPHABET[(n shr 18) and 63]).append(ALPHABET[(n shr 12) and 63]).append("==")
    } else if (rest == 2) {
      val n = ((data[i].toInt() and 0xFF) shl 16) or ((data[i + 1].toInt() and 0xFF) shl 8)
      out.append(ALPHABET[(n shr 18) and 63]).append(ALPHABET[(n shr 12) and 63]).append(ALPHABET[(n shr 6) and 63]).append('=')
    }
    return out.toString()
  }

  /** Decodes standard base64; whitespace is ignored, any other invalid character throws. */
  fun decode(text: String): ByteArray {
    val clean = StringBuilder(text.length)
    for (c in text) if (!c.isWhitespace()) clean.append(c)
    var s = clean.toString()
    require(s.length % 4 == 0) { "base64: length is not a multiple of 4" }
    var pad = 0
    while (s.endsWith("=") && pad < 2) { s = s.substring(0, s.length - 1); pad++ }
    val out = ByteArray(s.length * 3 / 4)
    var acc = 0
    var bits = 0
    var o = 0
    for (c in s) {
      val v = if (c.code < 128) DECODE[c.code] else -1
      require(v >= 0) { "base64: invalid character" }
      acc = (acc shl 6) or v
      bits += 6
      if (bits >= 8) {
        bits -= 8
        out[o++] = ((acc shr bits) and 0xFF).toByte()
      }
    }
    return if (o == out.size) out else out.copyOf(o)
  }
}
