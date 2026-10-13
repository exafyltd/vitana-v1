// VTID-05180 — ORB iOS voice engine (Native Wave 1b N6b, plan Change 9).
//
// Audio I/O only. Every decision about frames (silent or verbatim, barge-in,
// pre-roll, cooldowns) is made by the TypeScript gate (plan Change 1); this
// engine captures, frames, measures RMS and plays. It never speaks a sentence of
// its own and never chooses a voice: the server picks the voice (rules 41/42a).
//
// Session:  .playAndRecord / .voiceChat / [.defaultToSpeaker, .allowBluetooth],
//           20 ms IO buffer, active only between start() and stop().
// AEC:      AecPathSelector — iOS 17+ voice-processing on the input node,
//           16.4–16.x through the session's .voiceChat mode only.
// Graph:    input tap → CapturePipeline → onFrame;
//           AVAudioPlayerNode → [AVAudioUnitVarispeed] → mainMixerNode, on the
//           SAME engine as capture, so voice processing has the render reference.
// Lifecycle: an OS interruption, a media-services reset or the app going to the
//           background stops audio and reports it; the TS session ends (F9). A
//           route change rebuilds the graph and re-stamps playbackStartedAt.

import AVFoundation
import UIKit

enum VoiceEngineError: Error, CustomStringConvertible {
  case notRunning
  case invalidAudio(String)
  case unsupportedSampleRate(Double)
  case noInputRoute
  case voiceProcessingUnavailable

  var description: String {
    switch self {
    case .notRunning: return "VitanaVoice is not running; call start() first"
    case .invalidAudio(let why): return "VitanaVoice could not decode the audio chunk: \(why)"
    case .unsupportedSampleRate(let rate): return "VitanaVoice plays 16000 or 24000 Hz chunks, got \(rate)"
    case .noInputRoute: return "VitanaVoice found no audio input route"
    case .voiceProcessingUnavailable: return "Voice processing on the engine needs iOS 17"
    }
  }
}

/// The real voice-processing switch. The iOS 17 call sits behind the same
/// availability check the selector uses; below 17 it is never reached
/// (AecPathSelector.apply only calls it on the `vpio-engine` path).
struct InputNodeVoiceProcessing: VoiceProcessingControl {
  let node: AVAudioInputNode

  func enableVoiceProcessing() throws {
    if #available(iOS 17, *) {
      try node.setVoiceProcessingEnabled(true)
    } else {
      throw VoiceEngineError.voiceProcessingUnavailable
    }
  }
}

final class QueueGraceScheduler: GraceScheduler {
  private let queue: DispatchQueue

  init(queue: DispatchQueue) {
    self.queue = queue
  }

  func schedule(afterMs: Double, _ work: @escaping () -> Void) {
    queue.asyncAfter(deadline: .now() + afterMs / 1000.0, execute: work)
  }
}

/// Milliseconds since the epoch, the clock the TS side uses (`Date.now()`).
func epochMs() -> Double {
  return Date().timeIntervalSince1970 * 1000.0
}

final class VoiceEngine {
  struct Sink {
    var frame: (_ b64: String, _ rms: Float, _ ts: Double) -> Void
    var playbackState: (_ playing: Bool, _ startedAt: Double) -> Void
    var interruption: (_ kind: String) -> Void
    var routeChange: (_ reason: String, _ output: String) -> Void
    var background: () -> Void
  }

  private static let queueKey = DispatchSpecificKey<Bool>()

  private let sink: Sink
  private let queue: DispatchQueue
  private let session = AVAudioSession.sharedInstance()
  private let selectedPath: AecPath
  private let rateMode = PLAYBACK_RATE_MODE
  private let renderer: ChunkRenderer?
  private let playbackQueue = PlaybackQueue<AVAudioPCMBuffer>()
  private let playback: PlaybackStateMachine

  private var engine: AVAudioEngine?
  private var player: AVAudioPlayerNode?
  private var varispeed: AVAudioUnitVarispeed?
  private var lead = LeadPolicy(leadFirstOnly: false)
  private var playbackRate = 1.0
  private var activePath: AecPath
  /// start() succeeded and stop() has not been called.
  private var running = false
  /// Audio was stopped by the OS (interruption, reset, background); waiting for stop().
  private var halted = false
  private var observers: [NSObjectProtocol] = []
  private var rebuildToken = 0

  init(sink: Sink) {
    let queue = DispatchQueue(label: "com.vitana.voice.engine")
    let path = AecPathSelector.selectForRunningOS()
    self.sink = sink
    self.queue = queue
    self.selectedPath = path
    self.activePath = path
    self.renderer = ChunkRenderer()
    self.playback = PlaybackStateMachine(scheduler: QueueGraceScheduler(queue: queue), now: epochMs)
    queue.setSpecific(key: VoiceEngine.queueKey, value: true)
    playback.onChange = { [sink] playing, startedAt in sink.playbackState(playing, startedAt) }
  }

  deinit {
    removeObservers()
  }

  // MARK: - JS API

