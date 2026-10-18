# Faculties, departments and QA: how the system compares to the university

This note explains how the attendance system models faculties, departments and quality assurance (QA), how those
work at a Kenyan university and at Tharaka University in particular, and where the two differ. It ends with one
backend bug and the questions the team needs answered.

Written 18 October 2026, from the backend's own READMEs, migrations and code (`wayler` branch) and from public
sources listed at the end. Tharaka's Charter and statutes could not be read online, so the Tharaka-specific points
should be confirmed with the Registrar (Academic Affairs) before they are relied on.

---

## 1. How the system works

### The roles

```
Administrator    creates faculties; invites administrators and faculty officers
      │
Faculty officer  creates departments; provides courses to them; invites department officers;
      │          compares its departments side by side
      │
Department officer  decides how many sections a course needs; allocates its own lecturers to them

QA officer       outside the chain: institution-wide standards, audits and corrective actions
```

- None of these roles can sign up. Each is invited by the role above, gets an email link, chooses a password and
  signs in at `/oversight`. Students and lecturers sign in with their SMARTTT accounts instead.
- Apart from course provisioning, invitations and account deletion, every one of them is read-only.

### A unit's department is derived, never stored

`units` has no `department_id` column. A unit belongs to its lecturer's department:

```
units.lecturer_user_id → lecturer_profiles.department_id → departments.faculty_id
```

Every department query starts from "the lecturers in this department", and every faculty query widens that by one
join. Storing the department on the unit as well would allow the two copies to disagree when a unit changes hands.

The consequence: **a lecturer with no `department_id` is invisible** to every department and faculty figure, along
with all their units, sessions and students. See section 4.

### Scoping

- An officer's department or faculty is read from their own profile row, never from the request, so there is no
  `departmentId` parameter to tamper with.
- Anything outside the officer's scope answers **404, not 403**, so an officer cannot probe for staff in other
  departments one id at a time.

### From course to class

1. **Faculty provides a course to a department** (`POST /faculties/departments/:id/courses`). It is typed in by
   hand, with no ERP check and no lecturer yet.
2. **The department sets how many sections it needs** (`PATCH /departments/courses/:id`), from 1 to 26.
3. **The department allocates one of its own lecturers to the next open section**
   (`POST /departments/courses/:id/segments`). This creates a real, already verified `units` row, so the lecturer
   can activate classes immediately. A lecturer from another department is refused.

| Offering | Unit code |
|---|---|
| `CSC102`, 1 section | `CSC102` |
| `CSC102`, 7 sections | `CSC102 GR A`, `CSC102 GR B`, … |

### The figures

- **Attendance rate:** for each class, students checked in ÷ students enrolled, averaged across classes. It is the
  lecturer dashboard's own formula, so department and lecturer figures agree.
- **Timekeeping:** minutes between the timetabled start and when the lecturer opened the class, with a 5-minute
  grace period. Classes with no timetable behind them are left out rather than counted as on time.
- **Empty means unknown:** a department with no classes yet shows "—", never 0%.
- **Deleted accounts are anonymised**, so past classes still count.

---

## 2. How a Kenyan university works

### Governance (Universities Act 2012)

| Body | Role |
|---|---|
| Council | Governing board. Approves statutes, policies and budget. |
| Senate | All academic matters: curricula, examinations, academic rules. |
| Management Board | Vice-Chancellor and deputies. Runs the university day to day. |

The Act leaves faculties and departments to each university's charter and statutes.

### Dean of faculty

- Academic and administrative head of the faculty; chairs the faculty board.
- Usually appointed by the Vice-Chancellor for about 3 years, renewable once.
- Sets rules across the departments and guides their chairs. Does not assign individual lecturers to classes.

### Chair of department (COD)

- Assigns teaching to the department's staff: which units, tutorials and practicals each lecturer takes.
- Keeps workloads fair and reports them upward.
- Usually chief internal examiner: setting, invigilation and marking.
- Is normally a senior lecturer who also teaches.

### Where courses come from

The department proposes a programme or unit, the faculty board reviews it, the Senate approves it, and the Commission
for University Education (CUE) accredits the programme. Each semester the department decides who teaches what, and
the timetable is usually produced centrally.

### Quality assurance

**External: CUE (the regulator)**
- Accreditation of programmes and of the institution is compulsory and reviewed continuously.
- Institutional audit: the university writes a self-assessment report (governance, staff, funding, teaching,
  research and more), peer reviewers visit, the university comments on the draft, CUE adopts the final report and
  the university acts on it.
- Every programme is peer reviewed at least every 5 years.
- The 2023 Universities Regulations require a QA policy, a staffed QA unit covering every campus, tools, a budget,
  and an annual report to CUE.

