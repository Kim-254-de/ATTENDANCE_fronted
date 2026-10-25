# Smart Attendance — Frontend (Student, Lecturer and Oversight Portals)

React 19 + TypeScript + Vite + Tailwind v4. Server state via TanStack Query, forms via react-hook-form + zod, mock API via MSW.

## Run

```bash
npm install
cp .env.example .env.local   # VITE_USE_MOCKS=true runs without a backend
npm run dev                  # http://localhost:5173  (mock login: LEC00123 / password)
npm test | npm run typecheck | npm run lint | npm run build
```

Mock modes (`VITE_USE_MOCKS`): `true` = all mocked (not allowed in a production build); `data` = every request reaches the
real backend (`dataHandlers` in `src/mocks/handlers.ts` is empty now that the backend serves everything; kept so
existing `.env.local` files work); `false` = everything real, without starting MSW. The dev proxy forwards `/api` unchanged to `localhost:4000`
(override with `API_PROXY_TARGET`), and so does the production nginx (`deploy/default.conf.template`). The backend
serves under `/api/v1`, so `VITE_API_URL` is `/api/v1` everywhere, `.env.production` included.

To sign in for real, students and lecturers use their SMARTTT account (`VITE_SMARTTT_ACCOUNTS=true`; `/signup` now
redirects to sign-in). Administrators and faculty, department and QA officers are invite-only and sign in at the
unlisted `/oversight` page.

## API contract expected from the Node backend

Auth is an httpOnly session cookie (`withCredentials`), so no tokens live in JS. Cross-site requests are blocked by
`SameSite=Lax` cookies and serving the API from the same origin (the proxy); the backend has no CSRF token. The backend wraps responses as
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

**Student check-in (`/scan`).** The student opens `/scan` (or "Scan attendance QR code" on their dashboard),
points the phone camera at the lecturer's projected code, and the page posts what it reads to
`/attendance/check-in`. Decoding uses `qr-scanner` (loaded only on that page). Browsers only allow the camera
over **https** (or `localhost`), so the deployed portal must be served over https. A code the server refuses
(expired, already recorded) is not resent until a new one is on screen.

Types live in `src/types/index.ts`. `qrToken` must be a server-signed, short-lived token; the client only renders it.

## Structure

Code is organized by **portal** — each role's pages, layout and API hooks live in their own tree, with a shared
`src/auth/` for what every role hits before landing in a portal:

- `src/auth/` — login (`/`, `/oversight`), invitation acceptance, forgot/reset password, email verification, `RequireAuth` (the role-based route
  guard), `authApi.ts`, and `ChangePasswordCard` (shared by both the lecturer and student profile pages).
- `src/portals/lecturer/` — `layout/` (the sidebar + bottom-nav shell), `dashboard/`, `profile/`, `units/` (incl. face
  enrolment), `students/`, `attendance/` (activate class, live session + QR, share location for the geofence, face
  check-in terminal, reports).
- `src/portals/student/` — `layout/` (the persistent shell + bottom nav), dashboard, units, attendance history,
  progress, profile (incl. face-check-in consent), and the QR scan-to-check-in flow (sends the phone's location
  for the geofence).
- `src/portals/admin/` — the admin console: officers and invitations, faculties, and Units (confirm a lecturer the
  timetable doesn't list for a unit). Room surveys and card enrolment are still backend `npm run dev:*` scripts.
- `src/portals/faculty/` — faculty-wide oversight: departments (and their courses), units, lecturers, students,
  timekeeping, and inviting department officers.
- `src/portals/department/` — department-wide oversight: units, course offerings, lecturers, students, timekeeping,
  portable terminals and fingerprint enrolment (`terminals/`).
- `src/portals/qa/` — quality assurance, signed in at `/oversight`: KPI dashboard (incl. the attendance-rate trend),
  standards catalog, checklist templates, audits (fill the checklist item by item, raise a corrective action from a
  non-compliant or partial finding) and corrective actions. Every list has department/faculty filters and CSV/PDF
  export links (`exportLinks.tsx`), which pass the list's filters straight through to the backend's `export.{csv,pdf}`.
- `src/components/` — shared UI primitives (`ui/`), `FaceCamera` and `RouteError`.
- `src/pages/` — public pages: landing, terms and conditions.
- `src/lib/`, `src/mocks/`, `src/types/`, `src/test/` — shared across every portal.

`RequireAuth.tsx` gates every signed-in page by the `handle: { role }` its portal's parent route declares in
`src/app/routes.tsx`, and `roleHome.ts` picks where each role lands. A new page only needs to sit under the right
portal route.

## Tests

`npm test` runs Vitest + Testing Library against the MSW handlers. `npm run test:e2e` runs Playwright
(`e2e/consistency.spec.ts`: layout, tap-target and iOS-zoom checks); `test:e2e:visual` adds screenshot comparison.
