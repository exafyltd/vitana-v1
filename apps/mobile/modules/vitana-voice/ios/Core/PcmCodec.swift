// VTID-05180 — PCM framing shared with the web widget (plan F1/F2, Change 9).
//
// Same conversions as orb-widget.js:
//   _encodeFrame  clamp to [-1, 1], s < 0 ? s * 0x8000 : s * 0x7FFF, Int16 LE mono
//   playback      Int16 / 32768.0
//   RMS           sqrt(mean(x²)) over the float frame, before Int16 conversion

import Foundation

public enum PcmCodec {
  /// 1024 samples at 16 kHz = 64 ms; 2048 bytes; 2732 base64 characters.
  public static let frameSamples = 1024
  public static let frameBytes = 2048
  public static let frameBase64Length = 2732

  public static func rms(_ samples: [Float]) -> Float {
    guard !samples.isEmpty else { return 0 }
    var sum = 0.0
    for x in samples {
      let d = Double(x)
      sum += d * d
    }
    return Float((sum / Double(samples.count)).squareRoot())
  }

  /// Float → Int16 little-endian, exactly like the widget's `_encodeFrame`.
  /// NaN encodes as 0 (what a JS Int16Array stores for NaN).
  public static func int16Sample(_ x: Float) -> Int16 {
    if x.isNaN { return 0 }
    let c = max(Float(-1), min(Float(1), x))
    let v = c < 0 ? c * 32768 : c * 32767
    return Int16(v) // truncates toward zero, as Int16Array does
  }

  public static func encodeInt16LE(_ samples: [Float]) -> Data {
    var bytes = [UInt8](repeating: 0, count: samples.count * 2)
    for i in 0..<samples.count {
      let u = UInt16(bitPattern: int16Sample(samples[i]))
      bytes[2 * i] = UInt8(u & 0xFF)
      bytes[2 * i + 1] = UInt8(u >> 8)
    }
    return Data(bytes)
  }

  public static func base64Frame(_ samples: [Float]) -> String {
    return encodeInt16LE(samples).base64EncodedString()
  }

  /// Int16 LE → float in [-1, 1). A trailing odd byte is ignored.
  public static func decodeInt16LE(_ data: Data) -> [Float] {
    let count = data.count / 2
    var out = [Float](repeating: 0, count: count)
    data.withUnsafeBytes { (raw: UnsafeRawBufferPointer) in
      for i in 0..<count {
        let lo = UInt16(raw[2 * i])
        let hi = UInt16(raw[2 * i + 1])
        out[i] = Float(Int16(bitPattern: lo | (hi << 8))) / 32768.0
      }
    }
    return out
  }
}

/// Accumulates 16 kHz mono float samples and emits exactly 1024-sample frames,
/// whatever the hardware buffer size was. The remainder waits for the next push.
public final class FrameAssembler {
  public let frameSamples: Int
  private var pending: [Float] = []

  public init(frameSamples: Int = PcmCodec.frameSamples) {
    self.frameSamples = frameSamples
    pending.reserveCapacity(frameSamples * 4)
  }

  public var bufferedSamples: Int { return pending.count }

  public func push(_ samples: [Float]) -> [[Float]] {
    pending.append(contentsOf: samples)
    var frames: [[Float]] = []
    var start = 0
    while pending.count - start >= frameSamples {
      frames.append(Array(pending[start..<(start + frameSamples)]))
      start += frameSamples
    }
    if start > 0 { pending.removeFirst(start) }
    return frames
  }

  public func reset() {
    pending.removeAll(keepingCapacity: true)
  }
}
