# Smart Attendance — Lecturer Portal

React 19 + TypeScript + Vite + Tailwind v4. Server state via TanStack Query, forms via react-hook-form + zod, mock API via MSW.

## Run

```bash
npm install
cp .env.example .env.local   # VITE_USE_MOCKS=true runs without a backend
npm run dev                  # http://localhost:5173  (mock login: LEC00123 / password)
npm test | npm run typecheck | npm run lint | npm run build
```

Mock modes (`VITE_USE_MOCKS`): `true` = all mocked; **`data` = real sign-in against the backend, dashboard data mocked**
(the backend has no dashboard/units/sessions endpoints yet); `false` = everything real. The dev proxy forwards `/api`
to `localhost:4000` (override with `API_PROXY_TARGET`). The backend serves under `/api/v1`, so set `VITE_API_URL=/api/v1`.

To sign in for real you need an **active** lecturer: register via the API, open the emailed link (logged by the
backend in dev), then approve locally with `npm run dev:approve -- <STAFF_NUMBER>` in the backend repo.

## API contract expected from the Node backend

Auth is an httpOnly session cookie (`withCredentials`), so no tokens live in JS. The backend wraps responses as
`{success, data}` / `{success:false, error:{code,message}}`; `src/lib/api.ts` unwraps that, and silently calls
`POST /auth/refresh` once on a 401 before sending the user to sign in.

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
