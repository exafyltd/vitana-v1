// VTID-05180 — AEC path selection (plan Change 9 / Change 10, sparring R1-F3).

import XCTest
#if canImport(VitanaVoiceCore)
@testable import VitanaVoiceCore
#else
@testable import VitanaVoice
#endif

final class SpyVoiceProcessing: VoiceProcessingControl {
  var calls = 0
  var fails = false

  func enableVoiceProcessing() throws {
    calls += 1
    if fails { throw NSError(domain: "VitanaVoiceTests", code: 1) }
  }
}

private func iOSVersion(_ major: Int, _ minor: Int) -> OperatingSystemVersion {
  return OperatingSystemVersion(majorVersion: major, minorVersion: minor, patchVersion: 0)
}

final class AecPathTests: XCTestCase {
  func testSelectsTheEngineVoiceProcessingPathOnIOS17AndLater() {
    for version in [iOSVersion(17, 0), iOSVersion(17, 4), iOSVersion(18, 2), iOSVersion(26, 0)] {
      XCTAssertEqual(AecPathSelector.select(for: version), .vpioEngine, "\(version)")
    }
  }

  func testSelectsTheSessionVoiceChatPathBelowIOS17() {
    for version in [iOSVersion(16, 4), iOSVersion(16, 5), iOSVersion(16, 7)] {
      XCTAssertEqual(AecPathSelector.select(for: version), .sessionVoiceChat, "\(version)")
    }
  }

  func testTheIOS16PathNeverCallsTheEngineVoiceProcessingAPI() {
    for version in [iOSVersion(16, 4), iOSVersion(16, 7)] {
      let spy = SpyVoiceProcessing()
      let applied = AecPathSelector.apply(AecPathSelector.select(for: version), control: spy)
      XCTAssertEqual(applied, .sessionVoiceChat)
      XCTAssertEqual(spy.calls, 0, "setVoiceProcessingEnabled must not be called on \(version)")
    }
  }

  func testTheIOS17PathEnablesVoiceProcessingOnce() {
    let spy = SpyVoiceProcessing()
    XCTAssertEqual(AecPathSelector.apply(AecPathSelector.select(for: iOSVersion(17, 0)), control: spy), .vpioEngine)
    XCTAssertEqual(spy.calls, 1)
  }

  func testAFailedEnableReportsNoEchoCancellation() {
    let spy = SpyVoiceProcessing()
    spy.fails = true
    let applied = AecPathSelector.apply(.vpioEngine, control: spy)
    XCTAssertEqual(applied, .none)
    let caps = VoiceCapabilities.make(path: applied)
    XCTAssertFalse(caps.aec)
    XCTAssertFalse(caps.fullDuplexSafe)
    XCTAssertEqual(caps.aecPath.rawValue, "none")
  }

  func testRunningOSSelectionAgreesWithTheAvailabilityGuard() {
    if #available(iOS 17, *) {
      XCTAssertEqual(AecPathSelector.selectForRunningOS(), .vpioEngine)
    } else {
      XCTAssertEqual(AecPathSelector.selectForRunningOS(), .sessionVoiceChat)
    }
  }
}

final class VoiceCapabilitiesTests: XCTestCase {
  func testTheIOS16PathIsNotFullDuplexSafeUntilVerified() {
    XCTAssertFalse(IOS16_FULL_DUPLEX_VERIFIED, "promote only with a passing 16.x echo bench in the device checklist")
    XCTAssertFalse(VoiceCapabilities.make(path: .sessionVoiceChat).fullDuplexSafe)
    XCTAssertTrue(VoiceCapabilities.make(path: .sessionVoiceChat, ios16Verified: true).fullDuplexSafe)
  }

  func testTheIOS17PathIsFullDuplexSafeWithVoiceProcessing() {
    let caps = VoiceCapabilities.make(path: .vpioEngine)
    XCTAssertTrue(caps.fullDuplexSafe)
    XCTAssertTrue(caps.voiceProcessing)
    XCTAssertTrue(caps.aec)
  }

  func testTheIOS16PathReportsNoEngineVoiceProcessing() {
    let caps = VoiceCapabilities.make(path: .sessionVoiceChat)
    XCTAssertFalse(caps.voiceProcessing)
    XCTAssertEqual(caps.aecPath.rawValue, "session-voicechat")
  }

  func testVarispeedIsTheDefaultRateMode() {
    XCTAssertEqual(PLAYBACK_RATE_MODE, .varispeed)
    XCTAssertEqual(VoiceCapabilities.make(path: .vpioEngine).playbackRateMode, .varispeed)
    XCTAssertEqual(VoiceCapabilities.make(path: .vpioEngine, rateMode: .resample).playbackRateMode, .resample)
  }

  func testDictionaryHasExactlyTheJsInterfaceFields() {
    let dict = VoiceCapabilities.make(path: .vpioEngine).dictionary
    XCTAssertEqual(Set(dict.keys),
                   ["aec", "ns", "agc", "voiceProcessing", "aecPath", "fullDuplexSafe", "playbackRateMode"])
    XCTAssertEqual(dict["aecPath"] as? String, "vpio-engine")
    XCTAssertEqual(dict["playbackRateMode"] as? String, "varispeed")
    XCTAssertEqual(dict["fullDuplexSafe"] as? Bool, true)
  }
}
