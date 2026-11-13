# UI redesign, November 2026

A page-by-page pass to make Smart Attendance and the Timetable Generator look and
read as one platform. The rules follow `docs/portal-layout-review.md`; the
colours and fonts were already shared (the SMARTTT palette), so this pass is
about **layout, wording and removing clutter**, not new features. No API or
data changes.

The same notes for the Generator's pages are in the Generator repo:
`Timetable-Generator/docs/ui-redesign-2026-11.md`.

## Shared rules used on every page

- **Buttons:** `components/ui/Button` (primary, secondary, ghost, danger), rounded, 44 px tall.
- **Cards and tables:** `components/ui/Card`: rounded, soft shadow, no border.
- **One main action per section**, at the top right of that section.
- **Secondary actions grouped** into one menu (e.g. *Download ▾*, *Import ▾*) instead of rows of buttons.
- **Messages one line long** where possible; long explanations removed.
- **Deletes confirmed inside the app**, never the browser's pop-up.

## Department portal › Teaching (12 Nov 2026, commit `f3f6199`)

Where a department enters its courses, units, groups and lecturers, and its exam
papers and invigilators, and publishes them to the Director.

| Before | After |
|---|---|
| Six tabs in one row, mixing two jobs | Two labelled, numbered sections in working order: **Teaching timetable** (1 Courses, 2 Units & groups, 3 Lecturers, 4 Times) and **Exams** (1 Exams, 2 Invigilators) |
| Download and *Publish to the Director* at the top of the page, disappearing on the exam tabs | Teaching's actions sit under the tabs, next to the teaching content; the top of the page no longer changes between tabs |
| Three buttons: PDF, Word, Excel | One **Download ▾** menu |
| Exams: two *Upload exam list* buttons; a 3-line explanation; *Moderation letter* shown disabled with no papers | One upload button; one-line hint; *Moderation letter* appears once there are papers |
| Invigilators: a 2-line waiting message; "0 of 0 invigilators named" | One line: "Waiting for the Director's exam draft…"; the count only shows when there are papers |
| "1 units · 0 of 1 groups" | "1 unit · 0 of 1 group" |

Unchanged on purpose: the pink row for a unit with no lecturer, and the
L / P / CF / When columns.

Files: `src/portals/department/teaching/TeachingPage.tsx`, `ExamsTab.tsx`, `InvigilatorsTab.tsx`.


## Theme button everywhere (12 Nov 2026)

The light / dark / system theme button was only in the signed-in headers (and, in
the SMARTTT app, only on the Profile screens). It is now on every screen people land on:
every sign-in page and the landing page (`src/auth/AuthShell.tsx`, top right), as well as every portal header as before.
