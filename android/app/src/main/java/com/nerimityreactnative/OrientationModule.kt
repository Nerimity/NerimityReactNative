package com.nerimityreactnative

import android.content.pm.ActivityInfo
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Small native bridge used by the in-call fullscreen video player.
 *
 * React Native does not ship an orientation API, and adding a new npm
 * dependency is not necessary for three simple calls to the Activity.
 */
class OrientationModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "NerimityOrientation"

  private fun requestOrientation(value: Int) {
    reactApplicationContext.runOnUiQueueThread {
      reactApplicationContext.currentActivity?.requestedOrientation = value
    }
  }

  @ReactMethod
  fun lockLandscape() {
    requestOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE)
  }

  @ReactMethod
  fun lockPortrait() {
    requestOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT)
  }

  /** Restore the system default (auto-rotate) behaviour. */
  @ReactMethod
  fun unlock() {
    requestOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED)
  }
}
