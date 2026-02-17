package com.nerimityreactnative.custom

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class NotificationDismissReceiver : BroadcastReceiver() {
    companion object {
        const val EXTRA_CHANNEL_ID = "notification_channel_id"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val channelId = intent.getStringExtra(EXTRA_CHANNEL_ID) ?: return
        EmojiNotificationModule.clearHistory(channelId)
    }
}
