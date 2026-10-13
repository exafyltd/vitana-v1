// VTID-05180 — `onRouteChange {reason, output}` values (plan Change 9, Interfaces).

import AVFoundation

/// Values match the JS `RouteChange.output` union.
public enum RouteOutput: String {
  case speaker, receiver, wired, bluetooth, other
}

public enum RouteClassifier {
  public static func classify(_ port: AVAudioSession.Port?) -> RouteOutput {
    guard let port = port else { return .other }
    switch port {
    case .builtInSpeaker:
      return .speaker
    case .builtInReceiver:
      return .receiver
    case .headphones, .headsetMic, .lineOut, .usbAudio:
      return .wired
    case .bluetoothHFP, .bluetoothA2DP, .bluetoothLE:
      return .bluetooth
    default:
      return .other
    }
  }

  /// Route-change reasons that rebuild the graph. `.categoryChange` is left out:
  /// the engine's own setCategory posts it, and rebuilding on it would loop.
  public static func requiresRebuild(_ reason: AVAudioSession.RouteChangeReason) -> Bool {
    switch reason {
    case .newDeviceAvailable, .oldDeviceUnavailable, .override, .wakeFromSleep,
         .noSuitableRouteForCategory, .routeConfigurationChange:
      return true
    default:
      return false
    }
  }

  public static func reasonName(_ reason: AVAudioSession.RouteChangeReason) -> String {
    switch reason {
    case .newDeviceAvailable: return "new_device_available"
    case .oldDeviceUnavailable: return "old_device_unavailable"
    case .categoryChange: return "category_change"
    case .override: return "override"
    case .wakeFromSleep: return "wake_from_sleep"
    case .noSuitableRouteForCategory: return "no_suitable_route"
    case .routeConfigurationChange: return "route_configuration_change"
    default: return "unknown"
    }
  }

  /// Reason reported when AVAudioEngine itself posts a configuration change.
  public static let engineConfigurationChange = "engine_configuration_change"
}
