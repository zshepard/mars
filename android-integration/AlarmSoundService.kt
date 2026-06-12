package com.mars.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

class AlarmSoundService : Service() {

    private var mediaPlayer: MediaPlayer? = null

    companion object {
        const val ACTION_PLAY = "com.mars.app.ACTION_PLAY"
        const val ACTION_STOP = "com.mars.app.ACTION_STOP"
        private const val CHANNEL_ID = "mars_alarm_sound_channel"
        private const val NOTIFICATION_ID = 9999
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_PLAY -> {
                startForeground(NOTIFICATION_ID, createNotification())
                playAlarmSound()
            }
            ACTION_STOP -> {
                stopAlarmSound()
                stopForeground(true)
                stopSelf()
            }
        }
        return START_NOT_STICKY
    }

    private fun playAlarmSound() {
        if (mediaPlayer?.isPlaying == true) return

        try {
            // Get system default alarm sound URI, fallback to ringtone
            val alarmUri: Uri? = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)

            if (alarmUri != null) {
                mediaPlayer = MediaPlayer().apply {
                    setDataSource(this@AlarmSoundService, alarmUri)
                    
                    // Route audio to the alarm stream so it plays out loud
                    setAudioAttributes(
                        AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_ALARM)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .build()
                    )
                    
                    isLooping = true // Keep sounding until stopped
                    prepare()
                    start()
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun stopAlarmSound() {
        mediaPlayer?.let {
            if (it.isPlaying) {
                it.stop()
            }
            it.release()
        }
        mediaPlayer = null
    }

    override fun onDestroy() {
        stopAlarmSound()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null // We use started service, not bound service
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = "MARS Alarm Sound"
            val descriptionText = "Keeps alarm sound playing in background"
            val importance = NotificationManager.IMPORTANCE_LOW
            val channel = NotificationChannel(CHANNEL_ID, name, importance).apply {
                description = descriptionText
            }
            val notificationManager: NotificationManager =
                getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun createNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("MARS Alarm")
            .setContentText("Alarm is ringing...")
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm) // Replace with your app icon
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }
}
