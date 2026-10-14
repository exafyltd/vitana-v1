// VTID-05180 — playback state edge stamping, 400 ms grace, queue clear,
// route-change re-stamp and the first-burst lead (plan Change 9 / Change 10, F2).

import XCTest
#if canImport(VitanaVoiceCore)
@testable import VitanaVoiceCore
#else
@testable import VitanaVoice
#endif

final class PlaybackStateTests: XCTestCase {
  private var scheduler: ManualScheduler!
  private var machine: PlaybackStateMachine!
  private var events: [(playing: Bool, startedAt: Double)] = []

  override func setUp() {
    super.setUp()
    scheduler = ManualScheduler()
    scheduler.nowMs = 1_000
    machine = PlaybackStateMachine(scheduler: scheduler, now: { [unowned self] in self.scheduler.nowMs })
    events = []
    machine.onChange = { [unowned self] playing, startedAt in self.events.append((playing: playing, startedAt: startedAt)) }
  }

  func testStartedAtIsStampedOnlyOnTheFalseToTrueEdge() {
    machine.chunkScheduled()
    XCTAssertTrue(machine.playing)
    XCTAssertEqual(machine.startedAt, 1_000)
    scheduler.advance(byMs: 64)
    machine.chunkScheduled()
    scheduler.advance(byMs: 64)
    machine.chunkScheduled()
    XCTAssertEqual(machine.startedAt, 1_000, "re-stamping per chunk would slide the AEC warm-up window")
    XCTAssertEqual(events.count, 1)
    XCTAssertEqual(events[0].playing, true)
  }

  func testPlayingTurnsFalse400msAfterTheQueueDrains() {
    machine.chunkScheduled()
    machine.drained()
    scheduler.advance(byMs: 399)
    XCTAssertTrue(machine.playing)
    scheduler.advance(byMs: 1)
    XCTAssertFalse(machine.playing)
    XCTAssertEqual(events.last?.playing, false)
    XCTAssertEqual(PlaybackStateMachine.graceMs, 400)
  }

  func testAChunkInsideTheGraceKeepsPlayingWithoutReStamping() {
    machine.chunkScheduled()
    machine.drained()
    scheduler.advance(byMs: 200)
    machine.chunkScheduled()
    scheduler.advance(byMs: 400)
    XCTAssertTrue(machine.playing)
    XCTAssertEqual(machine.startedAt, 1_000)
    XCTAssertEqual(events.count, 1)
  }

  func testStopPlaybackEmptiesTheQueueAndTurnsFalseSynchronously() {
    let queue = PlaybackQueue<String>()
    _ = queue.add("a")
    _ = queue.add("b")
    machine.chunkScheduled()
    machine.chunkScheduled()
    // What VoiceEngine.stopPlayback() does on its queue:
    queue.clear()
    machine.stopped()
    XCTAssertTrue(queue.isEmpty)
    XCTAssertFalse(machine.playing)
    XCTAssertEqual(events.last?.playing, false)
  }

  func testAGraceTimerArmedBeforeStopDoesNothingAfterwards() {
    machine.chunkScheduled()
    machine.drained()
    machine.stopped()
    machine.chunkScheduled()
    let startedAgain = machine.startedAt
    scheduler.advance(byMs: 400)
    XCTAssertTrue(machine.playing, "the old grace timer must not end the new burst")
    XCTAssertEqual(machine.startedAt, startedAgain)
  }

  func testARouteChangeReStampsWhilePlayingOnly() {
    machine.routeChanged()
    XCTAssertTrue(events.isEmpty, "no event while idle")
    machine.chunkScheduled()
    scheduler.advance(byMs: 750)
    machine.routeChanged()
    XCTAssertEqual(machine.startedAt, 1_750, "AEC re-converges on the new route: the warm-up applies again")
    XCTAssertEqual(events.last?.playing, true)
    XCTAssertEqual(events.last?.startedAt, 1_750)
  }
}

final class PlaybackQueueTests: XCTestCase {
  func testStaleCompletionsAreIgnoredAfterClear() {
    let queue = PlaybackQueue<Int>()
    let first = queue.add(1)
    _ = queue.add(2)
    queue.clear()
    XCTAssertFalse(queue.complete(first))
    XCTAssertTrue(queue.isEmpty)
  }

  func testCompletionsRemoveInAnyOrder() {
    let queue = PlaybackQueue<Int>()
    let a = queue.add(1)
    let b = queue.add(2)
    XCTAssertTrue(queue.complete(b))
    XCTAssertEqual(queue.count, 1)
    XCTAssertTrue(queue.complete(a))
    XCTAssertFalse(queue.complete(a))
    XCTAssertTrue(queue.isEmpty)
  }

  func testRebuildHandsBackUnplayedBuffersInOrder() {
    let queue = PlaybackQueue<Int>()
    let a = queue.add(1)
    _ = queue.add(2)
    _ = queue.add(3)
    XCTAssertTrue(queue.complete(a))
    XCTAssertEqual(queue.takeForReschedule(), [2, 3])
    XCTAssertTrue(queue.isEmpty)
    let again = queue.add(2)
    XCTAssertEqual(again.generation, queue.generation)
  }
}

final class LeadPolicyTests: XCTestCase {
  func testEveryBurstGetsTheFullLeadWithoutTheServerFlag() {
    var lead = LeadPolicy(leadFirstOnly: false)
    XCTAssertEqual(lead.leadForBurstStart(), 0.3)
    XCTAssertEqual(lead.leadForBurstStart(), 0.3)
  }

  func testOnlyTheFirstBurstGetsTheFullLeadWithTheServerFlag() {
    var lead = LeadPolicy(leadFirstOnly: true)
    XCTAssertEqual(lead.leadForBurstStart(), 0.3)
    XCTAssertEqual(lead.leadForBurstStart(), 0.05)
    XCTAssertEqual(lead.leadForBurstStart(), 0.05)
  }
}
