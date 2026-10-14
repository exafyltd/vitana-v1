// VTID-05181 — exact 1024-sample / 2048-byte frames from any AudioRecord.read() size
// (plan Change 14, mirrors the iOS cases in Change 10).
package expo.modules.vitanavoice.core

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotSame
import org.junit.Test

class FrameAssemblerTest {
  private fun ramp(n: Int, start: Int = 0) = ShortArray(n) { ((start + it) % 30000).toShort() }

  private fun feed(total: Int, readSize: Int): Pair<List<ShortArray>, FrameAssembler> {
    val frames = ArrayList<ShortArray>()
    val asm = FrameAssembler { frames.add(it) }
    val all = ramp(total)
    var i = 0
    while (i < total) {
      val n = minOf(readSize, total - i)
      // Read into a scratch buffer bigger than the read, like AudioRecord.read(buf, 0, buf.size).
      val scratch = ShortArray(n + 7)
      System.arraycopy(all, i, scratch, 3, n)
      asm.push(scratch, 3, n)
      i += n
    }
    return frames to asm
  }

  @Test
  fun oddReadSizesYieldExactFramesInOrder() {
    for (readSize in listOf(1, 441, 480, 512, 1023, 1024, 1025, 3000, 4096)) {
      val total = 10 * Pcm.FRAME_SAMPLES + 333
      val (frames, asm) = feed(total, readSize)
      assertEquals("readSize=$readSize", 10, frames.size)
      frames.forEachIndexed { k, f ->
        assertEquals(Pcm.FRAME_SAMPLES, f.size)
        assertArrayEquals("readSize=$readSize frame=$k", ramp(Pcm.FRAME_SAMPLES, k * Pcm.FRAME_SAMPLES), f)
      }
      assertEquals(333, asm.pending)
    }
  }

  @Test
  fun framesAreCopiesNotTheInternalBuffer() {
    val frames = ArrayList<ShortArray>()
    val asm = FrameAssembler { frames.add(it) }
    asm.push(ramp(2 * Pcm.FRAME_SAMPLES))
    assertEquals(2, frames.size)
    assertNotSame(frames[0], frames[1])
    assertEquals(0.toShort(), frames[0][0])
  }

  @Test
  fun resetDropsAPartialFrameAndNeverPadsIt() {
    val frames = ArrayList<ShortArray>()
    val asm = FrameAssembler { frames.add(it) }
    asm.push(ramp(1000))
    asm.reset()
    assertEquals(0, asm.pending)
    asm.push(ramp(Pcm.FRAME_SAMPLES, 5))
    assertEquals(1, frames.size)
    assertArrayEquals(ramp(Pcm.FRAME_SAMPLES, 5), frames[0])
  }

  @Test
  fun encodedFrameIs2048BytesLittleEndianWithItsRms() {
    val pcm = ShortArray(Pcm.FRAME_SAMPLES) { if (it % 2 == 0) 1000 else -1000 }
    val f = FrameAssembler.encode(pcm, 1234.5)
    val bytes = Base64Codec.decode(f.b64)
    assertEquals(Pcm.FRAME_BYTES, bytes.size)
    assertArrayEquals(pcm, Pcm.fromLittleEndianBytes(bytes))
    assertEquals(Pcm.rms(pcm), f.rms, 0.0)
    assertEquals(1234.5, f.ts, 0.0)
    assertEquals(setOf("b64", "rms", "ts"), f.toMap().keys)
  }
}
