# MARS — Complete Deploy Guide
# Firebase mars-d3745 → Vercel project-ygewt → Google Play Store

════════════════════════════════════════════════════════
 STEP 1 — INSTALL DEPENDENCIES
════════════════════════════════════════════════════════

  npm install

  # Optional: generate app icons (requires canvas package)
  npm install canvas --save-dev
  node scripts/generate-icons.js

════════════════════════════════════════════════════════
 STEP 2 — FIREBASE SETUP  (console.firebase.google.com)
 Project: mars-d3745
════════════════════════════════════════════════════════

2a) Enable Google Sign-In
    Authentication → Sign-in method → Google → Enable → Save

2b) Create Firestore Database
    Firestore Database → Create database → Start in test mode → Done

2c) Register Web App & get config values
    Project Settings (gear icon) → Your apps → Add app → Web (</>)
    Nickname: MARS Web → Register app
    COPY these values from the firebaseConfig shown:
      apiKey
      messagingSenderId
      appId

2d) Get VAPID key (for push notification alarms)
    Project Settings → Cloud Messaging tab
    → Web Push certificates → Generate key pair → COPY the key

2e) Fill in .env.local
    Open .env.local and paste your values:
      REACT_APP_FIREBASE_API_KEY=...
      REACT_APP_FIREBASE_MESSAGING_SENDER_ID=...
      REACT_APP_FIREBASE_APP_ID=...
      REACT_APP_FIREBASE_VAPID_KEY=...
    (authDomain, projectId, storageBucket are already filled in)

════════════════════════════════════════════════════════
 STEP 3 — TEST LOCALLY
════════════════════════════════════════════════════════

  npm start
  Open http://localhost:3000
  → Sign in with Google
  → Create an alarm
  → Check it appears in Firestore console

════════════════════════════════════════════════════════
 STEP 4 — GITHUB REPO
════════════════════════════════════════════════════════

  git init
  git add .
  git commit -m "MARS v1.0.0 - initial commit"

  # Create repo at github.com then:
  git remote add origin https://github.com/YOUR_USERNAME/mars.git
  git push -u origin main

  NOTE: .env.local is in .gitignore — secrets stay local.

════════════════════════════════════════════════════════
 STEP 5 — VERCEL DEPLOY  (vercel.com/zachs-projects-8c8b4a7f/project-ygewt)
════════════════════════════════════════════════════════

5a) Connect GitHub
    project-ygewt → Settings → Git → Connect Git Repository
    Select your "mars" repo → Import

5b) Add environment variables
    project-ygewt → Settings → Environment Variables
    Add ALL 7 variables from .env.local
    Set scope: Production + Preview + Development

    Name                                   Value
    ─────────────────────────────────────  ──────────────────────────
    REACT_APP_FIREBASE_API_KEY             (from Firebase)
    REACT_APP_FIREBASE_AUTH_DOMAIN         mars-d3745.firebaseapp.com
    REACT_APP_FIREBASE_PROJECT_ID          mars-d3745
    REACT_APP_FIREBASE_STORAGE_BUCKET      mars-d3745.appspot.com
    REACT_APP_FIREBASE_MESSAGING_SENDER_ID (from Firebase)
    REACT_APP_FIREBASE_APP_ID              (from Firebase)
    REACT_APP_FIREBASE_VAPID_KEY           (from Firebase Cloud Messaging)

5c) Deploy
    Vercel auto-deploys on every git push.
    Your live URL: https://project-ygewt.vercel.app

5d) Authorize domain in Firebase
    Firebase → Authentication → Settings → Authorized domains
    → Add domain: project-ygewt.vercel.app

════════════════════════════════════════════════════════
 STEP 6 — PWABUILDER → GOOGLE PLAY STORE
════════════════════════════════════════════════════════

6a) Go to pwabuilder.com
    Paste: https://project-ygewt.vercel.app
    → Start → Wait for validation score (needs green on manifest + SW)

6b) Package for Android
    → Package for Stores → Android → Download package
    Saves a .zip with: .aab file + signing key files
    !! SAVE THE SIGNING KEY — required for all future updates !!

6c) Google Play Console (your MARS app: 4973768537322277267)
    → Production → Create new release
    → Upload the .aab file
    → Write release notes
    → Review → Submit for review

6d) Wait 1–3 days for Google review (first submission)
    Subsequent updates are usually reviewed same day.

════════════════════════════════════════════════════════
 ONGOING UPDATES
════════════════════════════════════════════════════════

  Web:   git push → Vercel auto-deploys in ~60 seconds
  Play:  npm run build → PWABuilder → upload new .aab

════════════════════════════════════════════════════════
 PROJECT REFERENCE
════════════════════════════════════════════════════════

  Firebase Project:   mars-d3745
  Vercel Team:        zachs-projects-8c8b4a7f
  Vercel Project:     project-ygewt
  Live URL:           https://project-ygewt.vercel.app
  Play Store App ID:  4973768537322277267
  App Name:           MARS
