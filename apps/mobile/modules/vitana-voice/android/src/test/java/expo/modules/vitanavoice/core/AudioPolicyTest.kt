// VTID-05181 — focus loss ⇒ interruption, route output mapping and preference (plan Change 12).
package expo.modules.vitanavoice.core

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class AudioPolicyTest {
  @Test
  fun everyFocusLossIsAnInterruption() {
    assertEquals("began", FocusPolicy.interruptionFor(FocusPolicy.AUDIOFOCUS_LOSS))
    assertEquals("began", FocusPolicy.interruptionFor(FocusPolicy.AUDIOFOCUS_LOSS_TRANSIENT))
    assertEquals("began", FocusPolicy.interruptionFor(FocusPolicy.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK))
    assertEquals("ended", FocusPolicy.interruptionFor(FocusPolicy.AUDIOFOCUS_GAIN))
    assertNull(FocusPolicy.interruptionFor(0))
  }

  @Test
  fun routeOutputs() {
    assertEquals("speaker", RouteMapper.outputFor(RouteMapper.TYPE_BUILTIN_SPEAKER))
    assertEquals("receiver", RouteMapper.outputFor(RouteMapper.TYPE_BUILTIN_EARPIECE))
    assertEquals("wired", RouteMapper.outputFor(RouteMapper.TYPE_WIRED_HEADSET))
    assertEquals("wired", RouteMapper.outputFor(RouteMapper.TYPE_WIRED_HEADPHONES))
    assertEquals("wired", RouteMapper.outputFor(RouteMapper.TYPE_USB_HEADSET))
    assertEquals("bluetooth", RouteMapper.outputFor(RouteMapper.TYPE_BLUETOOTH_SCO))
    assertEquals("bluetooth", RouteMapper.outputFor(RouteMapper.TYPE_BLE_HEADSET))
    assertEquals("other", RouteMapper.outputFor(null))
    assertEquals("other", RouteMapper.outputFor(9999))
  }

  @Test
  fun speakerByDefaultHeadsetsWin() {
    val speakerAndEarpiece = listOf(RouteMapper.TYPE_BUILTIN_EARPIECE, RouteMapper.TYPE_BUILTIN_SPEAKER)
    assertEquals(1, RouteMapper.preferredCommunicationDevice(speakerAndEarpiece))
    val withWired = speakerAndEarpiece + RouteMapper.TYPE_WIRED_HEADSET
    assertEquals(2, RouteMapper.preferredCommunicationDevice(withWired))
    val withBt = withWired + RouteMapper.TYPE_BLUETOOTH_SCO
    assertEquals(3, RouteMapper.preferredCommunicationDevice(withBt))
    assertEquals(-1, RouteMapper.preferredCommunicationDevice(emptyList()))
    assertEquals(0, RouteMapper.preferredCommunicationDevice(listOf(9999)))
  }

  @Test
  fun scoOnlyForHfp() {
    assertTrue(RouteMapper.wantsBluetoothSco(listOf(RouteMapper.TYPE_BLUETOOTH_SCO, RouteMapper.TYPE_BUILTIN_SPEAKER)))
    assertFalse(RouteMapper.wantsBluetoothSco(listOf(RouteMapper.TYPE_BLUETOOTH_A2DP)))
  }
}
