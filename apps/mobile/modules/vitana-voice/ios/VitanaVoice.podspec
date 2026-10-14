# VTID-05180 — ORB iOS voice module (Expo local module, autolinked from apps/mobile/modules).
# XCTest: `Tests/` (test_spec below, and ios/Package.swift for a plain `xcodebuild test`
# on an iOS simulator). Both need a macOS runner — STATUS row 8b.
Pod::Spec.new do |s|
  s.name           = 'VitanaVoice'
  s.version        = '0.0.0'
  s.summary        = 'Vitana ORB native voice I/O: 16 kHz capture frames and PCM playback on one AVAudioEngine.'
  s.description    = s.summary
  s.author         = 'Exafy'
  s.homepage       = 'https://github.com/exafyltd/vitana-v1'
  s.license        = { :type => 'UNLICENSED' }
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { :git => '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = '*.swift', 'Core/**/*.swift'
  s.exclude_files = 'Tests/**/*', 'Package.swift'

  s.test_spec 'Tests' do |test_spec|
    test_spec.source_files = 'Tests/**/*.swift'
  end
end
