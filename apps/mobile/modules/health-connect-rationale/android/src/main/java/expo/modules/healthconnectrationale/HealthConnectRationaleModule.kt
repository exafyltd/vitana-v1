// VTID-05184 — Health Connect rationale hand-off (N5a plan change 11).
// Reports the action of the intent that launched the main activity, so JS can
// route ACTION_SHOW_PERMISSIONS_RATIONALE / VIEW_PERMISSION_USAGE to /privacy.
// No user-visible text here.
package expo.modules.healthconnectrationale

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class HealthConnectRationaleModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("HealthConnectRationale")

    Function("getLaunchAction") {
      appContext.currentActivity?.intent?.action
    }
  }
}
