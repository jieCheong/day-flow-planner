# Plan

Four areas of work. Items 1–3 are local features; item 4 adds accounts and cloud persistence.

## 1. Week board CRUD + "Completed" inside Edit block

**Week view (`src/routes/week.tsx`)**
- Click an empty slot in any day column → opens `BlockEditor` in create mode for that date/time (same behavior as Day view).
- Click an existing block → opens `BlockEditor` in edit mode.
- Add a small `+` button at the top of each day column to add a block to that day quickly.
- Delete is already available inside `BlockEditor` (red "Delete" link); confirmed working for edit mode.

**Completed control inside Edit block** (matches the screenshot)
- Add a row in `BlockEditor` above the action buttons:
  - A toggle/checkbox labeled "Mark as completed" with a green `Check` icon.
  - When on, shows a green pill "Completed"; when off, shows muted "Not completed".
- Saves `completed` via `updateBlock`. New blocks default to `false`.
- Remove the timeline's separate toggle button (or keep it as a shortcut) since the edit dialog now owns the state — keep the click-the-badge shortcut, the dialog is the canonical editor.

## 2. Onboarding survey + auto daily schedule

**Onboarding survey (`src/components/dayflow/OnboardingDialog.tsx`)**
- Opens once on first load (flag in zustand: `onboardedAt`), and re-openable from the sidebar ("Personalize schedule").
- Fields:
  - Wake up time, Sleep time
  - Breakfast, Lunch, Dinner times (each 30 min default, editable)
  - Gym time + days of week (or "skip")
  - Work/study focus window (start–end)
- On submit: writes/updates built-in categories (`sleep`, `personal` meals, `gym`) with `recurring` rules and `defaultStart`/`defaultDuration`, and stores prefs in `useDayflow` under `prefs`.

**Auto-generate day (`src/lib/dayflow/autoDay.ts`)**
- New action `generateDay(dateISO, fixedEvents?)`:
  - `fixedEvents`: array of `{ title, start, end, category? }` the user can add for the day (e.g. "Interview 2–4 PM").
  - Lays down fixed events first.
  - Lays down recurring built-ins from prefs (sleep, meals, gym).
  - Fills remaining gaps with planned work blocks proportional to each category's `budgetMinutes`, respecting category caps and the focus window for project/study/leetcode.
- Day view adds two buttons in the toolbar: "Auto-plan day" and "Add fixed event" (opens BlockEditor with a `priority` flag — fixed events are just normal blocks but won't be moved by auto-plan).
- Auto-plan replaces only non-completed, non-fixed blocks for the date.

## 3. New "Goals" section (`/goals`)

- Sidebar gets a "Goals" item.
- `src/routes/goals.tsx` lists user goals.
- Goal model (in store): `{ id, title, metric?, target?, unit?, startDate, deadline, cadence: 'daily'|'weekly', habits: GoalHabit[], checkins: {weekISO, note, progress}[] }`.
- `GoalHabit`: `{ id, title, category?, minutesPerOccurrence, perWeek }` (e.g. "Run 30 min × 4/week").
- Create-goal dialog:
  - Title, target ("Lose 10 lbs"), deadline (3 months from today by default).
  - Auto-suggests a starter habit list based on common keywords (lose weight → gym + walk + calorie log; learn X → study blocks; ship project → project hours). Free-form add/edit.
- Goal detail page:
  - Progress bar by elapsed time vs. weighted habit completion.
  - "Apply to schedule" button — generates recurring entries / boosts category budgets so auto-plan respects the goal.
  - Weekly check-in card (auto-pinned on Sunday): rating slider + note + actual progress; saved to `checkins`.

## 4. Accounts + cloud persistence

- Add `/auth` page (email + password sign-in and sign-up).
- Protect `/`, `/week`, `/month`, `/analytics`, `/goals` behind authentication — redirect to `/auth` if no session.
- Persist `categories`, `blocks`, `tasks`, `reflections`, `prefs`, `goals` to the backend database, keyed by `user_id`.
- Keep the Zustand store as an in-memory cache; hydrate on sign-in via `GET /api/sync`, write-through on each mutation via the REST API.
- Local-only data (pre-sign-in) is migrated into the account on first sign-in — confirm if you want a fresh slate instead.

## Technical notes
- New helper `buildDay(prefs, categories, fixedBlocks, dateISO)` returns a list of TimeBlocks; pure function for testability.
- BlockEditor gains a `completed` field + a `fixed` flag (default false). `TimeBlock` adds `fixed?: boolean`.
- Database tables: `time_blocks`, `tasks`, `goals`, `categories`, `reflections`, `user_prefs` — all keyed by `user_id`.
- Survey writes to `user_prefs` table (single row per user).

## Open question
For sign-in: keep existing local data and merge into the new account, or start fresh in the cloud?
