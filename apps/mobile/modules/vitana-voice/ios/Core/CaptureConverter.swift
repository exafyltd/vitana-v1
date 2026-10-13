// VTID-05180 — capture path (plan Change 9):
// input tap at the hardware format → AVAudioConverter to 16 kHz mono float →
// FrameAssembler → exactly 1024-sample frames → RMS (float) + Int16 LE base64.

import AVFoundation

/// Streams hardware-format buffers into 16 kHz mono Float32. One instance per
/// audio graph: the converter keeps its resampler state between buffers, so a
/// stream of odd-sized hardware buffers resamples without seams.
public final class CaptureConverter {
  public static let targetSampleRate: Double = 16000

  public let inputFormat: AVAudioFormat
  public let outputFormat: AVAudioFormat
  private let converter: AVAudioConverter

  public init?(inputFormat: AVAudioFormat) {
    guard inputFormat.sampleRate > 0, inputFormat.channelCount > 0,
          let out = AVAudioFormat(commonFormat: .pcmFormatFloat32,
                                  sampleRate: CaptureConverter.targetSampleRate,
                                  channels: 1, interleaved: false),
          let conv = AVAudioConverter(from: inputFormat, to: out)
    else { return nil }
    if inputFormat.channelCount > 1 { conv.downmix = true }
    self.inputFormat = inputFormat
    self.outputFormat = out
    self.converter = conv
  }

  /// Converts one hardware buffer. Returns the 16 kHz samples available now;
  /// the resampler may hold a few back until the next buffer arrives.
  public func convert(_ buffer: AVAudioPCMBuffer) -> [Float] {
    guard buffer.frameLength > 0 else { return [] }
    let ratio = outputFormat.sampleRate / inputFormat.sampleRate
    let capacity = AVAudioFrameCount((Double(buffer.frameLength) * ratio).rounded(.up)) + 64
    guard let out = AVAudioPCMBuffer(pcmFormat: outputFormat, frameCapacity: capacity) else { return [] }
    var supplied = false
    var error: NSError?
    let status = converter.convert(to: out, error: &error) { _, inputStatus in
      if supplied {
        inputStatus.pointee = .noDataNow
        return nil
      }
      supplied = true
      inputStatus.pointee = .haveData
      return buffer
    }
    guard status != .error, error == nil, let channel = out.floatChannelData else { return [] }
    return Array(UnsafeBufferPointer(start: channel[0], count: Int(out.frameLength)))
  }
}

/// A frame ready for the JS side (`onFrame {b64, rms, ts}`).
public struct CapturedFrame {
  public let base64: String
  public let rms: Float
}

/// Converter + assembler for one audio graph. The tap closure owns one, so a
/// graph rebuild (route change) starts a fresh pipeline without locking.
public final class CapturePipeline {
  private let converter: CaptureConverter
  private let assembler = FrameAssembler()

  public init(converter: CaptureConverter) {
    self.converter = converter
  }

  public func push(_ buffer: AVAudioPCMBuffer) -> [CapturedFrame] {
    return assembler.push(converter.convert(buffer)).map { frame in
      // RMS on the float signal, before the Int16 conversion (same as the widget).
      CapturedFrame(base64: PcmCodec.base64Frame(frame), rms: PcmCodec.rms(frame))
    }
  }
}
