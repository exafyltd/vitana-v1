// VTID-05181 — the `VitanaVoice` Expo module on Android. Same JS API as iOS (plan
// Interfaces, apps/mobile/modules/vitana-voice/src/VitanaVoice.ts). Thin: it forwards to
// VoiceEngine and turns engine callbacks into JS events.
package expo.modules.vitanavoice

import android.Manifest
import expo.modules.interfaces.permissions.Permissions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import expo.modules.vitanavoice.core.EncodedFrame
import expo.modules.vitanavoice.core.PlaybackState

class StartOptions : Record {
  @Field
  var leadFirstOnly: Boolean = false

  @Field
  var playbackRate: Double = 1.05
}

class VoiceStartException(cause: Throwable) : CodedException(cause.message ?: "voice engine failed to start", cause)

class VoiceEnqueueException(cause: Throwable) : CodedException(cause.message ?: "enqueue failed", cause)

object VoiceEvents {
  const val FRAME = "onFrame"
  const val PLAYBACK_STATE = "onPlaybackState"
  const val INTERRUPTION = "onInterruption"
  const val ROUTE_CHANGE = "onRouteChange"
  const val BACKGROUND = "onBackground"
  val ALL = arrayOf(FRAME, PLAYBACK_STATE, INTERRUPTION, ROUTE_CHANGE, BACKGROUND)
}

class VitanaVoiceModule : Module() {
  private var engine: VoiceEngine? = null

  private fun engine(): VoiceEngine {
    engine?.let { return it }
    val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
    val created = VoiceEngine(context.applicationContext, EventBridge())
    engine = created
    return created
  }

  private inner class EventBridge : VoiceEngine.Listener {
    override fun onFrame(frame: EncodedFrame) = sendEvent(VoiceEvents.FRAME, frame.toMap())

    override fun onPlaybackState(state: PlaybackState) = sendEvent(VoiceEvents.PLAYBACK_STATE, state.toMap())

    override fun onInterruption(kind: String) = sendEvent(VoiceEvents.INTERRUPTION, mapOf("kind" to kind))

    override fun onRouteChange(reason: String, output: String) =
      sendEvent(VoiceEvents.ROUTE_CHANGE, mapOf("reason" to reason, "output" to output))

    override fun onBackground() = sendEvent(VoiceEvents.BACKGROUND, emptyMap<String, Any?>())
  }

  override fun definition() = ModuleDefinition {
    Name("VitanaVoice")

    Events(*VoiceEvents.ALL)

    AsyncFunction("start") { opts: StartOptions ->
      try {
        engine().start(opts.leadFirstOnly, opts.playbackRate)
      } catch (e: RuntimeException) {
        throw VoiceStartException(e)
      }
    }

    AsyncFunction("stop") {
      engine?.stop()
    }

    Function("enqueue") { b64: String, sampleRate: Int ->
      try {
        engine().enqueue(b64, sampleRate)
      } catch (e: RuntimeException) {
        throw VoiceEnqueueException(e)
      }
    }

    Function("stopPlayback") {
      engine?.stopPlayback()
    }

    Function("setPlaybackRate") { rate: Double ->
      engine().setPlaybackRate(rate)
    }

    AsyncFunction("getCapabilities") {
      engine().capabilities().toMap()
    }

    // VTID-05182 (N6d, plan Change 16): RECORD_AUDIO is asked only after the
    // app's in-app rationale. Expo's permission manager answers
    // { status, granted, canAskAgain, expires }, the same shape as iOS.
    AsyncFunction("getMicrophonePermission") { promise: Promise ->
      Permissions.getPermissionsWithPermissionsManager(appContext.permissions, promise, Manifest.permission.RECORD_AUDIO)
    }

    AsyncFunction("requestMicrophonePermission") { promise: Promise ->
      Permissions.askForPermissionsWithPermissionsManager(appContext.permissions, promise, Manifest.permission.RECORD_AUDIO)
    }

    OnDestroy {
      engine?.stop()
      engine = null
    }
  }
}