  func start(leadFirstOnly: Bool, playbackRate rate: Double) throws {
    try onQueue {
      if running || halted { teardown(deactivateSession: false) }
      lead = LeadPolicy(leadFirstOnly: leadFirstOnly)
      playbackRate = PlaybackRate.clamp(rate)
      do {
        try configureSession()
        try buildGraph()
      } catch {
        teardown(deactivateSession: true)
        throw error
      }
      running = true
      halted = false
      addObservers()
    }
  }

  func stop() {
    onQueue { teardown(deactivateSession: true) }
  }

  func enqueue(b64: String, sampleRate: Double) throws {
    guard PlaybackRate.isSupportedSourceRate(sampleRate) else {
      throw VoiceEngineError.unsupportedSampleRate(sampleRate)
    }
    guard let data = Data(base64Encoded: b64) else { throw VoiceEngineError.invalidAudio("not base64") }
    let samples = PcmCodec.decodeInt16LE(data)
    if samples.isEmpty { return }
    try onQueue {
      guard running, !halted, let player = player, let renderer = renderer else {
        throw VoiceEngineError.notRunning
      }
      guard let buffer = renderer.render(samples: samples, sourceRate: sampleRate,
                                         rate: playbackRate, mode: rateMode) else {
        throw VoiceEngineError.invalidAudio("conversion failed")
      }
      schedule(buffer, on: player)
    }
  }

  /// Synchronous: when this returns, nothing queued will play.
  func stopPlayback() {
    onQueue { stopPlaybackLocked() }
  }

  func setPlaybackRate(_ rate: Double) {
    onQueue {
      playbackRate = PlaybackRate.clamp(rate)
      // Mode A changes the node now; mode B applies to the next chunk scheduled.
      varispeed?.rate = Float(PlaybackRate.varispeedRate(rate: playbackRate, mode: rateMode))
    }
  }

  func capabilities() -> [String: Any] {
    return onQueue { VoiceCapabilities.make(path: activePath).dictionary }
  }

  // MARK: - Session and graph

  private func configureSession() throws {
    try session.setCategory(.playAndRecord, mode: .voiceChat, options: [.defaultToSpeaker, .allowBluetooth])
    try session.setPreferredIOBufferDuration(0.02)
    try session.setActive(true)
  }

  private func buildGraph() throws {
    guard let renderer = renderer else { throw VoiceEngineError.invalidAudio("no player format") }
    let engine = AVAudioEngine()
    let input = engine.inputNode
    // Must happen before the input format is read and before the engine starts.
    activePath = AecPathSelector.apply(selectedPath, control: InputNodeVoiceProcessing(node: input))

    let hardwareFormat = input.outputFormat(forBus: 0)
    guard let converter = CaptureConverter(inputFormat: hardwareFormat) else {
      throw VoiceEngineError.noInputRoute
    }
    let pipeline = CapturePipeline(converter: converter)

    let player = AVAudioPlayerNode()
    engine.attach(player)
    if rateMode == .varispeed {
      let node = AVAudioUnitVarispeed()
      node.rate = Float(PlaybackRate.varispeedRate(rate: playbackRate, mode: rateMode))
      engine.attach(node)
      engine.connect(player, to: node, format: renderer.playerFormat)
      engine.connect(node, to: engine.mainMixerNode, format: renderer.playerFormat)
      varispeed = node
    } else {
      engine.connect(player, to: engine.mainMixerNode, format: renderer.playerFormat)
      varispeed = nil
    }

    let sink = self.sink
    input.installTap(onBus: 0, bufferSize: AVAudioFrameCount(PcmCodec.frameSamples), format: hardwareFormat) { buffer, _ in
      for frame in pipeline.push(buffer) {
        sink.frame(frame.base64, frame.rms, epochMs())
      }
    }

    engine.prepare()
    do {
      try engine.start()
    } catch {
      input.removeTap(onBus: 0)
      throw error
    }
    self.engine = engine
    self.player = player
  }

  /// Stops capture and playback and drops the graph. Session stays as asked.
  private func dropGraph() {
    if let engine = engine {
      engine.inputNode.removeTap(onBus: 0)
      player?.stop()
      engine.stop()
    }
    engine = nil
    player = nil
    varispeed = nil
  }

  private func teardown(deactivateSession: Bool) {
    removeObservers()
    rebuildToken += 1
    stopPlaybackLocked()
    dropGraph()
    activePath = selectedPath
    running = false
    halted = false
    if deactivateSession {
      try? session.setActive(false, options: .notifyOthersOnDeactivation)
    }
  }

  /// OS took the audio away (interruption, reset, background). Audio stops now;
  /// the TS session ends and calls stop(). Observers stay until then so an
  /// interruption's `.ended` is still reported (it never resumes anything).
  private func halt() {
    guard running, !halted else { return }
    rebuildToken += 1
    stopPlaybackLocked()
    dropGraph()
    halted = true
  }

  // MARK: - Playback

  private func schedule(_ buffer: AVAudioPCMBuffer, on player: AVAudioPlayerNode) {
    let burstStart = playbackQueue.isEmpty
    if burstStart { player.stop() }
    enqueueOnPlayer(buffer, player)
    playback.chunkScheduled()
    if burstStart {
      let leadSec = lead.leadForBurstStart()
      let start = AVAudioTime(hostTime: mach_absolute_time() + AVAudioTime.hostTime(forSeconds: leadSec))
      player.play(at: start)
    } else if !player.isPlaying {
      player.play()
    }
  }

