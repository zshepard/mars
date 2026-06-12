package com.mars.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.PowerManager
import androidx.core.app.NotificationCompat

/**
 * AlarmReceiver
 *
 * Fired by AlarmManager at the exact scheduled time.
 * Responsibilities:
 *   1. Acquire a wake lock so the CPU stays on while we set up
 *   2. Start AlarmSoundService to play the alarm sound
 *   3. Show a full-screen notification that opens AlarmActivity on the lock screen
 *
 * This receiver is registered in AndroidManifest.xml and is triggered
 * by AlarmScheduler.kt via AlarmManager.setExactAndAllowWhileIdle().
 */
class AlarmReceiver : BroadcastReceiver() {

    companion object {
        const val EXTRA_ALARM_ID    = "alarm_id"
        const val EXTRA_ALARM_LABEL = "alarm_label"
        const val EXTRA_ALARM_TIME  = "alarm_time"
        private const val CHANNEL_ID = "mars_alarm_channel"
        private const val WAKE_LOCK_TAG = "MARS:AlarmWakeLock"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val alarmId    = intent.getStringExtra(EXTRA_ALARM_ID) ?: "alarm"
        val alarmLabel = intent.getStringExtra(EXTRA_ALARM_LABEL) ?: "MARS Alarm"
        val alarmTime  = intent.getStringExtra(EXTRA_ALARM_TIME) ?: ""

        // 1. Acquire a partial wake lock to keep CPU alive during setup
        val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        val wakeLock = powerManager.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP or PowerManager.ON_AFTER_RELEASE,
            WAKE_LOCK_TAG
        )
        wakeLock.acquire(10_000L) // 10 seconds max — enough to start service and show notification

        // 2. Start AlarmSoundService to play the system alarm sound
        val soundIntent = Intent(context, AlarmSoundService::class.java).apply {
            action = AlarmSoundService.ACTION_PLAY
            putExtra(EXTRA_ALARM_ID, alarmId)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(soundIntent)
        } else {
            context.startService(soundIntent)
        }

        // 3. Build the full-screen intent that opens AlarmActivity on the lock screen
        val alarmActivityIntent = Intent(context, AlarmActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra(EXTRA_ALARM_ID, alarmId)
            putExtra(EXTRA_ALARM_LABEL, alarmLabel)
            putExtra(EXTRA_ALARM_TIME, alarmTime)
        }
        val fullScreenPendingIntent = PendingIntent.getActivity(
            context,
            alarmId.hashCode(),
            alarmActivityIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Dismiss action — sends stop to AlarmSoundService directly from notification
        val dismissIntent = Intent(context, AlarmSoundService::class.java).apply {
            action = AlarmSoundService.ACTION_STOP
        }
        val dismissPendingIntent = PendingIntent.getService(
            context,
            alarmId.hashCode() + 1,
            dismissIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // 4. Create notification channel (required Android 8+)
        createNotificationChannel(context)

        // 5. Build and show the full-screen notification
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm) // Replace with your app icon
            .setContentTitle(alarmLabel)
            .setContentText(if (alarmTime.isNotEmpty()) "Alarm · $alarmTime" else "Your MARS alarm is ringing")
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC) // Show on lock screen
            .setFullScreenIntent(fullScreenPendingIntent, true)  // Opens AlarmActivity on lock screen
            .setContentIntent(fullScreenPendingIntent)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Dismiss", dismissPendingIntent)
            .setAutoCancel(false)
            .setOngoing(true) // Cannot be swiped away while ringing
            .build()

        val notificationManager =
            context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(alarmId.hashCode(), notification)

        // Release wake lock — AlarmSoundService holds its own via ForegroundService
        if (wakeLock.isHeld) wakeLock.release()
    }

    private fun createNotificationChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "MARS Alarms",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "MARS alarm notifications"
                setBypassDnd(true)       // Bypass Do Not Disturb
                enableVibration(true)
                lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
            }
            val notificationManager =
                context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }
}
