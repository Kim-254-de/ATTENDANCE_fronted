# Smart Attendance — Frontend (Lecturer, Student & Admin Portals)

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
| POST | /attendance/check-in `{payload}` (student) | CheckInResult `{recordId, sessionId, unitCode, recordedAt}` |

**Student check-in (`/scan`).** The student opens `/scan` (or "Scan attendance QR code" on their dashboard),
points the phone camera at the lecturer's projected code, and the page posts what it reads to
`/attendance/check-in`. Decoding uses `qr-scanner` (loaded only on that page). Browsers only allow the camera
over **https** (or `localhost`), so the deployed portal must be served over https. A code the server refuses
(expired, already recorded) is not resent until a new one is on screen.

Types live in `src/types/index.ts`. `qrToken` must be a server-signed, short-lived token; the client only renders it.

## Structure

Code is organized by **portal** — each role's pages, layout and API hooks live in their own tree, with a shared
`src/auth/` for what every role hits before landing in a portal:

- `src/auth/` — login, signup, forgot/reset password, email verification, `RequireAuth` (the role-based route
  guard), `authApi.ts`, and `ChangePasswordCard` (shared by both the lecturer and student profile pages).
- `src/portals/lecturer/` — `layout/` (the sidebar + bottom-nav shell), `dashboard/`, `profile/`, `units/`,
  `attendance/`.
- `src/portals/student/` — `layout/` (the persistent shell + bottom nav), dashboard, units, attendance history,
  profile, and the QR scan-to-check-in flow.
- `src/portals/admin/` — placeholder only for now; the backend has no admin API yet (approvals are CLI scripts,
  see the backend README), so this is just a reserved route and folder.
- `src/components/` — shared UI primitives (`ui/`) and `RouteError`.
- `src/lib/`, `src/mocks/`, `src/types/`, `src/test/` — shared across every portal.

`RequireAuth.tsx` decides which portal a signed-in user lands in by role; its `STUDENT_ROUTES` allowlist must be
kept in sync with every route added under `src/portals/student/`.
