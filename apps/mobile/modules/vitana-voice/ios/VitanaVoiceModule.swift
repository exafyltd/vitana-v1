// VTID-05180 — Expo module bridge for the ORB iOS voice engine (plan Change 9,
// Interfaces). The JS side is apps/mobile/modules/vitana-voice/src/VitanaVoice.ts;
// names here are checked against it by tests/vitana-voice/native-contract.test.ts.

import AVFoundation
import ExpoModulesCore

struct VitanaVoiceStartOptions: Record {
  @Field var leadFirstOnly: Bool = false
  @Field var playbackRate: Double = 1.0
}

public class VitanaVoiceModule: Module {
  private var engine: VoiceEngine?

  public func definition() -> ModuleDefinition {
    Name("VitanaVoice")

    Events("onFrame", "onPlaybackState", "onInterruption", "onRouteChange", "onBackground")

    OnCreate {
      self.engine = VoiceEngine(sink: self.makeSink())
    }

    OnDestroy {
      self.engine?.stop()
    }

    AsyncFunction("start") { (options: VitanaVoiceStartOptions) throws -> Void in
      try self.requireEngine().start(leadFirstOnly: options.leadFirstOnly, playbackRate: options.playbackRate)
    }

    AsyncFunction("stop") { () -> Void in
      self.engine?.stop()
    }

    Function("enqueue") { (b64: String, sampleRate: Double) throws -> Void in
      try self.requireEngine().enqueue(b64: b64, sampleRate: sampleRate)
    }

    Function("stopPlayback") { () -> Void in
      self.engine?.stopPlayback()
    }

    Function("setPlaybackRate") { (rate: Double) -> Void in
      self.engine?.setPlaybackRate(rate)
    }

    AsyncFunction("getCapabilities") { () throws -> [String: Any] in
      return try self.requireEngine().capabilities()
    }

    // VTID-05182 (N6d, plan Change 16): the app shows its in-app rationale
    // first and asks the OS only after that. Same answer shape as Expo's
    // permission modules ({ status, granted, canAskAgain, expires }).
    AsyncFunction("getMicrophonePermission") { () -> [String: Any] in
      return MicrophonePermission.response(AVAudioSession.sharedInstance().recordPermission)
    }

    AsyncFunction("requestMicrophonePermission") { (promise: Promise) in
      AVAudioSession.sharedInstance().requestRecordPermission { _ in
        promise.resolve(MicrophonePermission.response(AVAudioSession.sharedInstance().recordPermission))
      }
    }
  }

  private func requireEngine() throws -> VoiceEngine {
    guard let engine = engine else { throw VoiceEngineError.notRunning }
    return engine
  }

  private func makeSink() -> VoiceEngine.Sink {
    return VoiceEngine.Sink(
      frame: { [weak self] b64, rms, ts in
        self?.sendEvent("onFrame", ["b64": b64, "rms": Double(rms), "ts": ts])
      },
      playbackState: { [weak self] playing, startedAt in
        self?.sendEvent("onPlaybackState", ["playing": playing, "startedAt": startedAt])
      },
      interruption: { [weak self] kind in
        self?.sendEvent("onInterruption", ["kind": kind])
      },
      routeChange: { [weak self] reason, output in
        self?.sendEvent("onRouteChange", ["reason": reason, "output": output])
      },
      background: { [weak self] in
        self?.sendEvent("onBackground", [:])
      }
    )
  }
}

/// VTID-05182 — AVAudioSession record permission → the JS `MicPermission` shape.
/// iOS asks once: after a denial only the Settings app can grant it.
enum MicrophonePermission {
  static func response(_ permission: AVAudioSession.RecordPermission) -> [String: Any] {
    switch permission {
    case .granted:
      return ["status": "granted", "granted": true, "canAskAgain": true, "expires": "never"]
    case .denied:
      return ["status": "denied", "granted": false, "canAskAgain": false, "expires": "never"]
    default:
      return ["status": "undetermined", "granted": false, "canAskAgain": true, "expires": "never"]
    }
  }
}
