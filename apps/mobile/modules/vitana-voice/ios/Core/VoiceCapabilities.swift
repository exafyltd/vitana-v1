// VTID-05180 — what `getCapabilities()` reports on iOS (plan Change 9, Interfaces).

import Foundation

/// How the 1.05× / 1.1× playback rate is applied (plan Change 9, sparring R1-F12).
///   varispeed (A, default): AVAudioUnitVarispeed between the player and the mixer.
///   resample  (B):          each chunk is resampled by the rate factor before it is
///                           scheduled, so the render path echo cancellation
///                           references is a plain player into the mixer.
/// Duration and pitch are the same in both modes (XCTest `PlaybackRateTests`).
public enum PlaybackRateMode: String {
  case varispeed
  case resample
}

/// Switch to `.resample` only when the device checklist shows gate openings at
/// 1.05× / 1.1× with a clean 1.0× run on a path; record the change there.
public let PLAYBACK_RATE_MODE: PlaybackRateMode = .varispeed

public struct VoiceCapabilities: Equatable {
  /// Echo cancellation, noise suppression and gain control were requested from
  /// the OS on this path. On `session-voicechat` that is the session's
  /// .voiceChat mode, whose effect on the engine is what the echo bench measures.
  public let aec: Bool
  public let ns: Bool
  public let agc: Bool
  /// The engine's voice-processing I/O unit is on (iOS 17+ path only).
  public let voiceProcessing: Bool
  public let aecPath: AecPath
  /// false ⇒ the TS client runs half duplex (plan Change 5).
  public let fullDuplexSafe: Bool
  public let playbackRateMode: PlaybackRateMode

  public static func make(
    path: AecPath,
    ios16Verified: Bool = IOS16_FULL_DUPLEX_VERIFIED,
    rateMode: PlaybackRateMode = PLAYBACK_RATE_MODE
  ) -> VoiceCapabilities {
    switch path {
    case .vpioEngine:
      return VoiceCapabilities(aec: true, ns: true, agc: true, voiceProcessing: true,
                               aecPath: path, fullDuplexSafe: true, playbackRateMode: rateMode)
    case .sessionVoiceChat:
      return VoiceCapabilities(aec: true, ns: true, agc: true, voiceProcessing: false,
                               aecPath: path, fullDuplexSafe: ios16Verified, playbackRateMode: rateMode)
    case .none:
      return VoiceCapabilities(aec: false, ns: false, agc: false, voiceProcessing: false,
                               aecPath: path, fullDuplexSafe: false, playbackRateMode: rateMode)
    }
  }

  /// The shape the JS facade validates (`normaliseCapabilities`).
  public var dictionary: [String: Any] {
    return [
      "aec": aec,
      "ns": ns,
      "agc": agc,
      "voiceProcessing": voiceProcessing,
      "aecPath": aecPath.rawValue,
      "fullDuplexSafe": fullDuplexSafe,
      "playbackRateMode": playbackRateMode.rawValue,
    ]
  }
}
