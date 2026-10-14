// VTID-05181 — playback state machine: `startedAt` stamped on false→true only, first-burst
// lead, 400 ms grace after the queue drains, synchronous stopPlayback, route re-stamp, and
// 16 kHz vs 24 kHz chunk durations at 1.05× / 1.1× (plan F2, Change 12/14).
package expo.modules.vitanavoice.core

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test

class FakeTime : Clock, Scheduler {
  var now = 1_000_000L
  private class Task(val at: Long, val run: Runnable, var cancelled: Boolean = false)
  private val tasks = ArrayList<Task>()

  override fun nowMs(): Long = now

  override fun schedule(delayMs: Long, task: Runnable): Cancellable {
    val t = Task(now + delayMs, task)
    tasks.add(t)
    return Cancellable { t.cancelled = true }
  }

  /** Advances time, running due tasks in time order. */
  fun advance(ms: Long) {
    val end = now + ms
    while (true) {
      val next = tasks.filter { !it.cancelled && it.at <= end }.minByOrNull { it.at } ?: break
      tasks.remove(next)
      now = maxOf(now, next.at)
      next.run.run()
    }
    now = end
  }
}

class PlaybackControllerTest {
  private val time = FakeTime()
  private val states = ArrayList<PlaybackState>()

  private fun controller(mode: PlaybackRateMode = PlaybackRateMode.VARISPEED) =
    PlaybackController(time, time, mode) { states.add(it) }.also { it.configure(leadFirstOnly = true, playbackRate = 1.0) }

  /** [ms] milliseconds of PCM at [sr]. */
  private fun pcm(ms: Int, sr: Int = 24000) = ShortArray(sr * ms / 1000) { 100 }

  @Test
  fun startedAtIsStampedOnTheFalseToTrueEdgeOnly() {
    val c = controller()
    val t0 = time.now
    c.enqueue(pcm(100), 24000)
    time.advance(30)
    c.enqueue(pcm(100), 24000)
    c.enqueue(pcm(100), 24000)
    assertEquals(listOf(PlaybackState(true, t0.toDouble())), states)
    assertEquals(PlaybackState(true, t0.toDouble()), c.state())
  }

  @Test
  fun firstBurstLeadIs300msLaterBurstsUse50msWhenLeadFirstOnly() {
    val c = controller()
    val t0 = time.now
    c.enqueue(pcm(100), 24000)
    val first = c.pollChunk()!!
    assertTrue(first.burstStart)
    assertEquals(t0 + 300, first.notBeforeMs)
    c.enqueue(pcm(100), 24000)
    val second = c.pollChunk()!!
    assertFalse(second.burstStart)
    assertEquals(0L, second.notBeforeMs)
    // Ends at t0 + 300 + 200; playing false 400 ms later.
    time.advance(300 + 200 + 400)
    assertFalse(c.state().playing)
    val t1 = time.now
    c.enqueue(pcm(100), 24000)
    assertEquals(t1 + 50, c.pollChunk()!!.notBeforeMs)
  }

  @Test
  fun everyBurstUses300msWithoutLeadFirstOnly() {
    val c = PlaybackController(time, time, PlaybackRateMode.VARISPEED) { states.add(it) }
    c.configure(leadFirstOnly = false, playbackRate = 1.0)
    c.enqueue(pcm(100), 24000)
    c.pollChunk()
    time.advance(2000)
    val t1 = time.now
    c.enqueue(pcm(100), 24000)
    assertEquals(t1 + 300, c.pollChunk()!!.notBeforeMs)
  }

  @Test
  fun playingTurnsFalse400msAfterTheLastChunkEnds() {
    val c = controller()
    c.enqueue(pcm(100), 24000) // plays 300..400 ms from now
    c.enqueue(pcm(100), 24000) // 400..500
    time.advance(500 + 399)
    assertTrue(c.state().playing)
    time.advance(1)
    assertFalse(c.state().playing)
    assertEquals(2, states.size)
    assertFalse(states.last().playing)
  }