  private func enqueueOnPlayer(_ buffer: AVAudioPCMBuffer, _ player: AVAudioPlayerNode) {
    let ticket = playbackQueue.add(buffer)
    player.scheduleBuffer(buffer, completionCallbackType: .dataPlayedBack) { [weak self] _ in
      guard let self = self else { return }
      self.queue.async { self.chunkPlayed(ticket) }
    }
  }

  private func chunkPlayed(_ ticket: PlaybackQueue<AVAudioPCMBuffer>.Ticket) {
    guard playbackQueue.complete(ticket) else { return }
    if playbackQueue.isEmpty { playback.drained() }
  }

  private func stopPlaybackLocked() {
    player?.stop()
    playbackQueue.clear()
    playback.stopped()
  }

  // MARK: - Route changes

  private func requestRebuild(reason: String) {
    queue.async {
      guard self.running, !self.halted else { return }
      // Coalesce: a route change usually posts both the session and the engine
      // notification; rebuild once, 100 ms after the last one.
      self.rebuildToken += 1
      let token = self.rebuildToken
      self.queue.asyncAfter(deadline: .now() + 0.1) {
        guard token == self.rebuildToken, self.running, !self.halted else { return }
        self.rebuild(reason: reason)
      }
    }
  }

  private func rebuild(reason: String) {
    let carried = playbackQueue.takeForReschedule()
    dropGraph()
    do {
      try buildGraph()
    } catch {
      // No usable route: same as an interruption, the session ends.
      playback.stopped()
      halted = true
      sink.interruption("began")
      return
    }
    if let player = player, !carried.isEmpty {
      // What had not played yet plays on the new route; the chunk that was
      // playing restarts from its beginning.
      for buffer in carried { enqueueOnPlayer(buffer, player) }
      player.play()
    }
    // AEC re-converges on the new route: the warm-up window applies again.
    playback.routeChanged()
    sink.routeChange(reason, RouteClassifier.classify(session.currentRoute.outputs.first?.portType).rawValue)
  }

  // MARK: - Notifications

  private func addObservers() {
    removeObservers()
    let center = NotificationCenter.default
    observers.append(center.addObserver(forName: AVAudioSession.interruptionNotification,
                                        object: session, queue: nil) { [weak self] note in
      self?.handleInterruption(note)
    })
    observers.append(center.addObserver(forName: AVAudioSession.routeChangeNotification,
                                        object: session, queue: nil) { [weak self] note in
      guard let raw = note.userInfo?[AVAudioSessionRouteChangeReasonKey] as? UInt,
            let reason = AVAudioSession.RouteChangeReason(rawValue: raw),
            RouteClassifier.requiresRebuild(reason) else { return }
      self?.requestRebuild(reason: RouteClassifier.reasonName(reason))
    })
    observers.append(center.addObserver(forName: .AVAudioEngineConfigurationChange,
                                        object: nil, queue: nil) { [weak self] note in
      guard let self = self else { return }
      self.queue.async {
        guard let changed = note.object as? AVAudioEngine, changed === self.engine else { return }
        self.requestRebuild(reason: RouteClassifier.engineConfigurationChange)
      }
    })
    observers.append(center.addObserver(forName: AVAudioSession.mediaServicesWereResetNotification,
                                        object: nil, queue: nil) { [weak self] _ in
      guard let self = self else { return }
      self.queue.async {
        guard self.running, !self.halted else { return }
        // Every audio object is invalid now: drop it all; the session ends and
        // the next start() builds from scratch.
        self.halt()
        self.sink.interruption("began")
      }
    })
    observers.append(center.addObserver(forName: UIApplication.didEnterBackgroundNotification,
                                        object: nil, queue: nil) { [weak self] _ in
      guard let self = self else { return }
      self.queue.async {
        guard self.running, !self.halted else { return }
        // No UIBackgroundModes audio in N6: the session never continues in the
        // background (mirrors the widget's background stop, F9).
        self.halt()
        self.sink.background()
      }
    })
  }

  private func removeObservers() {
    let center = NotificationCenter.default
    for observer in observers { center.removeObserver(observer) }
    observers.removeAll()
  }

  private func handleInterruption(_ note: Notification) {
    guard let raw = note.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
          let type = AVAudioSession.InterruptionType(rawValue: raw) else { return }
    queue.async {
      switch type {
      case .began:
        guard self.running, !self.halted else { return }
        self.halt()
        self.sink.interruption("began")
      case .ended:
        // Reported, never resumed: the TS session has ended (or is ending).
        guard self.running else { return }
        self.sink.interruption("ended")
      @unknown default:
        return
      }
    }
  }

  // MARK: - Queue helper

  private func onQueue<T>(_ work: () throws -> T) rethrows -> T {
    if DispatchQueue.getSpecific(key: VoiceEngine.queueKey) == true {
      return try work()
    }
    return try queue.sync(execute: work)
  }
}
