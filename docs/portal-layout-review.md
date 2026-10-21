# Portal layout review

How every portal (student, lecturer, department, faculty, QA, admin) and the two timetable
apps should arrange navigation, pages and actions so that a new user can find their way
without training. Written 2026-10-20 after the SMARTTT theme work. Findings come from reading
the code on `wayler` (commit 7d7dc8e). Each correction is marked by priority:

- **P1:** something users cannot do today, or a page that misleads.
- **P2:** inconsistency a new user will trip over.
- **P3:** repetition in the code that makes P2 problems come back.

## 1. What users already expect

New staff arrive having used Gmail, Moodle, the university's student portal, SMARTTT and
banking apps. Matching those habits is cheaper than training. *Users spend most of their time
on other sites, so they prefer yours to work the same way* ([Jakob's Law, NN/g][jakob]). In
practice this means:

| Convention | Where users have learned it | Rule for our portals |
| --- | --- | --- |
| Main sections in a left sidebar on desktop, a bottom bar on phones | Moodle, Google Workspace, SMARTTT, banking apps | Keep it. **3–5 items in the bottom bar**; more go behind "More" ([Android navigation guidance][android-nav]) |
| Account menu top right: avatar → profile, password, sign out | Nearly every web app | **Every portal**, on every screen size |
| The first item is "Dashboard" or "Home": a summary that links onward | All of the above | Keep it, and make every number on it clickable |
| Nav label = page title | Everyday web use | The link you click is the heading you land on ([information scent][scent]) |
| List page: title, then a primary button on the right ("Invite officer", "Add faculty"), then search/filters, then the table | Google Admin, Microsoft 365 admin, GitHub, Moodle admin | Same order on every list page |
| Tables: find, compare, open one row, act on rows | — | Every table supports all four ([NN/g data tables][tables]) |
| Deep pages show where you are | Breadcrumbs on most admin sites | Breadcrumbs from level 3 down ([NN/g breadcrumbs][crumbs]) |
| Destructive actions name what will happen, in the app's own dialog | — | No browser `confirm()` pop-ups; prefer undo for reversible actions ([confirmation guidance][confirm]) |
| Nothing important hidden behind a gesture | — | No double-tap or swipe-only features ([hidden gestures][gestures]) |

## 2. One shell for every portal

All portals should share one frame. Most already do; the gaps are listed in §3.

```
┌──────────────┬──────────────────────────────────────────────────────┐
│ Portal name  │  Page title                          [ ? ] [ Avatar ▾]│  ← account menu:
│              │  one-line description             [Primary action]   │    Profile
│ ▸ Dashboard  ├──────────────────────────────────────────────────────┤    Change password
│              │  Search · Filters                                     │    Sign out
│ PEOPLE       │  ┌────────────────────────────────────────────────┐  │
│ ▸ Lecturers  │  │ table / cards                                   │  │
│ ▸ Students   │  └────────────────────────────────────────────────┘  │
│ TEACHING     │                                                      │
│ ▸ Units …    │                                                      │
│ REPORTS …    │                                                      │
└──────────────┴──────────────────────────────────────────────────────┘
Phone: same top bar; sidebar becomes a bottom bar of ≤5 items, the rest under "More".
```

**Ordering rule for every sidebar:** Dashboard first. Then the things the role does daily, then
the reference lists, then the periodic reports. Management and settings go last. Items that
appear in more than one portal keep the **same label, icon and relative position** everywhere.

## 3. Findings and corrections

### P1: users cannot do something

1. **Department, faculty and QA officers cannot sign out on phones or tablets.** Sign-out
   lives only in the desktop sidebar (`portals/{department,faculty,qa}/layout/Sidebar.tsx`).
   Below 1024px it is gone. The header avatar is a plain `<span>`, not a link, and these
   portals have no profile page, so there is also nowhere to change a password.
   **Fix:** an account menu in the shared header (§2) for every role, plus an officer profile
   page reusing `ChangePasswordCard`.
2. **QA officers cannot be invited.** The admin invite form offers only "Faculty officer" and
   "Administrator" (`portals/admin/OfficersPage.tsx`). QA accounts exist only through
   `ATTENDANCE_backend/scripts/dev-seed-qa.mjs`. **Fix:** add "QA officer" to the admin invite
   roles. This needs a backend invite route for the `qa` role.
3. **Students can reach their profile only from the home header**, which shows only on
   `/student-dashboard`, hides itself on scroll and toggles on a double-tap
   (`StudentLayout.tsx`). **"My Units" has no nav entry at all**; it is reachable only from a
   link on the Progress page. **Fix:** see the student nav in §4, and remove the double-tap.

### P2: inconsistent, so harder to learn

4. **Nav labels don't match page titles.** Each pair should become one name:

   | Portal | Nav says | Page title says | Use |
   | --- | --- | --- | --- |
   | Lecturer | Attendance | Attendance Reports | Attendance |
   | Lecturer (dashboard button) | Reports | Attendance Reports | Attendance |
   | Department, Faculty | Dashboard | Performance Dashboard | Dashboard |
   | QA | Dashboard | KPI Dashboard | Dashboard |
   | Department, Faculty | Evaluations | Course Evaluations | Course Evaluations (as QA already says) |
   | QA | Checklists | Checklist Templates | Checklists |
   | Faculty | Officers | Department Officers | Department Officers |
   | Admin | Officers (at `/admin`) | Officers | Officers, moved to `/admin-officers` (`/admin` becomes the dashboard) |

5. **The header avatar behaves differently per portal.** It is a link to the profile for the
   lecturer and admin, a plain span for department, faculty and QA, and only on the home page
   for students. **Fix:** the same account menu everywhere.
6. **The lecturer sidebar has "My Profile"; the lecturer bottom bar doesn't.** With the account
   menu in place, remove "My Profile" from the sidebar so both navs list the same four items.
7. **Dashboards repeat the nav instead of answering "what needs me today?".** The department
   and faculty dashboards end with Lecturers / Students / Units cards that duplicate the
   sidebar. The lecturer dashboard's Reports / Students / Add Unit buttons do the same, and
   under a different name. The stat cards are not clickable even though each one has a page
   behind it. **Fix:**
   - Make each `StatCard` a link to its list, pre-filtered where it makes sense ("Avg.
     attendance" → Students sorted by rate).
   - Replace the quick-link row with a **"Needs attention"** list: students not eligible or at
     risk, lecturers mostly late, evaluation rounds open or closing, and (for QA) overdue
     corrective actions. Each row is a link.
   - On the lecturer dashboard keep **Activate Class** as the one big action and drop the three
     buttons that repeat the nav.
8. **Only the three Students tables can be sorted.** Lecturers, Units, Courses, Departments,
   eligibility and admin tables can be searched but not sorted. **Fix:** sortable column
   headers (with `aria-sort`) on every table. Clicking a row always opens its detail page.
9. **Faculty has 10 sidebar items in one flat list.** **Fix:** group them under small headings
   (§4) and use the same groups in the department and QA portals.
10. **Deep pages have only a back link.** Pages like Faculty › Departments › Computer Science ›
    Lecturer lose the middle levels. **Fix:** breadcrumbs on level-3+ pages (department detail,
    lecturer detail, audit detail, checklist detail, evaluation results).
11. **Eight places use the browser's `window.confirm`.** Those are `DeleteAccountButton`,
    `ShareLocationPage`, `UnitStudentsPage`, admin `DepartmentsPage`, `OfficersTable`,
    `FaceCheckInCard`, QA `EvaluationDetailPage` and `LiveSessionPage`. That dialog ignores the
    theme, can't be styled for danger, and says "OK" instead of the action. **Fix:** one
    `ConfirmDialog` with a specific title and an action-named button ("Remove access"), focus
    on Cancel. Use typed confirmation only for merging departments and deleting accounts.
12. **Student "Evaluate" is a permanent tab for a seasonal task.** It sits empty for most of
    the semester. **Fix:** see the student nav in §4.

### P3: repetition to remove

13. **The four portal sidebars are ~98% identical, and the five layouts 67–84% identical.**
    That is how the lecturer sidebar ended up with an invisible title while the others were
    fine. **Fix:** one `PortalShell({ name, nav, signOutTo })` with a shared `PortalSidebar`,
    the existing `PortalBottomNav`, and the account menu. The admin layout should use it too;
    today it is a separate implementation.
14. **Department and faculty pages are near-copies.** Students 88%, Lecturer detail 83%,
    Lecturers 81%, Overview 74%, Units 73%. `components/oversight/EligibilityReport` already
    shows the right pattern: move each shared page into `components/oversight/` and pass the
    scope (department or faculty) and its API hooks. Fixes then land in both portals at once.
15. **39 files hand-write the same error card with a Retry button.** **Fix:** one
    `<QueryState query={…}>` wrapper for loading skeleton, error + retry, and empty state.
16. **Page headers are written per page.** **Fix:** one `PageHeader({ title, description,
    action })`. The shell supplies the title from the route `handle`, so the label/title
    mismatch in #4 can't come back.

## 4. Proposed navigation per portal

Bold = also in the phone bottom bar (max 5; the rest under "More").

**Student** (phone-first):
- **Home**: next class, Scan QR, "Course evaluation open" banner when a round is open.
- **Units**: the existing My Units page. Each unit shows an "Evaluate" button when its round is open.
- **History**
- **Progress**
- **Account**: profile, face check-in, password, sign out.

Course evaluations move off the bar into Home and Units, where they appear only when they
apply. The `/student-evaluations` page stays and is linked from both.

**Lecturer:**
- **Dashboard**: Activate Class plus today's sessions.
- **Attendance**: sessions and reports.
- **Units**
- **Students**
- Profile moves to the account menu.

**Department officer:**
- **Dashboard**
- *People*: **Lecturers**, **Students**
- *Teaching*: **Units**, Courses
- *Reports*: Exam Eligibility, Course Evaluations

**Faculty officer:**
- **Dashboard**
- *People*: **Lecturers**, **Students**
- *Teaching*: Units, Courses
- *Reports*: Exam Eligibility, Course Evaluations
- *Faculty*: **Departments**, Department Officers, Placement

People and Teaching come first and in the same order as the department portal, so an officer
moving up a level finds the same things in the same place. Faculty-only management sits
last.

**QA officer:**
- **Dashboard**
- *Quality*: **Standards**, **Checklists**, **Audits**, Corrective Actions
- *Reports*: Exam Eligibility, Course Evaluations

The Reports group uses the same two labels, in the same order, as the department and faculty
portals.

**Admin:**
- **Dashboard** (new)
- *People*: **Officers**, **Lecturers**
- *Organisation*: **Faculties**, Departments
- *System*: Activity log (new)

## 5. Admin console

The admin console is where mistakes cost the most and where users visit least often, so it
must be the most predictable. It should follow the list → detail → action pattern of Google
Admin and Microsoft 365 admin.

1. **Dashboard at `/admin`.** It answers "is anything waiting for me?":
   - pending invitations (and expired ones to re-send)
   - lecturers with no department
   - duplicate departments awaiting a merge
   - officers who never signed in
   - counts of faculties, departments and officers

   Each item links to the filtered list.
2. **List first, form on demand.** Officers currently opens with the invite form above the
   table. Put the table first, with an **Invite officer** button at the top right of the page
   header. The button opens a side panel holding the form. Do the same for Add faculty.
   Faculty officers inviting department officers use the same component, so they get the
   same pattern.
3. **Officers table:**
   - search by name or email
   - filters for role (Admin / Faculty / Department / QA) and status (Active / Invited /
     Removed)
   - sortable "Last sign-in"
   - row actions (Re-send invite, Remove access) in a `⋯` menu, so the columns stay readable
     on narrow screens
4. **Every change confirms with a toast and, where it can be reversed, offers Undo:** moving
   a lecturer, removing a spelling, re-sending an invite. Removing access and merging
   departments use `ConfirmDialog` (#11), stating what changes ("Their invitation link stops
   working and they are signed out now").
5. **Faculties and departments need edit and rename,** not only add. Today faculties can only
   be created; a typo in a faculty name can only be fixed in the database.
6. **Activity log (new):** who invited, removed, moved or merged what, and when. Searchable
   by person, action and date. It answers "who changed this?" without a database query, and
   suits a university's audit expectations ([audit-log practice][admin]). Needs a backend
   table; the actions are already all admin-only routes.

## 6. Timetable Allocator and Generator

These are admin tools for the timetabling office and department CODs. They should follow the
same rules.

- **Generator:**
  - On a term page the top bar highlights **Home**, not **Terms**
    (`App.tsx`: `to === '/' && onTerm`). Highlight Terms.
  - Home and Terms overlap: Home already jumps to the last term. Either make Home a real
    dashboard (current term's readiness, last run, drafts awaiting approval) or drop it and
    let Terms be the landing page.
  - Give the term tabs (Term details → Class rows → Units and groups → Generate) step numbers.
    They are a sequence, and numbered steps tell a new user the order.
- **Allocator:**
  - `/progress` (all departments' progress for the timetabling office) exists but is not in
    the top bar. Add it for office users.
  - Rename the single nav item "Course allocation" to match its page.
- **Both:**
  - Add an account menu (name → Sign out) at the top right instead of loose text.
  - Add page headers with a primary action on the right ("+ Add a lecture hall" is already
    there; make every list page follow it).
  - Use an in-app confirm instead of the browser's for deletes.

## 7. Suggested order of work

1. **P1 fixes:** account menu and officer profile (#1, #5), QA invite (#2), student nav (#3,
   #12). Small, and each removes a real dead end.
2. **`PortalShell` + `PageHeader` + `QueryState` (#13, #15, #16), then label fixes (#4, #6)
   and sidebar grouping (#9).** Doing the shared shell first makes the label and grouping
   changes one-line edits.
3. **Dashboards: clickable stats and "Needs attention" (#7).** This needs one small summary
   endpoint per role.
4. **Admin console (§5).** The activity log needs a backend table.
5. **Shared oversight pages (#14), sortable tables (#8), breadcrumbs (#10), ConfirmDialog
   (#11).**
6. **Timetable apps (§6).**

[jakob]: https://www.nngroup.com/videos/jakobs-law-internet-ux/
[android-nav]: https://developer.android.com/design/ui/mobile/guides/layout-and-content/layout-and-nav-patterns
[scent]: https://jakobnielsenphd.substack.com/p/information-scent
[tables]: https://www.nngroup.com/articles/data-tables/
[crumbs]: https://www.nngroup.com/articles/breadcrumbs/
[confirm]: https://primer.style/product/components/confirmation-dialog/guidelines
[gestures]: https://createwithswift.com/navigating-pitfalls-the-dos-and-donts-of-gestural-interfaces
[admin]: https://helix.tray.ai/guides/admin-dashboard/
