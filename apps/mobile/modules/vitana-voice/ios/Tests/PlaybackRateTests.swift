// VTID-05180 — chunk durations at 16 kHz / 24 kHz and the two rate modes
// (plan Change 9 / Change 10, sparring R1-F12): varispeed (A) and resample (B)
// give the same audible duration within 1 ms per chunk at 1.0×, 1.05× and 1.1×.

import AVFoundation
import XCTest
#if canImport(VitanaVoiceCore)
@testable import VitanaVoiceCore
#else
@testable import VitanaVoice
#endif

final class PlaybackRateTests: XCTestCase {
  private let rates = [1.0, 1.05, 1.1]
  // (source rate, samples): 100 ms chunks, plus an odd-length 24 kHz chunk.
  private let chunks: [(rate: Double, count: Int)] = [(16000, 1600), (24000, 2400), (24000, 4801)]

  func testBothModesGiveTheSameDurationWithin1ms() {
    let renderer = ChunkRenderer()!
    for rate in rates {
      for chunk in chunks {
        let samples = Signal.sine(frequency: 300, amplitude: 0.4, sampleRate: chunk.rate, count: chunk.count)
        let a = renderer.render(samples: samples, sourceRate: chunk.rate, rate: rate, mode: .varispeed)!
        let b = renderer.render(samples: samples, sourceRate: chunk.rate, rate: rate, mode: .resample)!
        let durationA = PlaybackRate.audibleDuration(frames: a.frameLength, rate: rate, mode: .varispeed)
        let durationB = PlaybackRate.audibleDuration(frames: b.frameLength, rate: rate, mode: .resample)
        let expected = Double(chunk.count) / chunk.rate / rate
        let label = "\(chunk.rate) Hz × \(chunk.count) at \(rate)×"
        XCTAssertEqual(durationA, durationB, accuracy: 0.001, label)
        XCTAssertEqual(durationA, expected, accuracy: 0.001, label)
        XCTAssertEqual(durationB, expected, accuracy: 0.001, label)
      }
    }
  }

  func testA24kChunkAndA16kChunkOfTheSameLengthInTimeLastTheSame() {
    let renderer = ChunkRenderer()!
    for rate in [1.05, 1.1] {
      let at16 = renderer.render(samples: [Float](repeating: 0.1, count: 1600), sourceRate: 16000, rate: rate, mode: .varispeed)!
      let at24 = renderer.render(samples: [Float](repeating: 0.1, count: 2400), sourceRate: 24000, rate: rate, mode: .varispeed)!
      XCTAssertEqual(PlaybackRate.audibleDuration(frames: at16.frameLength, rate: rate, mode: .varispeed),
                     PlaybackRate.audibleDuration(frames: at24.frameLength, rate: rate, mode: .varispeed),
                     accuracy: 0.001)
    }
  }

  func testResampleModeRaisesPitchWithTempo() {
    // A 1 kHz tone resampled for 1.1× must read as 1.1 kHz at the player rate,
    // the same pitch varispeed produces from the unmodified buffer.
    let renderer = ChunkRenderer()!
    let tone = Signal.sine(frequency: 1000, amplitude: 0.5, sampleRate: 24000, count: 24000)
    let b = renderer.render(samples: tone, sourceRate: 24000, rate: 1.1, mode: .resample)!
    let a = renderer.render(samples: tone, sourceRate: 24000, rate: 1.1, mode: .varispeed)!
    XCTAssertEqual(dominantFrequency(b), 1100, accuracy: 1100 * 0.02)
    XCTAssertEqual(dominantFrequency(a) * 1.1, 1100, accuracy: 1100 * 0.02)
  }

  func testRatesAreClampedAndUnsupportedSourceRatesRefused() {
    XCTAssertEqual(PlaybackRate.clamp(.nan), 1.0)
    XCTAssertEqual(PlaybackRate.clamp(5), 2.0)
    XCTAssertEqual(PlaybackRate.clamp(0.1), 0.5)
    XCTAssertEqual(PlaybackRate.clamp(1.05), 1.05)
    XCTAssertEqual(PlaybackRate.varispeedRate(rate: 1.1, mode: .resample), 1.0)
    XCTAssertEqual(PlaybackRate.converterInputRate(sourceRate: 24000, rate: 1.1, mode: .resample), 26400, accuracy: 1e-9)
    XCTAssertNil(ChunkRenderer()!.render(samples: [0.1, 0.2], sourceRate: 44100, rate: 1, mode: .varispeed))
    XCTAssertNil(ChunkRenderer()!.render(samples: [], sourceRate: 24000, rate: 1, mode: .varispeed))
  }

  /// Zero-crossing estimate of a clean tone's frequency at the player rate.
  private func dominantFrequency(_ buffer: AVAudioPCMBuffer) -> Double {
    let samples = UnsafeBufferPointer(start: buffer.floatChannelData![0], count: Int(buffer.frameLength))
    var crossings = 0
    for i in 1..<samples.count where (samples[i - 1] < 0) != (samples[i] < 0) { crossings += 1 }
    let seconds = Double(samples.count) / PlaybackRate.playerSampleRate
    return Double(crossings) / 2 / seconds
  }
}
