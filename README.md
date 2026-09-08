# PhysioAi 2.0

Physiotherapy web app with real-time pose tracking, AI-powered rep counting, and structured clinical prescriptions. Built with React + TypeScript + Vite + Tailwind + shadcn/ui.

## Features

**For patients:**
- Real-time exercise tracking via webcam (MediaPipe Pose Landmarker)
- Automatic rep counting with movement quality scoring
- Session history with charts and stats
- Structured therapy plan display (exercise, reps, sets, frequency)
- Profile editing (phone, condition)

**For doctors:**
- Patient list with inactivity indicators (2-day threshold)
- Detailed patient view: session history, scores, duration
- Structured prescription form: pick exercise, side, reps/sets/frequency
- New prescription or update existing plan
- Discharge patient from care
- Email patient directly

**Technical:**
- Firebase Auth + Firestore backend
- Local demo mode (no Firebase needed — data in localStorage)
- MediaPipe Tasks Vision for on-device pose inference
- Session recording with local blob playback
- TypeScript end-to-end, zero `any` leaks

---

## Quick start

```bash
cd physio-web
npm install
npm run dev        # → http://localhost:5173
```

No Firebase config? The app runs in **demo mode** automatically — register any email, data stays in localStorage.

---

## Firebase setup (optional)

1. Create a Firebase project → enable Auth (Email/Password) + Firestore
2. Copy your web app config into `.env.local`:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

3. Deploy Firestore rules:

```bash
# Paste contents of firestore.rules into Firebase Console → Firestore → Rules
```

> Storage rules are in `storage.rules` but require the Blaze plan to deploy.
> The app works fully without Storage — recordings play locally via blob URL.

---

## Project structure

```
src/
├── app/                Router, auth gate, role-based routing
├── features/
│   ├── auth/           Login, register, reset password, role picker
│   ├── patient/        Dashboard, session history, profile
│   ├── doctor/         Patient list, detail, prescription form
│   ├── workout/        Camera, pose overlay, rep counter
│   └── session/        Result page, recording
├── hooks/              useAuth, useCamera, useMediaPipe, useRecording
├── lib/                Firebase, Firestore, exercises, demo store
├── components/ui/      shadcn/ui components
└── types/              All TypeScript types + exercise configs
```

## Exercise state machine

Real-time rep counting with hysteresis:

| Exercise | Joints | Count when | Reset before next |
|---|---|---|---|
| Bicep Curls | shoulder → elbow → wrist | score ≥ 90 | Yes |
| Squats | hip → knee → ankle | score ≥ 90 | Yes |
| Shoulder Press | shoulder → elbow → wrist | score ≥ 90 | Yes |
| Lateral Raises | hip → shoulder → wrist | score ≥ 90 | Yes |

---

## Tech stack

- **React 18 + TypeScript + Vite** — fast dev, strict types
- **Tailwind CSS v4 + shadcn/ui** — consistent design system
- **Firebase v10** — Auth, Firestore (modular SDK, tree-shakeable)
- **MediaPipe Tasks Vision** — on-device pose landmark detection
- **Recharts** — session score charts
- **React Router v6** — client-side routing

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Dev server with HMR |
| `npm run build` | TypeScript check + Vite production build |
| `npm run preview` | Preview production build locally |

---

## Firestore data model

```
users/{uid}                    → displayName, email, role, phone, condition
sessions/{sessionId}           → patientUid, exercise, side, reps, score, status, duration
therapyPlans/{planId}          → patientUid, doctorUid, planText, exercise, reps, sets, frequency
careAssignments/{patientUid}   → patientUid, doctorUids[], updatedAt
```

---

## Notes

- **No Blaze plan needed.** Storage is gated — recordings play locally via blob URL. All Firestore queries work on the free Spark plan.
- **Demo mode** activates automatically when `.env.local` is absent or empty.
- **Firestore composite indexes** are avoided by sorting client-side — no manual index setup required.
