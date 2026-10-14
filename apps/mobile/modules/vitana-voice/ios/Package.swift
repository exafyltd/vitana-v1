// swift-tools-version:5.9
// VTID-05180 — the engine-independent core of the ORB iOS voice module, as a
// Swift package so its XCTest suite runs without a generated Xcode project:
//
//   cd apps/mobile/modules/vitana-voice/ios
//   xcodebuild test -scheme VitanaVoiceCore -destination 'platform=iOS Simulator,name=iPhone 15'
//
// Needs a macOS runner (STATUS row 8b). The Expo glue (VitanaVoiceModule.swift)
// and the AVAudioEngine wiring (VoiceEngine.swift) are not in this package; they
// are verified by the device checklist (echo bench, fake gateway).
import PackageDescription

let package = Package(
  name: "VitanaVoiceCore",
  platforms: [.iOS("16.4")],
  products: [
    .library(name: "VitanaVoiceCore", targets: ["VitanaVoiceCore"]),
  ],
  targets: [
    .target(name: "VitanaVoiceCore", path: "Core"),
    .testTarget(name: "VitanaVoiceCoreTests", dependencies: ["VitanaVoiceCore"], path: "Tests"),
  ]
)
