## Contract Audit

Verifying each API endpoint against the design spec, backend routes, and frontend api.js:

**GET /api/expenses**
OK: GET /api/expenses — Ktor route implemented at correct path; React calls `getExpenses()` with URLSearchParams for filters; response shape `Expense[]` matches frontend destructuring.

**GET /api/expenses/:id**
OK: GET /api/expenses/{id} — Ktor route implemented; React `getExpense(id)` calls the correct path; `Expense` response shape matches.

**POST /api/expenses**
MISMATCH: POST /api/expenses — Backend returns `HttpStatusCode.OK` (200) instead of the spec-required `HttpStatusCode.Created` (201). Frontend `createExpense()` does not check the status code so it currently works, but the spec requires 201 and it breaks any standards-compliant client.

**PUT /api/expenses/:id**
OK: PUT /api/expenses/{id} — returns 200 with updated expense; frontend sends the correct body shape; 404 on missing record.

**DELETE /api/expenses/:id**
OK: DELETE /api/expenses/{id} — returns 204 on success, 404 when record is not found; frontend calls correct path.

**GET /api/categories**
OK: GET /api/categories — returns sorted string array; frontend destructures it directly as `string[]`.

**GET /api/summary**
OK: GET /api/summary?month=YYYY-MM — Ktor route matches; React `getSummary(month)` calls the correct path; `SummaryResponse` shape (`month`, `total`, `byCategory`) matches what `SummaryPage` destructures.

---

## Frontend Review

**App** — exists; defines both routes; renders NavBar. No loading or error states needed at this level. No PropTypes needed (no props). ✓

**NavBar** — exists; uses NavLink with active styling; no data fetching required. ✓

**ExpenseListPage** — exists; loading and error states implemented; orchestrates filter, table, modal correctly. No PropTypes needed (no props). ✓

**FilterBar** — exists; PropTypes defined; controlled inputs for category, from, to; Clear button works. ✓

**ExpenseTable** — exists; PropTypes defined; handles empty state with a message. ✓

**ExpenseRow** — exists; PropTypes defined; displays category badge and action buttons. ✓

**AddExpenseButton** — exists; PropTypes defined; opens modal in create mode. ✓

**ExpenseFormModal** — exists; PropTypes defined; handles both create and edit mode via `expense` prop; loading/error state during save. ✓

**SummaryPage** — exists; loading and error states implemented; passes data down to children. No PropTypes needed. ✓

**MonthPicker** — exists; PropTypes defined; simple controlled `<input type="month">`. ✓

**SummaryChart** — exists; PropTypes defined; handles empty data; CSS-only bar chart scaled to max value. ✓

**SummaryTable** — exists; PropTypes defined; shows per-category totals and percentage share with a grand total footer. ✓

**Overall frontend quality: 4/5** — All components are present, handle loading/error states, and define PropTypes. The `index.html` entry file is missing from frontend_output.md (Vite requires it), which will prevent `npm run dev` from serving the app.

---

## Backend Review

**GET /api/expenses** — Fully implemented; uses Exposed query composition for optional filters; correct 200 response; try/catch present. ✓

**GET /api/expenses/{id}** — Fully implemented; returns 404 on missing record; 400 on non-integer id; try/catch present. ✓

**POST /api/expenses** — Implemented but returns HTTP 200 instead of 201; `insert { }` used correctly; `stmt[Expenses.id].value` retrieves generated id correctly; try/catch present. ✗ (wrong status code)

**PUT /api/expenses/{id}** — Fully implemented; checks update count to detect 404; returns 200 with updated resource; try/catch present. ✓

**DELETE /api/expenses/{id}** — Fully implemented; checks `deleteWhere` count to detect 404; returns 204; `SqlExpressionBuilder.eq` imported correctly. ✓

**GET /api/categories** — Fully implemented; returns alphabetically sorted list; try/catch present. ✓

**GET /api/summary** — Fully implemented; regex validates YYYY-MM format; groups by category in memory; returns correct `SummaryResponse` shape. ✓

No raw SQL string interpolation found — all queries use Exposed parameterised query builders. No SQL injection risk.

**Overall backend quality: 4/5** — Complete implementation with correct error handling throughout; the single issue is the wrong HTTP status on POST create.

---

## Priority 1 — Fix Before Running

```
File: backend/src/main/kotlin/com/app/routes/ExpenseRoutes.kt
Issue: POST /api/expenses returns HTTP 200 (OK) instead of HTTP 201 (Created) as required by the API spec.
Fix: Change `call.respond(HttpStatusCode.OK, created)` to `call.respond(HttpStatusCode.Created, created)` in the POST handler.
```

```
File: frontend/index.html
Issue: Vite requires a root index.html file at the project root (frontend/index.html) with a <script type="module" src="/src/main.jsx"> tag. Without it, `npm run dev` will fail immediately.
Fix: Create frontend/index.html with the following content:
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Expense Tracker</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

---

## Priority 2 — Fix Before Shipping

```
File: backend/src/main/kotlin/com/app/DatabaseFactory.kt
Issue: `createdAt` column is seeded with the hardcoded string "now" rather than the actual current timestamp. SQLite's DEFAULT (datetime('now')) only applies on INSERT when the column is omitted; explicitly setting it to the literal string "now" stores invalid data.
Fix: Remove the `it[Expenses.createdAt] = ...` line from seedExpenses() so Exposed uses the column default, OR set it to java.time.LocalDateTime.now().toString().
```

```
File: backend/src/main/kotlin/com/app/routes/ExpenseRoutes.kt
Issue: The summary endpoint uses Kotlin in-memory groupBy after fetching all matching rows. For large datasets this loads unnecessary data into JVM heap.
Fix: Use Exposed's groupBy + sum aggregate directly in the query for the summary calculation.
```

---

## Priority 3 — Nice to Have

- `FilterBar`: debounce the date inputs so the API is not called on every keystroke.
- `SummaryChart`: add aria-label attributes to the bar elements for screen reader accessibility.
- `ExpenseFormModal`: move focus to the first input field when the modal opens (use a `useEffect` with a ref).
- Backend: add an `ORDER BY date DESC` to the seed expenses so the list page shows them in chronological order consistently.
- Backend: validate that `category` in `CreateExpense` is one of the values in the `categories` table rather than accepting arbitrary strings.

---

## Quick Win

The missing `frontend/index.html` file will break the dev server immediately. It takes under 30 seconds to add.

**Before** (file does not exist):
```
frontend/
  package.json
  vite.config.js
  src/
    main.jsx   ← references #root div that doesn't exist yet
```

**After** — create `frontend/index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Expense Tracker</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

This single file unblocks the entire frontend from running.