**Internal: the university's QA directorate**
- Institution-wide; reports to university management, not to deans.
- Often run as an ISO 9001:2015 quality system: internal audits, findings, corrective actions, checking the fix,
  management review.
- Also runs student course evaluations, monitors teaching across campuses, and prepares the reports for CUE.

### Attendance rules

There is no national rule; each Senate sets its own. Examples: two-thirds attendance to sit the exam (Kenyatta
University, Kirinyaga University); over 25% absence is an automatic fail (Daystar University).

---

## 3. Tharaka University

- **Legal basis:** Charter for Tharaka University, Legal Notice 168 of 2022. Formerly a Chuka University campus
  (2015) and Tharaka University College (2017).
- **Terms used:** "Faculty" and "Department". A department is headed by a **COD (Chair of Department)**.
- **Management:** a Vice-Chancellor, a Deputy Vice-Chancellor for Academic, Research & Student Affairs, a Deputy
  Vice-Chancellor for finance and planning, and Boards of Undergraduate and Postgraduate Studies.
- **QA:** a Directorate of Quality Assurance. The university is ISO 9001:2015 certified.
- **Attendance today:** "Class Attendance Sheets" are listed among the student downloads, so attendance is still
  taken on paper. The minimum attendance needed to sit exams was not found.

| Faculty | Departments |
|---|---|
| Physical Sciences, Engineering & Technology | Basic Sciences; Computer Science & ICT |
| Life Sciences & Natural Resources | Dryland Agriculture & Natural Resources |
| Business Studies | Business Administration |
| Humanities & Social Sciences | Humanities; Social Sciences |
| Education | Education |
| Law | Law |
| Health Sciences | Nursing |

---

## 4. Where the system matches, and where it doesn't

### Matches

| On paper | In the system |
|---|---|
| Faculty → department → lecturer | `faculties` → `departments` → `lecturer_profiles.department_id` |
| Dean oversees all departments, compares them | Faculty officer; `GET /faculties/departments` |
| COD allocates the department's lecturers to units | Department officer allocates its own lecturers to sections |
| Deans and CODs are appointed | Officer accounts are invite-only |
| QA directorate is institution-wide, outside the faculties | QA officer has no department or faculty; filters instead |
| ISO 9001 audit → finding → corrective action → verified → closed | The QA module's audit and CAPA workflow, same stages |
| Faculties with a single department (Law, Education, Nursing, Business) | Handled with no special case |

### Mismatches

1. **A unit's department follows its lecturer.** On paper a unit belongs to the department that owns the
   curriculum, whoever teaches it. At Tharaka, Basic Sciences very likely teaches maths, physics and chemistry units
   to other faculties' students (inferred, not confirmed). In the system those units count under Basic Sciences, and
   the Computer Science COD cannot allocate a Basic Sciences lecturer at all.
2. **Courses are created freely by the faculty officer.** On paper a course exists because it is on a curriculum
   the Senate approved and CUE accredited. The system has no record of programmes or curricula, so a faculty officer
   can create a course that is on no approved curriculum.
3. **Decisions take effect without approval.** On paper allocations and new courses are signed off by the dean or a
   board. In the system the department officer's allocation is immediate.
4. **CODs and deans are not lecturers in the system.** A real COD usually teaches too, so they would need two
   accounts: one to teach, one to oversee.
5. **A department may have no faculty.** The database allows it for data imported from the ERP; on paper every
   department sits in a faculty. Such a department is invisible to every faculty officer.

### Not yet in the system

- The exam-eligibility rule (minimum attendance). The threshold must be a setting, since it varies by university.
- Student course evaluations, a core QA activity.
- CUE-facing QA: the annual report and the self-assessment report. The QA module's README already lists this as a
  later phase.
- Campuses, which the 2023 Regulations require QA to cover.

---

## 5. Open bug: new lecturers never get a department

**Nothing in the running backend sets `lecturer_profiles.department_id`.** It is written in only two places:

- the one-off backfill in `ATTENDANCE_backend/db/migrations/021_departments.sql` (lecturers who existed then);
- the development script `ATTENDANCE_backend/scripts/dev-seed-department.mjs`.

Every SMARTTT sign-in copies the department and faculty **names** onto the profile
(`ATTENDANCE_backend/src/modules/auth/auth.smarttt.repository.ts`, around line 124) but never looks up the id.

In production, every lecturer who signs in for the first time after migration 021 therefore has
`department_id = NULL`. They and all their classes drop out of every department and faculty figure, and their
department cannot allocate them to a course. It does not show up locally because the seed script links the test
lecturers.

**Possible fix**, in the same SMARTTT sign-in update:

```sql
department_id = COALESCE((SELECT id FROM departments WHERE name = $4), department_id)
```

---

## 6. Questions for the team

**About the bug**
- When SMARTTT names a department that does not exist yet, should sign-in create it, or leave the lecturer
  unlinked until a faculty officer creates it?
