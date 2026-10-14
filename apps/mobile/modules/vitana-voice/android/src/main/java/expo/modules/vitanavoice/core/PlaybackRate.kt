// VTID-05181 — playback rate modes (plan Change 9 (A)/(B), mirrored on Android in Change 12).
//
// The web widget plays at 1.05×, 1.1× for `de`, through Web Audio `playbackRate`, so the
// pitch rises with the speed (plan F2). Two ways to reproduce that on Android:
//   (A) VARISPEED (default): the PCM is written unchanged and the AudioTrack plays it with
//       PlaybackParams speed = pitch = rate.
//   (B) RESAMPLE (fallback): each chunk is resampled to round(n / rate) samples before it is
//       written, and the track plays at speed 1. Same duration, same pitch rise; the rate
//       change happens before the audio reaches the output, outside the echo-cancellation
//       reference path.
// The device checklist runs the echo bench at 1.0×, 1.05× and 1.1×. If a device class shows
// gate openings at 1.05×/1.1× with a clean 1.0×, PLAYBACK_RATE_MODE switches to RESAMPLE
// (one constant, both modes are implemented and unit-tested — no new code needed).
package expo.modules.vitanavoice.core

import kotlin.math.floor
import kotlin.math.roundToInt

enum class PlaybackRateMode(val wire: String) {
  VARISPEED("varispeed"),
  RESAMPLE("resample"),
}

object PlaybackRateConfig {
  /** The one switch the device checklist flips (plan Change 9/12). */
  @JvmField
  val PLAYBACK_RATE_MODE: PlaybackRateMode = PlaybackRateMode.VARISPEED

  /** Widget `_AUDIO_PLAYBACK_RATE` / `_AUDIO_PLAYBACK_RATE_DE` (orb-widget.js:32-47). Reference values only. */
  const val PLAYBACK_RATE = 1.05
  const val PLAYBACK_RATE_DE = 1.1

  /** Accepted range for setPlaybackRate/start; outside it the call is refused. */
  const val MIN_RATE = 0.5
  const val MAX_RATE = 2.0

  fun validate(rate: Double): Double {
    require(rate.isFinite() && rate >= MIN_RATE && rate <= MAX_RATE) {
      "playbackRate must be within [$MIN_RATE, $MAX_RATE], got $rate"
    }
    return rate
  }
}

/** A chunk ready for the output: the samples to write and the AudioTrack speed (= pitch). */
class PreparedChunk(val samples: ShortArray, val sampleRate: Int, val speed: Double) {
  val durationMs: Double get() = Pcm.durationMs(samples.size, sampleRate, speed)
}

object RateProcessor {
  /** Prepares one decoded chunk for [mode] at [rate]. */
  fun prepare(pcm: ShortArray, sampleRate: Int, rate: Double, mode: PlaybackRateMode): PreparedChunk =
    when (mode) {
      PlaybackRateMode.VARISPEED -> PreparedChunk(pcm, sampleRate, rate)
      PlaybackRateMode.RESAMPLE ->
        if (rate == 1.0) PreparedChunk(pcm, sampleRate, 1.0) else PreparedChunk(Resampler.resample(pcm, rate), sampleRate, 1.0)
    }
}

/**
 * Linear-interpolation resampler by a rate factor: output length round(n / factor), sample i
 * taken at input position i × factor. Played back at the same sample rate, the result is
 * `factor` times shorter and `factor` times higher in pitch, exactly like varispeed.
 */
object Resampler {
  fun outputLength(inputLength: Int, factor: Double): Int {
    require(factor > 0.0 && factor.isFinite()) { "factor must be positive" }
    return (inputLength / factor).roundToInt()
  }

  fun resample(input: ShortArray, factor: Double): ShortArray {
    val outLen = outputLength(input.size, factor)
    if (input.isEmpty() || outLen == 0) return ShortArray(0)
    val out = ShortArray(outLen)
    val last = input.size - 1
    for (i in 0 until outLen) {
      val pos = i * factor
      val i0 = floor(pos).toInt().coerceIn(0, last)
      val i1 = (i0 + 1).coerceAtMost(last)
      val frac = pos - i0
      val v = input[i0] + (input[i1] - input[i0]) * frac
      out[i] = v.roundToInt().coerceIn(Short.MIN_VALUE.toInt(), Short.MAX_VALUE.toInt()).toShort()
    }
    return out
  }
}
