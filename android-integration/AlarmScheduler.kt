package com.mars.app

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

/**
 * AlarmScheduler
 *
 * Wraps AlarmManager to schedule and cancel MARS alarms.
 * Called from the MainActivity bridge when the web app sends
 * MARS_SCHEDULE_ALARM or MARS_CANCEL_ALARM messages.
 *
 * Uses setExactAndAllowWhileIdle() so alarms fire even in Doze mode.
 * On Android 12+, requires SCHEDULE_EXACT_ALARM or USE_EXACT_ALARM permission.
 */
object AlarmScheduler {

    private const val TAG = "MARSAlarmScheduler"

    /**
     * Schedule an exact alarm.
     *
     * @param context   Android context
     * @param alarmId   Unique string ID for this alarm (from MARS web layer)
     * @param fireAtMs  Epoch milliseconds when the alarm should fire
     * @param label     Human-readable alarm label shown on the lock screen
     * @param timeStr   Display time string (e.g. "06:30") shown in notification
     */
    fun schedule(context: Context, alarmId: String, fireAtMs: Long, label: String, timeStr: String) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

        // Check permission on Android 12+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (!alarmManager.canScheduleExactAlarms()) {
                Log.w(TAG, "Cannot schedule exact alarms — user must grant SCHEDULE_EXACT_ALARM in Settings")
                // Optionally: send a message back to the web layer to prompt the user
                return
            }
        }

        val intent = Intent(context, AlarmReceiver::class.java).apply {
            putExtra(AlarmReceiver.EXTRA_ALARM_ID, alarmId)
            putExtra(AlarmReceiver.EXTRA_ALARM_LABEL, label)
            putExtra(AlarmReceiver.EXTRA_ALARM_TIME, timeStr)
        }

        val pendingIntent = PendingIntent.getBroadcast(
            context,
            alarmId.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // setExactAndAllowWhileIdle fires even in Doze mode — required for wake-up alarms
        alarmManager.setExactAndAllowWhileIdle(
            AlarmManager.RTC_WAKEUP,
            fireAtMs,
            pendingIntent
        )

        Log.d(TAG, "Scheduled alarm '$alarmId' ($label) at $fireAtMs")
    }

    /**
     * Cancel a previously scheduled alarm.
     *
     * @param context  Android context
     * @param alarmId  The same unique string ID used when scheduling
     */
    fun cancel(context: Context, alarmId: String) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

        val intent = Intent(context, AlarmReceiver::class.java)
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            alarmId.hashCode(),
            intent,
            PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
        )

        if (pendingIntent != null) {
            alarmManager.cancel(pendingIntent)
            pendingIntent.cancel()
            Log.d(TAG, "Cancelled alarm '$alarmId'")
        }
    }
}
