// VTID-05180 — capture framing, PCM encoding and RMS (plan Change 10).

import AVFoundation
import XCTest
#if canImport(VitanaVoiceCore)
@testable import VitanaVoiceCore
#else
@testable import VitanaVoice
#endif

final class PcmCodecTests: XCTestCase {
  func testInt16ConversionMatchesTheWidget() {
    // s < 0 ? s * 0x8000 : s * 0x7FFF, clamped, truncated toward zero.
    let input: [Float] = [1.5, -1.5, 1, -1, 0.5, -0.5, 0, .nan]
    let expected: [Int16] = [32767, -32768, 32767, -32768, 16383, -16384, 0, 0]
    XCTAssertEqual(input.map(PcmCodec.int16Sample), expected)
  }

  func testEncodingIsLittleEndian() {
    XCTAssertEqual([UInt8](PcmCodec.encodeInt16LE([-1])), [0x00, 0x80])
    XCTAssertEqual([UInt8](PcmCodec.encodeInt16LE([1])), [0xFF, 0x7F])
  }

  func testSilenceEncodesToAllZeroBytes() {
    let silent = [Float](repeating: 0, count: PcmCodec.frameSamples)
    let data = PcmCodec.encodeInt16LE(silent)
    XCTAssertEqual(data.count, PcmCodec.frameBytes)
    XCTAssertTrue(data.allSatisfy { $0 == 0 })
    let b64 = PcmCodec.base64Frame(silent)
    XCTAssertEqual(b64.count, PcmCodec.frameBase64Length)
    XCTAssertEqual(b64, String(repeating: "A", count: 2731) + "=")
  }

  func testDecodeRoundTrips() {
    let samples = Signal.sine(frequency: 440, amplitude: 0.7, sampleRate: 24000, count: 480)
    let decoded = PcmCodec.decodeInt16LE(PcmCodec.encodeInt16LE(samples))
    XCTAssertEqual(decoded.count, samples.count)
    for (a, b) in zip(samples, decoded) { XCTAssertEqual(a, b, accuracy: 1.0 / 16384) }
  }

  func testDecodeIgnoresATrailingOddByte() {
    XCTAssertEqual(PcmCodec.decodeInt16LE(Data([0x00, 0x80, 0x12])), [-1])
  }

  func testRmsOfKnownSignals() {
    // 500 Hz at 16 kHz: exactly 32 periods in a 1024-sample frame.
    let sine = Signal.sine(frequency: 500, amplitude: 0.5, sampleRate: 16000, count: 1024)
    XCTAssertEqual(PcmCodec.rms(sine), 0.5 / Float(2).squareRoot(), accuracy: 1e-6)
    XCTAssertEqual(PcmCodec.rms([Float](repeating: 0.25, count: 1024)), 0.25, accuracy: 1e-6)
    let square = (0..<1024).map { $0 % 2 == 0 ? Float(0.3) : Float(-0.3) }
    XCTAssertEqual(PcmCodec.rms(square), 0.3, accuracy: 1e-6)
    XCTAssertEqual(PcmCodec.rms([Float](repeating: 0, count: 1024)), 0)
    XCTAssertEqual(PcmCodec.rms([]), 0)
  }
}

final class FrameAssemblerTests: XCTestCase {
  func testEmitsExactFramesAndKeepsTheRemainderInOrder() {
    let assembler = FrameAssembler()
    XCTAssertTrue(assembler.push((0..<1000).map { Float($0) }).isEmpty)
    XCTAssertEqual(assembler.bufferedSamples, 1000)
    let frames = assembler.push((1000..<1100).map { Float($0) })
    XCTAssertEqual(frames.count, 1)
    XCTAssertEqual(frames[0].count, 1024)
    XCTAssertEqual(frames[0].first, 0)
    XCTAssertEqual(frames[0].last, 1023)
    XCTAssertEqual(assembler.bufferedSamples, 76)
    let more = assembler.push((1100..<4096).map { Float($0) })
    XCTAssertEqual(more.count, 3)
    XCTAssertEqual(more[0].first, 1024)
    XCTAssertEqual(assembler.bufferedSamples, 0)
  }

  func testOddHardwareBufferSizesAndRatesYieldExact1024SampleFrames() {
    for rate in [48000.0, 44100.0, 24000.0] {
      for size in [441, 480, 512, 4096] {
        let format = AVAudioFormat(commonFormat: .pcmFormatFloat32, sampleRate: rate, channels: 1, interleaved: false)!
        let pipeline = CapturePipeline(converter: CaptureConverter(inputFormat: format)!)
        let seconds = 2.0
        let total = Int(rate * seconds)
        let signal = Signal.sine(frequency: 500, amplitude: 0.5, sampleRate: rate, count: total)
        var frames: [CapturedFrame] = []
        var offset = 0
        while offset < total {
          let end = min(total, offset + size)
          frames += pipeline.push(Signal.monoBuffer(Array(signal[offset..<end]), sampleRate: rate))
          offset = end
        }
        let label = "rate \(rate), buffer \(size)"
        let maxFrames = Int(seconds * 16000) / 1024
        XCTAssertLessThanOrEqual(frames.count, maxFrames, label)
        XCTAssertGreaterThanOrEqual(frames.count, maxFrames - 2, label) // resampler latency
        for frame in frames {
          XCTAssertEqual(frame.base64.count, PcmCodec.frameBase64Length, label)
          XCTAssertEqual(Data(base64Encoded: frame.base64)?.count, PcmCodec.frameBytes, label)
        }
        // Steady-state frames carry the sine's RMS (0.5 / √2) through the resampler.
        for frame in frames.dropFirst(2) {
          XCTAssertEqual(frame.rms, 0.5 / Float(2).squareRoot(), accuracy: 0.02, label)
        }
      }
    }
  }

  func testStereoHardwareInputIsDownmixedToMono() {
    let format = AVAudioFormat(commonFormat: .pcmFormatFloat32, sampleRate: 48000, channels: 2, interleaved: false)!
    let pipeline = CapturePipeline(converter: CaptureConverter(inputFormat: format)!)
    let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: 4800)!
    buffer.frameLength = 4800
    let sine = Signal.sine(frequency: 500, amplitude: 0.5, sampleRate: 48000, count: 4800)
    for i in 0..<4800 {
      buffer.floatChannelData![0][i] = sine[i]
      buffer.floatChannelData![1][i] = sine[i]
    }
    var frames: [CapturedFrame] = []
    for _ in 0..<10 { frames += pipeline.push(buffer) }
    XCTAssertFalse(frames.isEmpty)
    for frame in frames { XCTAssertEqual(Data(base64Encoded: frame.base64)?.count, PcmCodec.frameBytes) }
  }
}
