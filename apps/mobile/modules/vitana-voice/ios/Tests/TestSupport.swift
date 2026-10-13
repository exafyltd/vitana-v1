// VTID-05180 — shared helpers for the ORB iOS voice module XCTests.
// Runs on a macOS runner only (STATUS row 8b): the pod's test_spec or
// `xcodebuild test -scheme VitanaVoiceCore` from ios/ (Package.swift).

import AVFoundation
import XCTest
#if canImport(VitanaVoiceCore)
@testable import VitanaVoiceCore
#else
@testable import VitanaVoice
#endif

/// Grace timers run only when the test says so.
final class ManualScheduler: GraceScheduler {
  private(set) var pending: [(dueMs: Double, work: () -> Void)] = []
  var nowMs: Double = 0

  func schedule(afterMs: Double, _ work: @escaping () -> Void) {
    pending.append((dueMs: nowMs + afterMs, work: work))
  }

  /// Advances the clock and runs every timer that is due, in order.
  func advance(byMs ms: Double) {
    nowMs += ms
    let due = pending.filter { $0.dueMs <= nowMs }
    pending.removeAll { $0.dueMs <= nowMs }
    for timer in due { timer.work() }
  }
}

enum Signal {
  static func sine(frequency: Double, amplitude: Float, sampleRate: Double, count: Int, phase: Double = 0) -> [Float] {
    return (0..<count).map { i in
      amplitude * Float(sin(2 * Double.pi * frequency * Double(i) / sampleRate + phase))
    }
  }

  static func monoBuffer(_ samples: [Float], sampleRate: Double) -> AVAudioPCMBuffer {
    let format = AVAudioFormat(commonFormat: .pcmFormatFloat32, sampleRate: sampleRate, channels: 1, interleaved: false)!
    let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(samples.count))!
    buffer.frameLength = AVAudioFrameCount(samples.count)
    for (i, s) in samples.enumerated() { buffer.floatChannelData![0][i] = s }
    return buffer
  }
}
