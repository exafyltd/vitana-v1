// VTID-05180 — ORB iOS voice module (N6b), plan Change 9 / sparring R1-F3.
//
// Echo cancellation is chosen at run time. The app's minimum OS stays iOS 16.4
// (a program decision, not N6's), so the engine-level voice-processing call is
// only ever made behind `if #available(iOS 17, *)`:
//
//   iOS 17+       `vpio-engine`        inputNode.setVoiceProcessingEnabled(true)
//   iOS 16.4–16.x `session-voicechat`  AVAudioSession .playAndRecord + .voiceChat only
//
// The decision itself (which path, and what it means for full duplex) lives
// here, free of the engine, so XCTest can drive it with any OS version.

import Foundation

/// Values match the JS interface (`aecPath` in `getCapabilities()`).
public enum AecPath: String {
  case vpioEngine = "vpio-engine"
  case sessionVoiceChat = "session-voicechat"
  case none = "none"
}

/// Promotion flag for the iOS 16.4–16.x path. It stays `false` until the echo
/// bench has passed on a 16.x device at 1.0×, 1.05× and 1.1× and the result is
/// recorded in `docs/validation/<VTID>/device-checklist.md`. While it is false,
/// `fullDuplexSafe` is false on 16.x and the TS client runs half duplex there
/// (plan Change 5), whatever the server's `full_duplex` says.
public let IOS16_FULL_DUPLEX_VERIFIED = false

/// The one engine call that turns on the voice-processing I/O unit. Injected so
/// tests can prove it is never called on the 16.x path.
public protocol VoiceProcessingControl {
  func enableVoiceProcessing() throws
}

public enum AecPathSelector {
  /// Pure selection for an OS version (injectable in tests).
  public static func select(for os: OperatingSystemVersion) -> AecPath {
    return os.majorVersion >= 17 ? .vpioEngine : .sessionVoiceChat
  }

  /// Selection for the running OS. Uses the compiler's availability check so the
  /// answer can never disagree with the guard around the iOS 17 call.
  public static func selectForRunningOS() -> AecPath {
    if #available(iOS 17, *) {
      return .vpioEngine
    }
    return .sessionVoiceChat
  }

  /// Applies a selected path and returns the path actually in effect.
  /// Only `vpio-engine` touches `control`; a failure there reports `none`
  /// (no echo cancellation we can vouch for ⇒ `fullDuplexSafe` false).
  public static func apply(_ path: AecPath, control: VoiceProcessingControl) -> AecPath {
    switch path {
    case .vpioEngine:
      do {
        try control.enableVoiceProcessing()
        return .vpioEngine
      } catch {
        return .none
      }
    case .sessionVoiceChat:
      // Voice processing is requested through the audio session's .voiceChat
      // mode (configured by VoiceEngine for every path); nothing to call here.
      return .sessionVoiceChat
    case .none:
      return .none
    }
  }
}
