// VTID-05181 — reads apps/mobile/modules/vitana-voice/fixtures/duplex-gate-vectors.json (written
// from the platform's own gate by scripts/native/orb-parity.mjs, N6a) for its RMS inputs only:
// the gate's decisions live in TypeScript (plan Change 1), the native side must only produce
// the RMS values the gate is fed. For every distinct `rms` in the vectors this builds a frame
// whose float RMS is that value and checks the native RMS reproduces it within one Int16 step.
//
// VTID-05182 (N6d): N6a has committed the file, so it is now required (no skip), and the
// `signals` block — known 1024-sample sine frames with their platform-computed RMS — is
// regenerated here and checked end to end through the widget's Int16 conversion.
package expo.modules.vitanavoice.core

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assert.assertNotNull
import org.junit.Test
import java.io.File
import kotlin.math.abs

class DuplexGateVectorsTest {
  private fun vectorsFile(): File? {
    val candidates = listOfNotNull(
      System.getProperty("vitana.duplexGateVectors"),
      "../fixtures/duplex-gate-vectors.json",
      "modules/vitana-voice/fixtures/duplex-gate-vectors.json",
    )
    return candidates.map(::File).firstOrNull { it.isFile }
  }

  /** Every number under a JSON key named "rms" (any nesting; the gate vectors use plain numbers). */
  private fun rmsValues(json: String): List<Double> =
    Regex("\"rms\"\\s*:\\s*(-?\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?)").findAll(json)
      .map { it.groupValues[1].toDouble() }.toList()

  @Test
  fun nativeRmsReproducesTheGateVectorInputs() {
    val file = vectorsFile()
    // The vectors file is generated and committed by N6a's orb-parity job (plan Change 6b).
    assertNotNull("duplex-gate-vectors.json is missing (scripts/native/orb-parity.mjs --write-vectors)", file)
    val values = rmsValues(file!!.readText()).filter { it in 0.0..1.0 }.distinct()
    assertTrue("duplex-gate-vectors.json has no \"rms\" inputs — the fixture format changed", values.isNotEmpty())
    for (target in values) {
      // Alternating ±a has RMS a; quantising a to Int16 moves it by at most one step.
      val pos = Pcm.floatToInt16(target.toFloat())
      val neg = Pcm.floatToInt16((-target).toFloat())
      val frame = ShortArray(Pcm.FRAME_SAMPLES) { if (it % 2 == 0) pos else neg }
      val rms = Pcm.rms(frame)
      assertTrue("rms=$target got $rms", abs(rms - target) <= 1.0 / 32767 + 1e-9)
      // And the encoded wire frame carries that same value.
      assertEquals(rms, FrameAssembler.encode(frame, 0.0).rms, 0.0)
    }
  }

  /** `signals`: { kind, amplitude, freqHz, sampleRate, samples, rms } objects (flat, one per line group). */
  private data class Signal(val amplitude: Double, val freqHz: Double, val sampleRate: Int, val samples: Int, val rms: Double)

  private fun signals(json: String): List<Signal> {
    val block = Regex("\"signals\"\\s*:\\s*\\[(.*?)\\]", RegexOption.DOT_MATCHES_ALL).find(json)?.groupValues?.get(1) ?: return emptyList()
    return Regex("\\{(.*?)\\}", RegexOption.DOT_MATCHES_ALL).findAll(block).map { m ->
      val obj = m.groupValues[1]
      fun num(key: String) = Regex("\"$key\"\\s*:\\s*(-?\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?)").find(obj)!!.groupValues[1].toDouble()
      Signal(num("amplitude"), num("freqHz"), num("sampleRate").toInt(), num("samples").toInt(), num("rms"))
    }.toList()
  }

  @Test
  fun capturedSineFramesCarryThePlatformRms() {
    val file = vectorsFile()
    assertNotNull("duplex-gate-vectors.json is missing (scripts/native/orb-parity.mjs --write-vectors)", file)
    val list = signals(file!!.readText())
    assertTrue("duplex-gate-vectors.json has no `signals` — the fixture format changed", list.isNotEmpty())
    for (s in list) {
      assertEquals(Pcm.FRAME_SAMPLES, s.samples)
      // Same signal as orb-parity.mjs: amplitude * sin(2π f k / 16000), k = 0 … 1023.
      val frame = ShortArray(s.samples) { k ->
        Pcm.floatToInt16((s.amplitude * Math.sin(2 * Math.PI * s.freqHz * k / s.sampleRate)).toFloat())
      }
      val rms = FrameAssembler.encode(frame, 0.0).rms
      // Int16 truncation moves each sample by less than one step, so the RMS by less than one step.
      assertTrue("${s.amplitude} @ ${s.freqHz} Hz: rms=${s.rms} got $rms", abs(rms - s.rms) <= 1.0 / 32767 + 1e-9)
    }
  }
}
