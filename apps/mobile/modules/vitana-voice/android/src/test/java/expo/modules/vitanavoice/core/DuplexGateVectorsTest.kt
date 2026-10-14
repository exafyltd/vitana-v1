// VTID-05181 — reads apps/mobile/modules/vitana-voice/fixtures/duplex-gate-vectors.json (written
// from the platform's own gate by scripts/native/orb-parity.mjs, N6a) for its RMS inputs only:
// the gate's decisions live in TypeScript (plan Change 1), the native side must only produce
// the RMS values the gate is fed. For every distinct `rms` in the vectors this builds a frame
// whose float RMS is that value and checks the native RMS reproduces it within one Int16 step.
package expo.modules.vitanavoice.core

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assume.assumeTrue
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
    assumeTrue("duplex-gate-vectors.json not present yet (N6a writes it)", file != null)
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
}
