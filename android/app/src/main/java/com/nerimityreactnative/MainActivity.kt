package com.nerimityreactnative

import android.content.Intent
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.nerimityreactnative.custom.EmojiNotificationModule

class MainActivity : ReactActivity() {

  override fun getMainComponentName(): String = "NerimityReactNative"

  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  // called when app is launched from dead state via notification tap
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    intent?.let { EmojiNotificationModule.storeNotificationData(it) }
  }

  // called when app is already running (background) and notification is tapped
  override fun onNewIntent(intent: Intent?) {
    super.onNewIntent(intent)
    intent?.let { EmojiNotificationModule.storeNotificationData(it) }
  }
}