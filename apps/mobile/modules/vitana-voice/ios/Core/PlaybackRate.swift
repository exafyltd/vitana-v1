// VTID-05180 — playback chunks and the two rate modes (plan Change 9, sparring R1-F12).
//
// Server audio is Int16 LE mono at the rate its mime names (24 kHz Nova, 16 kHz
// Polly; F2). Every chunk is converted to one fixed player format, so chunks of
// both rates can share one AVAudioPlayerNode and its connection never changes,
// even across a graph rebuild.
//
// The rate (1.05×, 1.1× for `de`) raises pitch with tempo, like Web Audio
// `playbackRate`:
//   (A) varispeed: chunk converted at its own rate; AVAudioUnitVarispeed.rate = r.
//   (B) resample:  the converter is told the chunk runs at sourceRate × r, so the
//                  buffer already holds the sped-up signal; no varispeed node.
// Both give an audible duration of samples / (sourceRate × r).

import AVFoundation

public enum PlaybackRate {
  /// Fixed player connection format (mono Float32).
  public static let playerSampleRate: Double = 48000
  public static let minRate = 0.5
  public static let maxRate = 2.0

  public static func clamp(_ rate: Double) -> Double {
    guard rate.isFinite else { return 1.0 }
    return min(maxRate, max(minRate, rate))
  }

  /// The sample rate the converter treats the chunk as having.
  public static func converterInputRate(sourceRate: Double, rate: Double, mode: PlaybackRateMode) -> Double {
    return mode == .resample ? sourceRate * clamp(rate) : sourceRate
  }

  /// The varispeed node's rate for a mode (1 in resample mode, where there is no node).
  public static func varispeedRate(rate: Double, mode: PlaybackRateMode) -> Double {
    return mode == .varispeed ? clamp(rate) : 1.0
  }

  /// Seconds the listener hears for a rendered buffer.
  public static func audibleDuration(frames: AVAudioFrameCount, rate: Double, mode: PlaybackRateMode) -> Double {
    return Double(frames) / playerSampleRate / varispeedRate(rate: rate, mode: mode)
  }

  /// The source rate from a server chunk's mime is 16000 or 24000 (F2); anything
  /// else is refused rather than played at a wrong pitch.
  public static func isSupportedSourceRate(_ rate: Double) -> Bool {
    return rate == 16000 || rate == 24000
  }
}

/// Turns decoded chunk samples into player-format buffers.
public final class ChunkRenderer {
  public let playerFormat: AVAudioFormat
  private var converters: [Double: AVAudioConverter] = [:]

  public init?() {
    guard let format = AVAudioFormat(commonFormat: .pcmFormatFloat32,
                                     sampleRate: PlaybackRate.playerSampleRate,
                                     channels: 1, interleaved: false)
    else { return nil }
    playerFormat = format
  }

  public func render(samples: [Float], sourceRate: Double, rate: Double, mode: PlaybackRateMode) -> AVAudioPCMBuffer? {
    guard !samples.isEmpty, PlaybackRate.isSupportedSourceRate(sourceRate) else { return nil }
    let inRate = PlaybackRate.converterInputRate(sourceRate: sourceRate, rate: rate, mode: mode)
    guard let inFormat = AVAudioFormat(commonFormat: .pcmFormatFloat32, sampleRate: inRate,
                                       channels: 1, interleaved: false),
          let input = AVAudioPCMBuffer(pcmFormat: inFormat, frameCapacity: AVAudioFrameCount(samples.count)),
          let channel = input.floatChannelData,
          let converter = converter(from: inFormat)
    else { return nil }
    input.frameLength = AVAudioFrameCount(samples.count)
    samples.withUnsafeBufferPointer { src in
      channel[0].update(from: src.baseAddress!, count: samples.count)
    }
    let capacity = AVAudioFrameCount((Double(samples.count) * playerFormat.sampleRate / inRate).rounded(.up)) + 64
    guard let output = AVAudioPCMBuffer(pcmFormat: playerFormat, frameCapacity: capacity) else { return nil }
    // One-shot conversion: the chunk is the whole stream, so flush the tail.
    converter.reset()
    var supplied = false
    var error: NSError?
    let status = converter.convert(to: output, error: &error) { _, inputStatus in
      if supplied {
        inputStatus.pointee = .endOfStream
        return nil
      }
      supplied = true
      inputStatus.pointee = .haveData
      return input
    }
    guard status != .error, error == nil, output.frameLength > 0 else { return nil }
    return output
  }

  private func converter(from format: AVAudioFormat) -> AVAudioConverter? {
    if let cached = converters[format.sampleRate] { return cached }
    guard let created = AVAudioConverter(from: format, to: playerFormat) else { return nil }
    converters[format.sampleRate] = created
    return created
  }
}
