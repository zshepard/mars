// Add this to your MainActivity.kt or wherever your WebView is configured.
// This intercepts the postMessage calls from the MARS web app.

import android.content.Intent
import android.webkit.JavascriptInterface
import org.json.JSONObject

class MarsWebAppInterface(private val context: Context) {

    @JavascriptInterface
    fun postMessage(message: String) {
        try {
            val json = JSONObject(message)
            val type = json.optString("type")

            when (type) {
                "MARS_PLAY_SOUND" -> {
                    // Start the ForegroundService to play the sound
                    val intent = Intent(context, AlarmSoundService::class.java).apply {
                        action = AlarmSoundService.ACTION_PLAY
                    }
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                        context.startForegroundService(intent)
                    } else {
                        context.startService(intent)
                    }
                }
                
                "MARS_STOP_SOUND" -> {
                    // Stop the ForegroundService and the sound
                    val intent = Intent(context, AlarmSoundService::class.java).apply {
                        action = AlarmSoundService.ACTION_STOP
                    }
                    context.startService(intent)
                }
                
                // Handle other existing MARS bridge messages here...
                // "MARS_OPEN_URL", "MARS_SCHEDULE_ALARM", etc.
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}

// In your WebView setup:
// webView.addJavascriptInterface(MarsWebAppInterface(this), "ReactNativeWebView")
// (or whatever global object name your bridge expects, e.g., "AndroidBridge")
