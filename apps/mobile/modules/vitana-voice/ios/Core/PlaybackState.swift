// VTID-05180 — playback state, lead and queue (plan Change 9, F2):
//   - `playing` turns true on the first scheduled chunk; `startedAt` is stamped
//     only on the false→true edge (re-stamping per chunk would slide the AEC
//     warm-up window forward for the whole reply);
//   - it turns false 400 ms after the queue drains, unless a chunk arrives first;
//   - `stopPlayback()` clears the queue and turns `playing` false synchronously;
//   - a route change re-stamps `startedAt` while playing (AEC re-converges on the
//     new route, so the warm-up window applies again).

import Foundation

public protocol GraceScheduler {
  func schedule(afterMs: Double, _ work: @escaping () -> Void)
}

public final class PlaybackStateMachine {
  /// orb-widget.js audio-end grace (`setTimeout(…, 400)`).
  public static let graceMs: Double = 400

  public private(set) var playing = false
  public private(set) var startedAt: Double = 0
  /// Called with (playing, startedAt) on every change the JS side must see.
  public var onChange: ((Bool, Double) -> Void)?

  private let scheduler: GraceScheduler
  private let now: () -> Double
  private var token = 0

  public init(scheduler: GraceScheduler, now: @escaping () -> Double) {
    self.scheduler = scheduler
    self.now = now
  }

  /// A chunk was scheduled. Cancels a pending grace timer.
  public func chunkScheduled() {
    token &+= 1
    if !playing {
      playing = true
      startedAt = now()
      onChange?(true, startedAt)
    }
  }

  /// The queue has drained: `playing` turns false after the grace period
  /// unless another chunk is scheduled (or playback is stopped) first.
  public func drained() {
    token &+= 1
    let armed = token
    scheduler.schedule(afterMs: PlaybackStateMachine.graceMs) { [weak self] in
      guard let self = self, self.token == armed, self.playing else { return }
      self.playing = false
      self.onChange?(false, self.startedAt)
    }
  }

  /// `stopPlayback()` / server `interrupted`: false now, no grace.
  public func stopped() {
    token &+= 1
    if playing {
      playing = false
      onChange?(false, startedAt)
    }
  }

  /// Route change while playing: re-stamp so the TS gate's warm-up applies again.
  public func routeChanged() {
    guard playing else { return }
    startedAt = now()
    onChange?(true, startedAt)
  }
}

/// Lead before the first chunk of a burst (orb-widget.js VTID-04552):
/// 0.3 s; with the server's `playback_lead_first_only`, only the session's first
/// burst keeps it and later bursts use 0.05 s.
public struct LeadPolicy {
  public static let firstSec = 0.3
  public static let laterSec = 0.05

  public let leadFirstOnly: Bool
  public private(set) var firstBurstLeadUsed = false

  public init(leadFirstOnly: Bool) {
    self.leadFirstOnly = leadFirstOnly
  }

  public mutating func leadForBurstStart() -> Double {
    let lead = (leadFirstOnly && firstBurstLeadUsed) ? LeadPolicy.laterSec : LeadPolicy.firstSec
    firstBurstLeadUsed = true
    return lead
  }
}

/// Scheduled-but-unplayed buffers, in order. A generation counter makes the
/// completion callbacks of stopped buffers no-ops, and lets a graph rebuild
/// re-schedule what had not played yet.
public final class PlaybackQueue<Buffer> {
  public struct Ticket: Equatable {
    public let id: Int
    public let generation: Int
  }

  public private(set) var generation = 0
  private var nextId = 0
  private var items: [(id: Int, buffer: Buffer)] = []

  public init() {}

  public var count: Int { return items.count }
  public var isEmpty: Bool { return items.isEmpty }

  public func add(_ buffer: Buffer) -> Ticket {
    nextId += 1
    items.append((id: nextId, buffer: buffer))
    return Ticket(id: nextId, generation: generation)
  }

  /// Returns true when the ticket belonged to the current generation and was
  /// still queued (a real "played back" event).
  @discardableResult
  public func complete(_ ticket: Ticket) -> Bool {
    guard ticket.generation == generation,
          let index = items.firstIndex(where: { $0.id == ticket.id }) else { return false }
    items.remove(at: index)
    return true
  }

  /// `stopPlayback()`: empties the queue; stale completions are ignored.
  public func clear() {
    generation += 1
    items.removeAll()
  }

  /// Graph rebuild: hands back the unplayed buffers in order and starts a new
  /// generation. The caller schedules them again with `add`.
  public func takeForReschedule() -> [Buffer] {
    let buffers = items.map { $0.buffer }
    clear()
    return buffers
  }
}
