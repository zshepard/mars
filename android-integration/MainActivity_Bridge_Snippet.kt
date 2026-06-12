package com.mars.app

// ─────────────────────────────────────────────────────────────────────────────
//  MARS WebView Bridge — MainActivity integration snippet
//
//  Add MarsWebAppInterface to your WebView setup in MainActivity.kt:
//
//    webView.addJavascriptInterface(MarsWebAppInterface(this), "ReactNativeWebView")
//
//  This intercepts all postMessage calls from the MARS web app (marsBridge.js)
//  and routes them to the correct Android service or scheduler.
// ─────────────────────────────────────────────────────────────────────────────

import android.content.Context
import android.content.Intent
import android.webkit.JavascriptInterface
import org.json.JSONObject
import java.time.Instant

class MarsWebAppInterface(private val context: Context) {

    @JavascriptInterface
    fun postMessage(message: String) {
        try {
            val json = JSONObject(message)
            val type = json.optString("type")

            when (type) {

                // ── Play alarm sound ───────────────────────────────────────────
                // Sent by marsPlaySound() in marsBridge.js when user taps an alarm
                "MARS_PLAY_SOUND" -> {
                    val intent = Intent(context, AlarmSoundService::class.java).apply {
                        action = AlarmSoundService.ACTION_PLAY
                    }
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                        context.startForegroundService(intent)
                    } else {
                        context.startService(intent)
                    }
                }

                // ── Stop alarm sound ───────────────────────────────────────────
                // Sent by marsStopSound() in marsBridge.js on Dismiss or Snooze
                "MARS_STOP_SOUND" -> {
                    val intent = Intent(context, AlarmSoundService::class.java).apply {
                        action = AlarmSoundService.ACTION_STOP
                    }
                    context.startService(intent)
                }

                // ── Schedule an alarm ──────────────────────────────────────────
                // Sent by marsScheduleAlarm() in marsBridge.js when an alarm is
                // created or updated. Registers an exact AlarmManager alarm that
                // fires AlarmReceiver at the scheduled time, even when the app
                // is closed or the device is asleep.
                //
                // Expected JSON shape from marsBridge.js:
                // {
                //   type: "MARS_SCHEDULE_ALARM",
                //   id: "alarm-abc123",
                //   time: "2025-06-12T06:30:00.000Z",   // ISO 8601 UTC
                //   payload: {
                //     label: "Morning Alarm",
                //     sound: "alarm-default",
                //     ...
                //   }
                // }
                "MARS_SCHEDULE_ALARM" -> {
                    val alarmId  = json.optString("id", "alarm")
                    val fireAtIso = json.optString("time", "")
                    val payload  = json.optJSONObject("payload")
                    val label    = payload?.optString("label") ?: "MARS Alarm"

                    if (fireAtIso.isNotEmpty()) {
                        val fireAtMs = try {
                            Instant.parse(fireAtIso).toEpochMilli()
                        } catch (e: Exception) {
                            System.currentTimeMillis() + 60_000L // fallback: 1 min from now
                        }

                        // Extract display time (HH:mm) from ISO string for the lock screen UI
                        val timeStr = try {
                            val instant = Instant.parse(fireAtIso)
                            val zdt = instant.atZone(java.time.ZoneId.systemDefault())
                            String.format("%02d:%02d", zdt.hour, zdt.minute)
                        } catch (e: Exception) { "" }

                        AlarmScheduler.schedule(
                            context  = context,
                            alarmId  = alarmId,
                            fireAtMs = fireAtMs,
                            label    = label,
                            timeStr  = timeStr
                        )
                    }
                }

                // ── Cancel a scheduled alarm ───────────────────────────────────
                // Sent by marsCancelAlarm() in marsBridge.js when an alarm is
                // deleted or disabled.
                //
                // Expected JSON shape:
                // { type: "MARS_CANCEL_ALARM", id: "alarm-abc123" }
                "MARS_CANCEL_ALARM" -> {
                    val alarmId = json.optString("id", "")
                    if (alarmId.isNotEmpty()) {
                        AlarmScheduler.cancel(context, alarmId)
                    }
                }

                // ── Open a URL ─────────────────────────────────────────────────
                // Sent by marsOpenUrl() in marsBridge.js
                "MARS_OPEN_URL" -> {
                    val url = json.optString("url", "")
                    if (url.isNotEmpty()) {
                        val intent = Intent(Intent.ACTION_VIEW, android.net.Uri.parse(url)).apply {
                            flags = Intent.FLAG_ACTIVITY_NEW_TASK
                        }
                        context.startActivity(intent)
                    }
                }

                // ── Web ready signal ───────────────────────────────────────────
                "MARS_WEB_READY" -> {
                    // Web layer has loaded — optionally send back any pending data
                    // e.g. missed alarms, pending routine starts, etc.
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