- Do SMARTTT's department names exactly match the names faculty officers type? (`departments.name` is unique and
  matched exactly.)
- Should an officer be able to move a lecturer between departments by hand?

**About the model**
- Should a unit belong to the department that owns it rather than to its lecturer's, so that service teaching
  (e.g. Basic Sciences) counts correctly and cross-department allocation becomes possible?
- Should courses come from approved programmes (from SMARTTT or the ERP) instead of being typed in by faculty
  officers?

**For the university** (ask the Registrar (Academic Affairs) or the QA directorate)
- The university statutes: who appoints CODs and deans, and what they may approve.
- The examination regulations: the minimum attendance to sit exams.
- The QA manual or ISO procedures: how internal audits and corrective actions are recorded, so the QA module can
  match their real forms.

---

## Where to read in the code

| File | Covers |
|---|---|
| `ATTENDANCE_backend/src/modules/department/README.md` | Department scoping, figures, endpoints, course provisioning |
| `ATTENDANCE_backend/src/modules/faculty/README.md` | The same one level up, plus inviting department officers |
| `ATTENDANCE_backend/src/modules/admin/README.md` | The invitation chain and the first administrator |
| `ATTENDANCE_backend/src/modules/quality-assurance/README.md` | Standards, audits, corrective actions, KPI dashboard |
| `ATTENDANCE_backend/db/migrations/021_departments.sql` | Why `units` has no department column; the backfill |
| `ATTENDANCE_backend/db/migrations/023_course_offerings.sql` | Course offerings and sections |
| `ATTENDANCE_backend/docs/expected-schema.md` | Every table and column |

## Sources

- [Universities Act No. 42 of 2012 (revised 2024)](https://www.jkuat.ac.ke/directorate/aca/wp-content/uploads/2025/06/Universities-Act-42-of-2012_Revised-2024-04-26.pdf)
- [Universities Regulations 2023, Kenya Gazette Supplement No. 57](https://www.jkuat.ac.ke/directorate/aca/wp-content/uploads/2023/07/Universities-Regulations-2023.pdf)
- [CUE Universities Standards and Guidelines 2014](https://cesaam.egerton.ac.ke/images/accreditation/general/CUE_universities_standards_and_guidelines_2014.pdf)
- [CUE Quality Audit and Standards Division](https://www.cue.or.ke/index.php?Itemid=526&id=197&option=com_content&view=article)
- [CUE Self-Assessment Guidelines for Institutional Quality Audit (2017)](https://www.jkuat.ac.ke/directorate/aca/wp-content/uploads/2025/06/CUE-Guidelines-for-Self-Assessment-for-Institutional-Quality-Audit-2017-08.pdf)
- [CUE FAQ](https://www.cue.or.ke/index.php?option=com_content&view=article&id=16&Itemid=478)
- [Charter for Tharaka University, Kenya Law](https://new.kenyalaw.org/akn/ke/act/ln/2022/168/eng@2022-12-31)
- [Tharaka University website](https://www.tharaka.ac.ke/)
- [Tharaka Department of Computer Science & ICT](https://fpet.tharaka.ac.ke/home-department-of-ict/)
- [Tharaka University, Wikipedia](https://en.wikipedia.org/wiki/Tharaka_University)
- [Chuka University newsletter (2020)](https://www.chuka.ac.ke/storage/2022/07/Chuka-University-Newsletter.18.12.2020.PRESS_.pdf)
- [Kisii University Statutes](https://new.kenyalaw.org/akn/ke/act/ln/2020/153/eng@2022-12-31)
- [Masinde Muliro University Statutes](https://new.kenyalaw.org/akn/ke/act/ln/2024/119/eng@2024-08-02)
- [MKSU terms of service](https://dvc-apf.mksu.ac.ke/wp-content/uploads/2018/11/TERMS-OF-SERVICE-GRADE-11-15.pdf)
- [KeMU academic handbook](https://kemu.ac.ke/wp-content/uploads/assets/student%20handbook/KeMU%20Academic%20Handbook%20-%20ONLINE%20VERSION.pdf)
- [JKUAT Directorate of Academic Quality Assurance](https://www.jkuat.ac.ke/directorate/aca/)
- [Kenyatta University student course evaluation](https://www.ku.ac.ke/student-course-evaluation-semester-i-2025-2026/)
- [Kimani v Kenyatta University (2024)](https://sheriahub.com/cases/ke/caselaw/kimani-v-kenyatta-university-another-petition-e197-of-2023-2024-kehc-253-klr-constitutional-and-human-rights-25-january-2024-ruling)
- [Kirinyaga University student rules](https://students.kyu.ac.ke/student-pages/students-welfare/student-rules-regulations)
- [Daystar University FAQ](https://www.daystar.ac.ke/faqs.html)
