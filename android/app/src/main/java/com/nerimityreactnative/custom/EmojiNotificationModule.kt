package com.nerimityreactnative.custom

import android.app.PendingIntent
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.text.Spanned
import android.widget.RemoteViews
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import com.nerimityreactnative.R
import java.net.URL

class EmojiNotificationModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val MAX_MESSAGES = 6
        // channel id => list of (body, emojiBitmaps)
        private val messageHistory = mutableMapOf<String, MutableList<MessageEntry>>()
    }

    private data class MessageEntry(
        val body: String,
        val unicodeBody: String,
        val emojiBitmaps: Map<String, Bitmap>
    )

    override fun getName(): String = "EmojiNotificationModule"

    @ReactMethod
    fun displayNotification(params: ReadableMap) {
        val context = reactApplicationContext
        val id = params.getString("id") ?: return
        val title = params.getString("title") ?: ""
        val body = params.getString("body") ?: ""
        val channelId = params.getString("channelId") ?: return
        val largeIconUrl = if (params.hasKey("largeIcon") && !params.isNull("largeIcon")) params.getString("largeIcon") else null
        val circularLargeIcon = if (params.hasKey("circularLargeIcon")) params.getBoolean("circularLargeIcon") else false
        val subText = if (params.hasKey("subText") && !params.isNull("subText")) params.getString("subText") else null
        val fallbackAvatarLetter = if (params.hasKey("fallbackAvatarLetter") && !params.isNull("fallbackAvatarLetter")) params.getString("fallbackAvatarLetter") else null
        val fallbackAvatarColor = if (params.hasKey("fallbackAvatarColor") && !params.isNull("fallbackAvatarColor")) params.getString("fallbackAvatarColor") else null

        val emojis = mutableListOf<EmojiInfo>()
        if (params.hasKey("emojis") && !params.isNull("emojis")) {
            val emojiArray = params.getArray("emojis")
            if (emojiArray != null) {
                for (i in 0 until emojiArray.size()) {
                    val emojiMap = emojiArray.getMap(i)
                    emojis.add(
                        EmojiInfo(
                            placeholder = emojiMap.getString("placeholder") ?: "",
                            url = emojiMap.getString("url") ?: ""
                        )
                    )
                }
            }
        }

        CoroutineScope(Dispatchers.IO).launch {
            val emojiBitmaps = mutableMapOf<String, Bitmap>()
            for (emoji in emojis) {
                try {
                    val bitmap = downloadBitmap(emoji.url)
                    if (bitmap != null) {
                        emojiBitmaps[emoji.placeholder] = bitmap
                    }
                } catch (_: Exception) {}
            }

            var largeIconBitmap: Bitmap? = null
            if (largeIconUrl != null) {
                try {
                    val raw = downloadBitmap(largeIconUrl)
                    if (raw != null) {
                        largeIconBitmap = if (circularLargeIcon) makeCircular(raw) else raw
                    }
                } catch (_: Exception) {}
            }
            if (largeIconBitmap == null && fallbackAvatarLetter != null && fallbackAvatarColor != null) {
                largeIconBitmap = generateLetterAvatar(fallbackAvatarLetter, fallbackAvatarColor)
            }

            // body 
            // unicode emoji fallback (text rendering)
            val unicodeBody = replaceEmojiPlaceholdersWithUnicode(body, emojiBitmaps.keys)

            // add to message history 
            // store unicode body (text fallback) and keep bitmaps (image rendering)
            val history = messageHistory.getOrPut(id) { mutableListOf() }
            history.add(MessageEntry(body, unicodeBody, emojiBitmaps))
            while (history.size > MAX_MESSAGES) {
                history.removeAt(0)
            }

            // build collapsed view => only latest message, single line (+ ellipsis)
            val latestSegments = splitBodyIntoSegments(body, emojiBitmaps.keys)
            val isSingleEmoji = latestSegments.size == 1 && latestSegments[0].isEmoji
            val appPackageName = context.packageName

            val collapsedView = RemoteViews(appPackageName, R.layout.notification_emoji_collapsed)
            collapsedView.setTextViewText(R.id.notification_title, fromHtml(title))
            collapsedView.removeAllViews(R.id.notification_body_row)
            if (isSingleEmoji && emojiBitmaps.containsKey(latestSegments[0].content)) {
                val emojiView = RemoteViews(appPackageName, R.layout.notification_emoji_segment)
                emojiView.setImageViewBitmap(R.id.segment_emoji, emojiBitmaps[latestSegments[0].content])
                collapsedView.addView(R.id.notification_body_row, emojiView)
            } else {
                val textView = RemoteViews(appPackageName, R.layout.notification_text_segment_single)
                textView.setTextViewText(R.id.segment_text_single, fromHtml(unicodeBody))
                collapsedView.addView(R.id.notification_body_row, textView)
            }

            val headsUpView = RemoteViews(appPackageName, R.layout.notification_emoji_collapsed)
            headsUpView.setTextViewText(R.id.notification_title, fromHtml(title))
            headsUpView.removeAllViews(R.id.notification_body_row)
            if (isSingleEmoji && emojiBitmaps.containsKey(latestSegments[0].content)) {
                val emojiView = RemoteViews(appPackageName, R.layout.notification_emoji_segment)
                emojiView.setImageViewBitmap(R.id.segment_emoji, emojiBitmaps[latestSegments[0].content])
                headsUpView.addView(R.id.notification_body_row, emojiView)
            } else {
                val textView = RemoteViews(appPackageName, R.layout.notification_text_segment_single)
                textView.setTextViewText(R.id.segment_text_single, fromHtml(unicodeBody))
                headsUpView.addView(R.id.notification_body_row, textView)
            }

            // build expanded view => complete message history
            val expandedView = buildExpandedRemoteViews(id, title, isSingleEmoji && history.size == 1)

            withContext(Dispatchers.Main) {
                val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
                    ?: Intent()
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
                val pendingIntent = PendingIntent.getActivity(
                    context, id.hashCode(), launchIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )

                val builder = NotificationCompat.Builder(context, channelId)
                    .setSmallIcon(context.resources.getIdentifier("ic_stat_notify", "drawable", context.packageName))
                    .setContentTitle(fromHtml(title))
                    .setContentText(fromHtml(unicodeBody))
                    .setContentIntent(pendingIntent)
                    .setAutoCancel(true)
                    .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                    .setCustomContentView(collapsedView)
                    .setCustomHeadsUpContentView(headsUpView)
                    .setCustomBigContentView(expandedView)
                    .setStyle(NotificationCompat.DecoratedCustomViewStyle())

                if (subText != null) {
                    builder.setSubText(subText)
                }

                if (largeIconBitmap != null) {
                    builder.setLargeIcon(largeIconBitmap)
                }

                try {
                    NotificationManagerCompat.from(context).notify(id.hashCode(), builder.build())
                } catch (_: SecurityException) {}
            }
        }
    }

    private fun buildExpandedRemoteViews(
        channelId: String,
        title: String,
        isSingleEmoji: Boolean
    ): RemoteViews {
        val packageName = reactApplicationContext.packageName
        val expandedView = RemoteViews(packageName, R.layout.notification_emoji_content)
        expandedView.setTextViewText(R.id.notification_title, fromHtml(title))
        expandedView.removeAllViews(R.id.notification_body_row)

        val history = messageHistory[channelId] ?: return expandedView

        for (entry in history) {
            val segments = splitBodyIntoSegments(entry.body, entry.emojiBitmaps.keys)
            val unicodeSegments = splitBodyIntoSegments(entry.unicodeBody, entry.emojiBitmaps.keys)
            val singleEmoji = isSingleEmoji && history.size == 1

            // each message gets own horizontal row
            val rowView = RemoteViews(packageName, R.layout.notification_message_row)
            rowView.removeAllViews(R.id.message_row_content)

            for (i in segments.indices) {
                val segment = segments[i]
                if (segment.isEmoji && entry.emojiBitmaps.containsKey(segment.content)) {
                    val segmentLayoutId = if (singleEmoji) R.layout.notification_emoji_segment_large else R.layout.notification_emoji_segment
                    val emojiView = RemoteViews(packageName, segmentLayoutId)
                    emojiView.setImageViewBitmap(R.id.segment_emoji, entry.emojiBitmaps[segment.content])
                    rowView.addView(R.id.message_row_content, emojiView)
                } else if (segment.content.isNotEmpty()) {
                    val textContent = if (i < unicodeSegments.size && !unicodeSegments[i].isEmoji) unicodeSegments[i].content else segment.content
                    val textView = RemoteViews(packageName, R.layout.notification_text_segment)
                    textView.setTextViewText(R.id.segment_text, fromHtml(textContent))
                    rowView.addView(R.id.message_row_content, textView)
                }
            }

            expandedView.addView(R.id.notification_body_row, rowView)
        }

        return expandedView
    }

    private fun buildBodyRemoteViews(
        layoutId: Int,
        segments: List<Segment>,
        emojiBitmaps: Map<String, Bitmap>,
        isSingleEmoji: Boolean
    ): RemoteViews {
        val packageName = reactApplicationContext.packageName
        val contentView = RemoteViews(packageName, layoutId)

        contentView.removeAllViews(R.id.notification_body_row)

        for (segment in segments) {
            if (segment.isEmoji && emojiBitmaps.containsKey(segment.content)) {
                val segmentLayoutId = if (isSingleEmoji) R.layout.notification_emoji_segment_large else R.layout.notification_emoji_segment
                val emojiView = RemoteViews(packageName, segmentLayoutId)
                emojiView.setImageViewBitmap(R.id.segment_emoji, emojiBitmaps[segment.content])
                contentView.addView(R.id.notification_body_row, emojiView)
            } else if (segment.content.isNotEmpty()) {
                val textView = RemoteViews(packageName, R.layout.notification_text_segment)
                textView.setTextViewText(R.id.segment_text, fromHtml(segment.content))
                contentView.addView(R.id.notification_body_row, textView)
            }
        }

        return contentView
    }

    private fun splitBodyIntoSegments(
        body: String,
        placeholders: Set<String>
    ): List<Segment> {
        if (placeholders.isEmpty()) {
            return listOf(Segment(body, false))
        }

        val segments = mutableListOf<Segment>()
        var remaining = body

        while (remaining.isNotEmpty()) {
            var earliestIndex = Int.MAX_VALUE
            var earliestPlaceholder = ""

            for (placeholder in placeholders) {
                val index = remaining.indexOf(placeholder)
                if (index in 0 until earliestIndex) {
                    earliestIndex = index
                    earliestPlaceholder = placeholder
                }
            }

            if (earliestIndex == Int.MAX_VALUE) {
                segments.add(Segment(remaining, false))
                break
            }

            if (earliestIndex > 0) {
                segments.add(Segment(remaining.substring(0, earliestIndex), false))
            }

            segments.add(Segment(earliestPlaceholder, true))
            remaining = remaining.substring(earliestIndex + earliestPlaceholder.length)
        }

        return segments
    }

    private fun generateLetterAvatar(letter: String, hexColor: String): Bitmap {
        val size = 128
        val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)

        val bgPaint = Paint(Paint.ANTI_ALIAS_FLAG)
        bgPaint.color = try {
            android.graphics.Color.parseColor(hexColor)
        } catch (_: Exception) {
            android.graphics.Color.parseColor("#7c7c7c")
        }
        canvas.drawOval(RectF(0f, 0f, size.toFloat(), size.toFloat()), bgPaint)

        val textPaint = Paint(Paint.ANTI_ALIAS_FLAG)
        textPaint.color = android.graphics.Color.WHITE
        textPaint.textSize = size * 0.45f
        textPaint.textAlign = Paint.Align.CENTER
        textPaint.typeface = android.graphics.Typeface.DEFAULT_BOLD

        val textBounds = android.graphics.Rect()
        textPaint.getTextBounds(letter, 0, letter.length, textBounds)
        val y = size / 2f + textBounds.height() / 2f

        canvas.drawText(letter, size / 2f, y, textPaint)
        return bitmap
    }

    private fun downloadBitmap(url: String): Bitmap? {
        val connection = URL(url).openConnection()
        connection.connectTimeout = 5000
        connection.readTimeout = 5000
        return connection.getInputStream().use { BitmapFactory.decodeStream(it) }
    }

    private fun makeCircular(bitmap: Bitmap): Bitmap {
        val size = minOf(bitmap.width, bitmap.height)
        val output = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(output)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG)
        val rect = RectF(0f, 0f, size.toFloat(), size.toFloat())
        canvas.drawOval(rect, paint)
        paint.xfermode = android.graphics.PorterDuffXfermode(android.graphics.PorterDuff.Mode.SRC_IN)
        canvas.drawBitmap(bitmap, null, rect, paint)
        return output
    }

    @Suppress("DEPRECATION")
    private fun fromHtml(html: String): Spanned {
        return android.text.Html.fromHtml(html, android.text.Html.FROM_HTML_MODE_COMPACT)
    }

    private fun replaceEmojiPlaceholdersWithUnicode(text: String, placeholders: Set<String>): String {
        var result = text
        for (placeholder in placeholders) {
            result = result.replace(placeholder, "\uD83D\uDDBC\uFE0F") // current emoji: 🖼️
        }
        return result
    }

    private data class EmojiInfo(val placeholder: String, val url: String)
    private data class Segment(val content: String, val isEmoji: Boolean)
}
