// VTID-05181 — assembles exact 1024-sample capture frames from whatever buffer
// sizes AudioRecord.read() returns, and encodes each as the wire frame
// {b64, rms, ts} (plan Change 12, Interfaces `VoiceFrame`). Pure Kotlin.
package expo.modules.vitanavoice.core

/** One capture frame as sent to JS: Int16 LE mono base64, float RMS, capture time (epoch ms). */
data class EncodedFrame(val b64: String, val rms: Double, val ts: Double) {
  fun toMap(): Map<String, Any> = mapOf("b64" to b64, "rms" to rms, "ts" to ts)
}

class FrameAssembler(
  private val frameSamples: Int = Pcm.FRAME_SAMPLES,
  private val onFrame: (ShortArray) -> Unit,
) {
  init {
    require(frameSamples > 0) { "frameSamples must be positive" }
  }

  private val buf = ShortArray(frameSamples)
  private var fill = 0

  /** Samples held back waiting for the next frame boundary. */
  val pending: Int get() = fill

  /** Pushes [length] samples from [src]; emits one copy per completed frame, in order. */
  fun push(src: ShortArray, offset: Int = 0, length: Int = src.size - offset) {
    require(offset >= 0 && length >= 0 && offset + length <= src.size) { "push: range out of bounds" }
    var i = offset
    val end = offset + length
    while (i < end) {
      val n = minOf(frameSamples - fill, end - i)
      System.arraycopy(src, i, buf, fill, n)
      fill += n
      i += n
      if (fill == frameSamples) {
        onFrame(buf.copyOf())
        fill = 0
      }
    }
  }

  /** Drops a partial frame (capture restart). A partial frame is never padded or sent. */
  fun reset() {
    fill = 0
  }

  companion object {
    /** Encodes one complete frame. [ts] is the capture time in epoch milliseconds. */
    fun encode(frame: ShortArray, ts: Double): EncodedFrame =
      EncodedFrame(Base64Codec.encode(Pcm.toLittleEndianBytes(frame)), Pcm.rms(frame), ts)
  }
}
