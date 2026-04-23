## API Spec

### GET /api/expenses
- **Purpose:** Retrieve all expenses, optionally filtered by category or date range
- **Query params:** `category` (string, optional), `from` (ISO date, optional), `to` (ISO date, optional)
- **Request body:** None
- **Success response:** `200 OK`
  ```json
  [
    {
      "id": 1,
      "amount": 42.50,
      "description": "Grocery run",
      "category": "Food",
      "date": "2026-04-20"
    }
  ]
  ```
- **Error responses:**
  - `500 Internal Server Error` — database failure

### GET /api/expenses/:id
- **Purpose:** Retrieve a single expense by ID
- **Request body:** None
- **Success response:** `200 OK`
  ```json
  { "id": 1, "amount": 42.50, "description": "Grocery run", "category": "Food", "date": "2026-04-20" }
  ```
- **Error responses:**
  - `404 Not Found` — no expense with that ID
  - `400 Bad Request` — ID is not a valid integer

### POST /api/expenses
- **Purpose:** Create a new expense
- **Request body:**
  ```json
  { "amount": 42.50, "description": "Grocery run", "category": "Food", "date": "2026-04-20" }
  ```
  - `amount`: number, required, > 0
  - `description`: string, required, non-empty
  - `category`: string, required (must match a known category)
  - `date`: string (ISO date YYYY-MM-DD), required
- **Success response:** `201 Created`
  ```json
  { "id": 2, "amount": 42.50, "description": "Grocery run", "category": "Food", "date": "2026-04-20" }
  ```
- **Error responses:**
  - `400 Bad Request` — missing/invalid fields
  - `500 Internal Server Error` — database failure

### PUT /api/expenses/:id
- **Purpose:** Update an existing expense
- **Request body:** same shape as POST (all fields required)
- **Success response:** `200 OK`
  ```json
  { "id": 1, "amount": 55.00, "description": "Big grocery run", "category": "Food", "date": "2026-04-21" }
  ```
- **Error responses:**
  - `404 Not Found` — no expense with that ID
  - `400 Bad Request` — missing/invalid fields
  - `500 Internal Server Error` — database failure

### DELETE /api/expenses/:id
- **Purpose:** Delete an expense by ID
- **Request body:** None
- **Success response:** `204 No Content`
- **Error responses:**
  - `404 Not Found` — no expense with that ID
  - `500 Internal Server Error` — database failure

### GET /api/categories
- **Purpose:** Retrieve the list of valid expense categories
- **Request body:** None
- **Success response:** `200 OK`
  ```json
  ["Food", "Transport", "Housing", "Entertainment", "Health", "Other"]
  ```
- **Error responses:**
  - `500 Internal Server Error` — database failure

### GET /api/summary
- **Purpose:** Retrieve aggregate totals per category for a given month
- **Query params:** `month` (YYYY-MM, required)
- **Request body:** None
- **Success response:** `200 OK`
  ```json
  {
    "month": "2026-04",
    "total": 320.75,
    "byCategory": [
      { "category": "Food", "total": 120.00 },
      { "category": "Transport", "total": 45.50 }
    ]
  }
  ```
- **Error responses:**
  - `400 Bad Request` — missing or malformed `month` param
  - `500 Internal Server Error` — database failure

---

## DB Schema

### Table: `expenses`

| Column      | SQLite Type | Constraints                          |
|-------------|-------------|--------------------------------------|
| id          | INTEGER     | PRIMARY KEY AUTOINCREMENT            |
| amount      | REAL        | NOT NULL, CHECK(amount > 0)          |
| description | TEXT        | NOT NULL                             |
| category    | TEXT        | NOT NULL                             |
| date        | TEXT        | NOT NULL (stored as YYYY-MM-DD)      |
| created_at  | TEXT        | NOT NULL DEFAULT (datetime('now'))   |

- No foreign keys (single-table design for minimal scope)
- `category` is validated in application logic against a fixed list
- `date` is stored as ISO-8601 text for easy range-query with string comparison

