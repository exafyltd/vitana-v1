// VTID-05182 (N6d) — the read of fixtures/duplex-gate-vectors.json that N6b deferred
// until N6a committed the file (scripts/native/orb-parity.mjs --write-vectors, from
// the platform's own gate). The gate's decisions live in TypeScript (plan Change 1);
// natively we only check that the RMS the module reports for a known frame is the
// RMS the platform computed for it (plan Change 10: "Reads duplex-gate-vectors.json
// only for RMS inputs").
//
// Runs on a macOS runner (STATUS row 8b). The file is found relative to this source
// file, so it works from the Swift package (ios/Package.swift) and from the pod's
// test spec alike.

import Foundation
import XCTest
#if canImport(VitanaVoiceCore)
@testable import VitanaVoiceCore
#else
@testable import VitanaVoice
#endif

final class DuplexGateVectorsTests: XCTestCase {
  private struct SignalVector {
    let amplitude: Double
    let freqHz: Double
    let sampleRate: Double
    let samples: Int
    let rms: Double
  }

  private func vectorsURL() -> URL {
    // ios/Tests/DuplexGateVectorsTests.swift → ../../fixtures/duplex-gate-vectors.json
    return URL(fileURLWithPath: #filePath)
      .deletingLastPathComponent()
      .deletingLastPathComponent()
      .deletingLastPathComponent()
      .appendingPathComponent("fixtures/duplex-gate-vectors.json")
  }

  private func loadVectors() throws -> [String: Any] {
    let data = try Data(contentsOf: vectorsURL())
    return try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any], "vectors file is not a JSON object")
  }

  private func signalVectors() throws -> [SignalVector] {
    let json = try loadVectors()
    let list = try XCTUnwrap(json["signals"] as? [[String: Any]], "vectors file has no `signals` — the fixture format changed")
    return try list.map { s in
      SignalVector(
        amplitude: try XCTUnwrap((s["amplitude"] as? NSNumber)?.doubleValue),
        freqHz: try XCTUnwrap((s["freqHz"] as? NSNumber)?.doubleValue),
        sampleRate: try XCTUnwrap((s["sampleRate"] as? NSNumber)?.doubleValue),
        samples: try XCTUnwrap((s["samples"] as? NSNumber)?.intValue),
        rms: try XCTUnwrap((s["rms"] as? NSNumber)?.doubleValue)
      )
    }
  }

  func testTheVectorsFileDescribesTheWireFrame() throws {
    let json = try loadVectors()
    XCTAssertEqual((json["frameSamples"] as? NSNumber)?.intValue, PcmCodec.frameSamples)
    XCTAssertEqual((json["sampleRate"] as? NSNumber)?.doubleValue, CaptureConverter.targetSampleRate)
    XCTAssertFalse(try signalVectors().isEmpty)
  }

  /// RMS is computed on the float signal before Int16 conversion (widget definition), so it
  /// matches the platform's value within 1e-6.
  func testFloatRmsMatchesThePlatformForEverySignal() throws {
    for v in try signalVectors() {
      XCTAssertEqual(v.samples, PcmCodec.frameSamples)
      let frame = Signal.sine(frequency: v.freqHz, amplitude: Float(v.amplitude), sampleRate: v.sampleRate, count: v.samples)
      XCTAssertEqual(Double(PcmCodec.rms(frame)), v.rms, accuracy: 1e-6, "\(v.amplitude) @ \(v.freqHz) Hz")
    }
  }

  /// The encoded wire frame is 2048 bytes and, decoded again, keeps that RMS within two Int16 steps
  /// (encode truncates; decode divides by 32768 for both signs).
  func testEncodedFramesKeepThePlatformRms() throws {
    for v in try signalVectors() {
      let frame = Signal.sine(frequency: v.freqHz, amplitude: Float(v.amplitude), sampleRate: v.sampleRate, count: v.samples)
      let wire = PcmCodec.encodeInt16LE(frame)
      XCTAssertEqual(wire.count, PcmCodec.frameBytes)
      XCTAssertEqual(PcmCodec.base64Frame(frame).count, PcmCodec.frameBase64Length)
      let decoded = PcmCodec.decodeInt16LE(wire)
      XCTAssertEqual(Double(PcmCodec.rms(decoded)), v.rms, accuracy: 2.0 / 32767, "\(v.amplitude) @ \(v.freqHz) Hz")
    }
  }
}
