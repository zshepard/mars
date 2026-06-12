package com.mars.app

import android.app.KeyguardManager
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

/**
 * AlarmActivity
 *
 * Full-screen activity that appears on the lock screen when an alarm fires.
 * Shows the alarm label, time, and Dismiss / Snooze buttons.
 *
 * Opened by AlarmReceiver via a full-screen PendingIntent.
 * Uses window flags to show over the lock screen without requiring unlock.
 *
 * Layout: activity_alarm.xml (see layout snippet below)
 */
class AlarmActivity : AppCompatActivity() {

    private var alarmId: String = ""
    private var snoozePendingIntent: android.app.PendingIntent? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // ── Show over lock screen ──────────────────────────────────────────────
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
            val keyguardManager = getSystemService(KEYGUARD_SERVICE) as KeyguardManager
            keyguardManager.requestDismissKeyguard(this, null)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
            )
        }

        setContentView(R.layout.activity_alarm)

        // ── Read alarm data from intent ────────────────────────────────────────
        alarmId = intent.getStringExtra(AlarmReceiver.EXTRA_ALARM_ID) ?: "alarm"
        val alarmLabel = intent.getStringExtra(AlarmReceiver.EXTRA_ALARM_LABEL) ?: "MARS Alarm"
        val alarmTime  = intent.getStringExtra(AlarmReceiver.EXTRA_ALARM_TIME) ?: ""

        // ── Populate UI ────────────────────────────────────────────────────────
        findViewById<TextView>(R.id.tv_alarm_label).text = alarmLabel
        if (alarmTime.isNotEmpty()) {
            findViewById<TextView>(R.id.tv_alarm_time).text = alarmTime
        }

        // ── Dismiss button ─────────────────────────────────────────────────────
        findViewById<Button>(R.id.btn_dismiss).setOnClickListener {
            dismissAlarm()
        }

        // ── Snooze button ──────────────────────────────────────────────────────
        findViewById<Button>(R.id.btn_snooze).setOnClickListener {
            snoozeAlarm()
        }
    }

    private fun dismissAlarm() {
        // Stop the alarm sound
        val stopIntent = Intent(this, AlarmSoundService::class.java).apply {
            action = AlarmSoundService.ACTION_STOP
        }
        startService(stopIntent)

        // Cancel the ongoing notification
        val notificationManager = getSystemService(NOTIFICATION_SERVICE) as android.app.NotificationManager
        notificationManager.cancel(alarmId.hashCode())

        // Open the MARS app main screen
        val mainIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        startActivity(mainIntent)

        finish()
    }

    private fun snoozeAlarm() {
        // Stop the current sound
        val stopIntent = Intent(this, AlarmSoundService::class.java).apply {
            action = AlarmSoundService.ACTION_STOP
        }
        startService(stopIntent)

        // Cancel the ongoing notification
        val notificationManager = getSystemService(NOTIFICATION_SERVICE) as android.app.NotificationManager
        notificationManager.cancel(alarmId.hashCode())

        // Re-schedule the alarm 5 minutes from now (default snooze)
        // The snooze duration could be read from SharedPreferences if you want it configurable
        val snoozeDurationMs = 5 * 60 * 1000L
        val snoozeFireAt = System.currentTimeMillis() + snoozeDurationMs

        AlarmScheduler.schedule(
            context  = this,
            alarmId  = "${alarmId}_snooze",
            fireAtMs = snoozeFireAt,
            label    = "Snoozed Alarm",
            timeStr  = intent.getStringExtra(AlarmReceiver.EXTRA_ALARM_TIME) ?: ""
        )

        finish()
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        setIntent(intent)
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// activity_alarm.xml  (place in res/layout/activity_alarm.xml)
// ─────────────────────────────────────────────────────────────────────────────
//
// <?xml version="1.0" encoding="utf-8"?>
// <LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
//     android:layout_width="match_parent"
//     android:layout_height="match_parent"
//     android:orientation="vertical"
//     android:gravity="center"
//     android:background="#1A1A2E"
//     android:padding="32dp">
//
//     <ImageView
//         android:layout_width="72dp"
//         android:layout_height="72dp"
//         android:src="@drawable/ic_alarm"
//         android:tint="#1D9E75"
//         android:layout_marginBottom="24dp" />
//
//     <TextView
//         android:id="@+id/tv_alarm_label"
//         android:layout_width="wrap_content"
//         android:layout_height="wrap_content"
//         android:text="MARS Alarm"
//         android:textSize="28sp"
//         android:textStyle="bold"
//         android:textColor="#FFFFFF"
//         android:layout_marginBottom="8dp" />
//
//     <TextView
//         android:id="@+id/tv_alarm_time"
//         android:layout_width="wrap_content"
//         android:layout_height="wrap_content"
//         android:text=""
//         android:textSize="18sp"
//         android:textColor="#AAAAAA"
//         android:layout_marginBottom="48dp" />
//
//     <Button
//         android:id="@+id/btn_dismiss"
//         android:layout_width="240dp"
//         android:layout_height="56dp"
//         android:text="Dismiss"
//         android:backgroundTint="#1D9E75"
//         android:textColor="#FFFFFF"
//         android:textSize="16sp"
//         android:layout_marginBottom="16dp" />
//
//     <Button
//         android:id="@+id/btn_snooze"
//         android:layout_width="240dp"
//         android:layout_height="56dp"
//         android:text="Snooze 5 min"
//         android:backgroundTint="#2A2A3E"
//         android:textColor="#AAAAAA"
//         android:textSize="16sp" />
//
// </LinearLayout>
