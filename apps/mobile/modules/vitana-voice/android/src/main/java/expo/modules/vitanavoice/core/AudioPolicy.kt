// VTID-05181 — audio focus, route and lifecycle decisions (plan Change 12). Pure Kotlin: the
// platform constants are copied here and pinned to android.media by the Robolectric tests.
package expo.modules.vitanavoice.core

/**
 * Audio focus: the session holds AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE. Any loss — a call, the
 * assistant, another app, even a duck request — is an interruption: playback and capture stop
 * and TS ends the session (conservative, like the widget's background stop, plan F9 / open
 * question 4). Regaining focus is reported but never resumes a session.
 */
object FocusPolicy {
  const val AUDIOFOCUS_GAIN = 1
  const val AUDIOFOCUS_GAIN_TRANSIENT = 2
  const val AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE = 4
  const val AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK = 3
  const val AUDIOFOCUS_LOSS = -1
  const val AUDIOFOCUS_LOSS_TRANSIENT = -2
  const val AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK = -3

  const val BEGAN = "began"
  const val ENDED = "ended"

  /** The `onInterruption.kind` for a focus change, or null when it is not an interruption edge. */
  fun interruptionFor(focusChange: Int): String? = when (focusChange) {
    AUDIOFOCUS_LOSS, AUDIOFOCUS_LOSS_TRANSIENT, AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK -> BEGAN
    AUDIOFOCUS_GAIN, AUDIOFOCUS_GAIN_TRANSIENT, AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE, AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK -> ENDED
    else -> null
  }
}

/** AudioDeviceInfo types (android.media.AudioDeviceInfo.TYPE_*) → `RouteChange.output`. */
object RouteMapper {
  const val TYPE_BUILTIN_EARPIECE = 1
  const val TYPE_BUILTIN_SPEAKER = 2
  const val TYPE_WIRED_HEADSET = 3
  const val TYPE_WIRED_HEADPHONES = 4
  const val TYPE_BLUETOOTH_SCO = 7
  const val TYPE_BLUETOOTH_A2DP = 8
  const val TYPE_USB_DEVICE = 11
  const val TYPE_USB_HEADSET = 22
  const val TYPE_HEARING_AID = 23
  const val TYPE_BLE_HEADSET = 26
  const val TYPE_BLE_SPEAKER = 27

  const val SPEAKER = "speaker"
  const val RECEIVER = "receiver"
  const val WIRED = "wired"
  const val BLUETOOTH = "bluetooth"
  const val OTHER = "other"

  fun outputFor(deviceType: Int?): String = when (deviceType) {
    TYPE_BUILTIN_SPEAKER -> SPEAKER
    TYPE_BUILTIN_EARPIECE -> RECEIVER
    TYPE_WIRED_HEADSET, TYPE_WIRED_HEADPHONES, TYPE_USB_HEADSET, TYPE_USB_DEVICE -> WIRED
    TYPE_BLUETOOTH_SCO, TYPE_BLUETOOTH_A2DP, TYPE_BLE_HEADSET, TYPE_BLE_SPEAKER, TYPE_HEARING_AID -> BLUETOOTH
    else -> OTHER
  }

  /**
   * Communication device to select (API 31+ setCommunicationDevice) from the candidates the
   * platform offers: a Bluetooth HFP / LE headset when connected, then a wired headset, then
   * the loudspeaker (speaker by default — the ORB is a hands-free surface), never the earpiece
   * unless nothing else exists. Returns the index into [types], or -1.
   */
  fun preferredCommunicationDevice(types: List<Int>): Int {
    val order = listOf(
      TYPE_BLUETOOTH_SCO, TYPE_BLE_HEADSET, TYPE_WIRED_HEADSET, TYPE_USB_HEADSET,
      TYPE_WIRED_HEADPHONES, TYPE_BUILTIN_SPEAKER, TYPE_BUILTIN_EARPIECE,
    )
    for (t in order) {
      val i = types.indexOf(t)
      if (i >= 0) return i
    }
    return if (types.isEmpty()) -1 else 0
  }

  /** Below API 31: route to Bluetooth SCO when an HFP device is connected. */
  fun wantsBluetoothSco(connectedTypes: Collection<Int>): Boolean = TYPE_BLUETOOTH_SCO in connectedTypes
}

/** Why a route change was reported (`RouteChange.reason`). */
object RouteReason {
  const val DEVICE_ADDED = "device_added"
  const val DEVICE_REMOVED = "device_removed"
  const val HEADSET_PLUG = "headset_plug"
  const val SCO_STATE = "bluetooth_sco"
}
