# Smart Attendance — Frontend (Lecturer, Student & Admin Portals)

React 19 + TypeScript + Vite + Tailwind v4. Server state via TanStack Query, forms via react-hook-form + zod, mock API via MSW.

## Run

```bash
npm install
cp .env.example .env.local   # VITE_USE_MOCKS=true runs without a backend
npm run dev                  # http://localhost:5173  (mock login: LEC00123 / password)
npm test | npm run typecheck | npm run lint | npm run build
```

Mock modes (`VITE_USE_MOCKS`): `true` = all mocked (not allowed in a production build); **`data` = everything real
except `GET /lecturer/units`** (the dashboard's unit list, which the backend doesn't serve; see below); `false` =
everything real. The dev proxy forwards `/api`
to `localhost:4000` (override with `API_PROXY_TARGET`). The backend serves under `/api/v1`, so set `VITE_API_URL=/api/v1`.

To sign in for real, register at `/signup`. A lecturer is active as soon as the staff number checks out (try `STF/0002`
against the backend's mock ERP); a student follows the email link, which the backend logs in dev when
`RESEND_API_KEY` is empty.

## API contract expected from the Node backend

Auth is an httpOnly session cookie (`withCredentials`), so no tokens live in JS. The backend wraps responses as
`{success, data}` / `{success:false, error:{code,message}}`; `src/lib/api.ts` unwraps that, and silently calls
`POST /auth/refresh` once on a 401 before sending the user to sign in.

Main endpoints (all under `/api/v1`; the backend README lists every one):

| Area | Endpoints |
| --- | --- |
| Auth | `POST /auth/login` `{identifier, password}`, `/auth/logout`, `/auth/refresh`, `/auth/lecturer/register`, `/auth/student/register`, `/auth/verify-email`, `/auth/forgot-password`, `/auth/change-password`; `GET`/`PATCH /auth/me`; `POST`/`DELETE /auth/me/avatar` |
| Lecturer | `GET /lecturers/overview`, `/lecturers/students`, `/reports/sessions` |
| Units | `GET /units`, `/units/current`, `/units/:id/students`; `POST /units` `{code}` |
| Sessions | `POST /sessions`, `GET /sessions/live`, `GET /sessions/:id/qr` (rotating), `PATCH /sessions/:id/status`, `PATCH /sessions/:id/geofence`, `GET /attendance/sessions/:id` |
| Student | `GET /students/me/units`, `/students/me/attendance`; `POST /attendance/check-in` `{payload, location}` |
| Face | `GET /students/me/face`, `PUT`/`DELETE /students/me/face-consent`, `POST`/`DELETE /units/:unitId/students/:studentUserId/face`, `POST /sessions/:id/face/identify`, `/face/confirm` |

**Known gap:** `src/portals/lecturer/dashboard/dashboardApi.ts` calls `GET /lecturer/units`, which the backend does not
serve (it has `/units` and `/lecturers/*`). It only works while mocked, which is why `data` mode still mocks it.

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
- `src/portals/lecturer/` — `layout/` (the sidebar + bottom-nav shell), `dashboard/`, `profile/`, `units/` (incl. face
  enrolment), `students/`, `attendance/` (activate class, live session + QR, share location for the geofence, face
  check-in terminal, reports).
- `src/portals/student/` — `layout/` (the persistent shell + bottom nav), dashboard, units, attendance history,
  progress, profile (incl. face-check-in consent), and the QR scan-to-check-in flow (sends the phone's location
  for the geofence).
- `src/portals/admin/` — placeholder only for now; the backend has no admin API yet (room surveys, card
  enrolment and unit confirmation are `npm run dev:*` scripts, see the backend README), so this is just a reserved route and folder.
- `src/components/` — shared UI primitives (`ui/`), `FaceCamera` and `RouteError`.
- `src/pages/` — public pages: landing, terms and conditions.
- `src/lib/`, `src/mocks/`, `src/types/`, `src/test/` — shared across every portal.

`RequireAuth.tsx` decides which portal a signed-in user lands in by role; its `STUDENT_ROUTES` allowlist must be
kept in sync with every route added under `src/portals/student/`.

## Tests

`npm test` runs Vitest + Testing Library against the MSW handlers. `npm run test:e2e` runs Playwright
(`e2e/consistency.spec.ts`: layout, tap-target and iOS-zoom checks); `test:e2e:visual` adds screenshot comparison.
