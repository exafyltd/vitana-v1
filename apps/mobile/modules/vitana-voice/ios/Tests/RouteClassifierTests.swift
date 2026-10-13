// VTID-05180 — route-change reporting (plan Change 9, Interfaces `RouteChange`).

import AVFoundation
import XCTest
#if canImport(VitanaVoiceCore)
@testable import VitanaVoiceCore
#else
@testable import VitanaVoice
#endif

final class RouteClassifierTests: XCTestCase {
  func testOutputsMapToTheJsUnion() {
    XCTAssertEqual(RouteClassifier.classify(.builtInSpeaker), .speaker)
    XCTAssertEqual(RouteClassifier.classify(.builtInReceiver), .receiver)
    XCTAssertEqual(RouteClassifier.classify(.headphones), .wired)
    XCTAssertEqual(RouteClassifier.classify(.usbAudio), .wired)
    XCTAssertEqual(RouteClassifier.classify(.bluetoothHFP), .bluetooth)
    XCTAssertEqual(RouteClassifier.classify(.bluetoothA2DP), .bluetooth)
    XCTAssertEqual(RouteClassifier.classify(.airPlay), .other)
    XCTAssertEqual(RouteClassifier.classify(nil), .other)
  }

  func testOwnCategoryChangesNeverTriggerARebuild() {
    XCTAssertFalse(RouteClassifier.requiresRebuild(.categoryChange))
    XCTAssertTrue(RouteClassifier.requiresRebuild(.newDeviceAvailable))
    XCTAssertTrue(RouteClassifier.requiresRebuild(.oldDeviceUnavailable))
    XCTAssertTrue(RouteClassifier.requiresRebuild(.override))
  }

  func testReasonNames() {
    XCTAssertEqual(RouteClassifier.reasonName(.oldDeviceUnavailable), "old_device_unavailable")
    XCTAssertEqual(RouteClassifier.reasonName(.newDeviceAvailable), "new_device_available")
    XCTAssertEqual(RouteClassifier.engineConfigurationChange, "engine_configuration_change")
  }
}
