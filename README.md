# Tally

A daily habit tracker: log activities per day, track running totals against
annual goals, and see trend charts over time. Built with React, TypeScript,
and Vite, backed by Firebase (Auth + Firestore).

## Local development

```bash
npm install
cp .env.local.example .env.local   # fill in with values from Firebase Console
npm run dev
```

`.env.local` holds the Firebase Web SDK config (`VITE_FIREBASE_*`). These are
public client identifiers, not secrets -- access is enforced by
`firestore.rules`, not by keeping this file private. Get the values from
[Firebase Console](https://console.firebase.google.com/project/tally-streaker/settings/general)
-> Project Settings -> General -> Your apps -> Web app.

## Deployment

The app is a static SPA deployed to **Firebase Hosting** in the
`tally-streaker` Firebase/GCP project. Auth and Firestore live in the same
project. There is no server -- the client talks to Firestore directly.

To deploy from any machine (this repo's `.firebaserc` already points at
`tally-streaker`, so no extra linking is needed):

```bash
npm install
npm run build                                    # outputs to dist/
npx firebase-tools login                         # first time only, on a new machine
npx firebase-tools deploy --only hosting --project tally-streaker
```

Live at https://tally-streaker.web.app (also served at
https://tally-streaker.firebaseapp.com).

If `firestore.rules` changes, deploy that separately:

```bash
npx firebase-tools deploy --only firestore:rules --project tally-streaker
```

Whoever deploys needs to be added as a member of the `tally-streaker`
Firebase project (Firebase Console -> Project Settings -> Users and
permissions) -- `firebase login` alone isn't enough without project access.
