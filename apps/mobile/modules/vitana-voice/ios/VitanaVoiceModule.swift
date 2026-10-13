// VTID-05180 — Expo module bridge for the ORB iOS voice engine (plan Change 9,
// Interfaces). The JS side is apps/mobile/modules/vitana-voice/src/VitanaVoice.ts;
// names here are checked against it by tests/vitana-voice/native-contract.test.ts.

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