### Table: `categories`

| Column | SQLite Type | Constraints               |
|--------|-------------|---------------------------|
| id     | INTEGER     | PRIMARY KEY AUTOINCREMENT |
| name   | TEXT        | NOT NULL UNIQUE           |

- Seeded on first run with: Food, Transport, Housing, Entertainment, Health, Other

---

## Component Tree

### `App`
- **Route:** all routes (shell/layout component)
- **Props:** none
- **Data:** none
- **API calls:** none
- **Children:** `NavBar`, `<Routes>` containing page components

---

### `NavBar`
- **Route:** persistent (inside `App`)
- **Props:** none
- **Data:** none
- **API calls:** none
- **Children:** navigation links to `/` and `/summary`

---

### `ExpenseListPage`
- **Route:** `/`
- **Props:** none
- **Data:** fetches all expenses; fetches categories for filter dropdown
- **API calls:**
  - `GET /api/expenses` (with optional query params for filtering)
  - `GET /api/categories`
- **Children:** `FilterBar`, `ExpenseTable`, `AddExpenseButton`

---

### `FilterBar`
- **Route:** `/` (inside `ExpenseListPage`)
- **Props:**
  - `categories: string[]`
  - `selectedCategory: string`
  - `fromDate: string`
  - `toDate: string`
  - `onChange: (filters) => void`
- **Data:** none (receives data via props)
- **API calls:** none
- **Children:** none

---

### `ExpenseTable`
- **Route:** `/` (inside `ExpenseListPage`)
- **Props:**
  - `expenses: Expense[]`
  - `onEdit: (expense: Expense) => void`
  - `onDelete: (id: number) => void`
- **Data:** receives expenses via props
- **API calls:** none (delete triggered by parent)
- **Children:** `ExpenseRow` (one per expense)

---

### `ExpenseRow`
- **Route:** `/` (inside `ExpenseTable`)
- **Props:**
  - `expense: Expense`
  - `onEdit: (expense: Expense) => void`
  - `onDelete: (id: number) => void`
- **Data:** receives expense via props
- **API calls:** none
- **Children:** none

---

### `AddExpenseButton`
- **Route:** `/` (inside `ExpenseListPage`)
- **Props:**
  - `categories: string[]`
  - `onCreated: () => void`
- **Data:** none
- **API calls:** none
- **Children:** triggers `ExpenseFormModal` when clicked

---

### `ExpenseFormModal`
- **Route:** `/` (modal overlay)
- **Props:**
  - `expense: Expense | null` (null = create mode, non-null = edit mode)
  - `categories: string[]`
  - `onSave: () => void`
  - `onClose: () => void`
- **Data:** controlled form state
- **API calls:**
  - `POST /api/expenses` (create mode)
  - `PUT /api/expenses/:id` (edit mode)
- **Children:** none

---

### `SummaryPage`
- **Route:** `/summary`
- **Props:** none
- **Data:** fetches monthly aggregate totals
- **API calls:**
  - `GET /api/summary?month=YYYY-MM`
- **Children:** `MonthPicker`, `SummaryChart`, `SummaryTable`

---

### `MonthPicker`
- **Route:** `/summary` (inside `SummaryPage`)
- **Props:**
  - `value: string` (YYYY-MM)
  - `onChange: (month: string) => void`
- **Data:** none
- **API calls:** none
- **Children:** none

---

### `SummaryChart`
- **Route:** `/summary` (inside `SummaryPage`)
- **Props:**
  - `byCategory: { category: string; total: number }[]`
- **Data:** receives data via props
- **API calls:** none
- **Children:** none (renders a bar chart using a charting library)

---

### `SummaryTable`
- **Route:** `/summary` (inside `SummaryPage`)
- **Props:**
  - `month: string`
  - `total: number`
  - `byCategory: { category: string; total: number }[]`
- **Data:** receives data via props
- **API calls:** none
- **Children:** none