  @Test
  fun aChunkArrivingInsideTheGraceExtendsTheBurst() {
    val c = controller()
    c.enqueue(pcm(100), 24000) // ends at +400
    time.advance(600) // inside the 400 ms grace
    c.enqueue(pcm(100), 24000) // starts now (underrun), ends at +700
    time.advance(499)
    assertTrue(c.state().playing)
    time.advance(1)
    assertFalse(c.state().playing)
    assertEquals(1, states.count { it.playing })
  }

  @Test
  fun durationsAt16kAnd24kWithTheRate() {
    for (mode in PlaybackRateMode.values()) for (rate in listOf(1.05, 1.1)) {
      val c = PlaybackController(time, time, mode) {}
      c.configure(leadFirstOnly = true, playbackRate = rate)
      val t0 = time.now
      val a = c.enqueue(ShortArray(24000), 24000)
      val b = c.enqueue(ShortArray(16000), 16000)
      val expected = 1000.0 / rate
      assertEquals("$mode $rate 24k", expected, a.durationMs, 1.0)
      assertEquals("$mode $rate 16k", expected, b.durationMs, 1.0)
      assertEquals(t0 + 300 + 2 * expected, c.estimatedEndMs, 2.0)
      c.reset()
    }
  }

  @Test
  fun stopPlaybackClearsTheQueueSynchronously() {
    val c = controller()
    c.enqueue(pcm(100), 24000)
    val taken = c.pollChunk()!!
    c.enqueue(pcm(100), 24000)
    c.enqueue(pcm(100), 24000)
    assertEquals(2, c.queuedChunks)
    c.stopPlayback()
    assertEquals(0, c.queuedChunks)
    assertNull(c.pollChunk())
    assertFalse(c.isCurrent(taken))
    assertFalse(c.state().playing)
    assertFalse(states.last().playing)
    // No grace: the pending timer is cancelled and emits nothing more.
    val n = states.size
    time.advance(5000)
    assertEquals(n, states.size)
  }

  @Test
  fun stopPlaybackWhileIdleEmitsNothing() {
    val c = controller()
    c.stopPlayback()
    assertTrue(states.isEmpty())
  }

  @Test
  fun routeChangeReStampsStartedAtWhilePlayingOnly() {
    val c = controller()
    assertFalse(c.restampIfPlaying())
    c.enqueue(pcm(1000), 24000)
    time.advance(200)
    assertTrue(c.restampIfPlaying())
    assertEquals(PlaybackState(true, time.now.toDouble()), states.last())
    assertEquals(time.now.toDouble(), c.state().startedAt, 0.0)
  }

  @Test
  fun resetStartsTheNextSessionWithTheFirstBurstLead() {
    val c = controller()
    c.enqueue(pcm(100), 24000)
    c.pollChunk()
    time.advance(2000)
    c.enqueue(pcm(100), 24000)
    c.pollChunk()
    c.reset()
    c.configure(leadFirstOnly = true, playbackRate = 1.05)
    val t = time.now
    c.enqueue(pcm(100), 24000)
    assertEquals(t + 300, c.pollChunk()!!.notBeforeMs)
  }

  @Test
  fun refusesUnsupportedRatesAndBadPlaybackRates() {
    val c = controller()
    assertThrows(IllegalArgumentException::class.java) { c.enqueue(pcm(10, 44100), 44100) }
    assertThrows(IllegalArgumentException::class.java) { c.enqueue(pcm(10, 8000), 8000) }
    assertThrows(IllegalArgumentException::class.java) { c.setPlaybackRate(0.0) }
    c.setPlaybackRate(1.1)
    assertEquals(1.1, c.currentRate(), 0.0)
  }

  @Test
  fun leadHelper() {
    assertEquals(300L, PlaybackController.leadMsForBurst(0, true))
    assertEquals(50L, PlaybackController.leadMsForBurst(1, true))
    assertEquals(300L, PlaybackController.leadMsForBurst(1, false))
    assertEquals(400L, PlaybackController.AUDIO_END_GRACE_MS)
  }
}
