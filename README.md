# Smart Attendance — Lecturer Portal

React 19 + TypeScript + Vite + Tailwind v4. Server state via TanStack Query, forms via react-hook-form + zod, mock API via MSW.

## Run

```bash
npm install
cp .env.example .env.local   # VITE_USE_MOCKS=true runs without a backend
npm run dev                  # http://localhost:5173  (mock login: LEC00123 / password)
npm test | npm run typecheck | npm run lint | npm run build
```

Set `VITE_USE_MOCKS=false` to hit the real API (dev proxy forwards `/api` to `localhost:4000`).

## API contract expected from the Node backend

Auth is an httpOnly session cookie (`withCredentials`), so no tokens live in JS.

| Method | Path | Returns |
| --- | --- | --- |
| POST | /auth/login `{identifier, password}` | Lecturer (sets cookie) |
| POST | /auth/logout | 204 |
| GET | /auth/me | Lecturer, or 401 |
| GET | /lecturer/overview | Overview |
| GET | /lecturer/units | Unit[] |
| POST | /sessions `{unitId, durationMinutes, verificationMethods}` | AttendanceSession |
| POST | /sessions/:id/refresh | AttendanceSession (rotated qrToken) |
| POST | /sessions/:id/close | AttendanceSession |

Types live in `src/types/index.ts`. `qrToken` must be a server-signed, short-lived token; the client only renders it.

## Structure

`src/features/*` (auth, dashboard, attendance) own their API hooks and UI; `src/components` holds shared layout/UI; `src/mocks` mirrors the API.
