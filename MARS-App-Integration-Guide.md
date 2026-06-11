# MARS React Native WebView Integration Guide

This guide is for integrating the MARS web app (`mars-lyart-alpha.vercel.app`) into the existing MARS React Native (Expo) Android app. 

Currently, the web app relies on the Service Worker for alarms, which fails when the app is fully closed. The Expo app already has a custom native alarm module (`expo-modules-nativealarm`). This guide connects the two by rendering the web app in a `react-native-webview` and passing messages between them.

## 1. Install react-native-webview

In the Expo project, install the WebView package:

```bash
npx expo install react-native-webview
```

## 2. Update the Main App Screen

Replace the current React Native UI with a full-screen WebView that loads the Vercel deployment. The WebView must inject a script to handle the `window.ReactNativeWebView.postMessage` bridge, and listen for incoming messages from the web app.

```javascript
import React, { useRef } from 'react';
import { StyleSheet, SafeAreaView, Linking } from 'react-native';
import { WebView } from 'react-native-webview';
// Import your existing native alarm module methods
import { scheduleAlarm, cancelAlarm, playSound, stopSound } from 'expo-modules-nativealarm';

export default function App() {
  const webviewRef = useRef(null);

  // Handle messages sent from the web app via window.ReactNativeWebView.postMessage
  const onMessage = async (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      switch (data.type) {
        case 'MARS_PLAY_SOUND':
          // The web app wants to play a native Android ringtone (content:// URI)
          if (data.uri) {
            playSound(data.uri, data.loop);
          }
          break;

        case 'MARS_STOP_SOUND':
          // The web app alarm was dismissed/snoozed, stop the native ringtone
          stopSound();
          break;

        case 'MARS_OPEN_URL':
          // The web app requested to open an external URL
          if (data.url) {
            const supported = await Linking.canOpenURL(data.url);
            if (supported) {
              await Linking.openURL(data.url);
            }
          }
          break;

        case 'MARS_SCHEDULE_ALARM':
          // (Optional future enhancement) Web app asks native to schedule a real AlarmManager alarm
          // data.id, data.time, data.payload
          scheduleAlarm(data.id, data.time, data.payload);
          break;

        case 'MARS_CANCEL_ALARM':
          // (Optional future enhancement) Web app asks native to cancel an alarm
          cancelAlarm(data.id);
          break;

        default:
          console.log('Unknown message from web:', data.type);
      }
    } catch (e) {
      console.error('Failed to parse message from web:', e);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <WebView
        ref={webviewRef}
        source={{ uri: 'https://mars-lyart-alpha.vercel.app' }}
        onMessage={onMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080808',
  },
});
```

## 3. How the Bridge Works

The web app is already updated to send these exact messages. When it detects it is running inside the WebView (by checking for `window.ReactNativeWebView`), it will:

1. **Native Ringtones:** When an alarm fires that uses an Android system ringtone (`content://...`), the web app cannot play it. It will send `{ type: 'MARS_PLAY_SOUND', uri: 'content://...', loop: true }`. The native app must catch this and use Android's `RingtoneManager` or `MediaPlayer` to play the URI.
2. **Stop Sound:** When the user taps Dismiss or Snooze on the web overlay, the web app sends `{ type: 'MARS_STOP_SOUND' }`. The native app must stop the media player.
3. **URL Auto-Open:** When a scheduled link fires and the user taps the notification, the web app sends `{ type: 'MARS_OPEN_URL', url: 'https://...' }`. The native app catches this and calls `Linking.openURL()` to launch the browser or target app (like YouTube).

## 4. Phase 2: Full Native Alarm Integration (App Closed)

Currently, the web app relies on the Service Worker to fire alarms when the app is closed. To make alarms fire reliably at the exact second even when the Android app is swiped away:

1. The web app needs to send `MARS_SCHEDULE_ALARM` to the WebView bridge whenever an alarm is saved.
2. The Expo native alarm module uses Android's `AlarmManager` (`setExactAndAllowWhileIdle`) to schedule a native intent.
3. When the native alarm fires, the native app launches a Full Screen Intent (the `AlarmRingActivity` already present in your custom module) which wakes the screen, plays the sound natively, and shows a Dismiss/Snooze UI natively.
4. When dismissed, the native app passes the event back down to the WebView (or directly to Firestore) to sync the state.
