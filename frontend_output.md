```json
// FILE: frontend/package.json
{
  "name": "expense-tracker",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.0"
  },
  "devDependencies": {
    "vite": "^5.1.0",
    "@vitejs/plugin-react": "^4.2.1"
  }
}
```
Declares all npm dependencies and build scripts for the React + Vite project.

```js
// FILE: frontend/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
```
Configures Vite with the React plugin and proxies all `/api` requests to the Kotlin backend on port 3001 to avoid CORS issues in local development.

```jsx
// FILE: frontend/src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
```
Entry point that mounts the React app inside a `BrowserRouter` for client-side routing.

```jsx
// FILE: frontend/src/App.jsx
import { Routes, Route } from 'react-router-dom'
import NavBar from './components/NavBar.jsx'
import ExpenseListPage from './components/ExpenseListPage.jsx'
import SummaryPage from './components/SummaryPage.jsx'

export default function App() {
  return (
    <>
      <NavBar />
      <main style={{ padding: '1rem 2rem' }}>
        <Routes>
          <Route path="/" element={<ExpenseListPage />} />
          <Route path="/summary" element={<SummaryPage />} />
        </Routes>
      </main>
    </>
  )
}
```
Root component that declares the two application routes and renders the persistent navigation bar.

```js
// FILE: frontend/src/services/api.js
const BASE = '/api'

async function handleResponse(res) {
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`${res.status} ${text}`)
  }
  if (res.status === 204) return null
  return res.json()
}

// GET /api/expenses — returns all expenses, optional query params: category, from, to
export async function getExpenses(filters = {}) {
  const params = new URLSearchParams()
  if (filters.category) params.set('category', filters.category)
  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  const qs = params.toString()
  const res = await fetch(`${BASE}/expenses${qs ? '?' + qs : ''}`)
  return handleResponse(res)
}

// GET /api/expenses/:id — returns a single expense by id
export async function getExpense(id) {
  const res = await fetch(`${BASE}/expenses/${id}`)
  return handleResponse(res)
}

// POST /api/expenses — creates a new expense, returns the created object
export async function createExpense(data) {
  const res = await fetch(`${BASE}/expenses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return handleResponse(res)
}

// PUT /api/expenses/:id — updates an existing expense, returns updated object
export async function updateExpense(id, data) {
  const res = await fetch(`${BASE}/expenses/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return handleResponse(res)
}

// DELETE /api/expenses/:id — deletes an expense, returns null
export async function deleteExpense(id) {
  const res = await fetch(`${BASE}/expenses/${id}`, { method: 'DELETE' })
  return handleResponse(res)
}

// GET /api/categories — returns array of category name strings
export async function getCategories() {
  const res = await fetch(`${BASE}/categories`)
  return handleResponse(res)
}

// GET /api/summary?month=YYYY-MM — returns totals by category for a month
export async function getSummary(month) {
  const res = await fetch(`${BASE}/summary?month=${encodeURIComponent(month)}`)
  return handleResponse(res)
}
```
Exports one async function per API endpoint; each throws a descriptive `Error` on non-2xx responses.

```jsx
// FILE: frontend/src/components/NavBar.jsx
import { NavLink } from 'react-router-dom'
import styles from './NavBar.module.css'

export default function NavBar() {
  return (
    <nav className={styles.nav}>
      <span className={styles.brand}>Expense Tracker</span>
      <div className={styles.links}>
        <NavLink to="/" className={({ isActive }) => isActive ? styles.active : undefined}>
          Expenses
        </NavLink>
        <NavLink to="/summary" className={({ isActive }) => isActive ? styles.active : undefined}>
          Summary
        </NavLink>
      </div>
    </nav>
  )
}
```
Persistent navigation bar with links to the expenses list and monthly summary pages.

```css
/* FILE: frontend/src/components/NavBar.module.css */
.nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 2rem;
  background: #1e293b;
  color: #f8fafc;
}

.brand {
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: 0.03em;
}

.links {
  display: flex;
  gap: 1.5rem;
}

.links a {
  color: #94a3b8;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.15s;
}

.links a:hover {
  color: #f8fafc;
}

.active {
  color: #38bdf8 !important;
  border-bottom: 2px solid #38bdf8;
}
```
Styles the navigation bar with a dark background and highlighted active link.

```jsx
// FILE: frontend/src/components/ExpenseListPage.jsx
import { useState, useEffect, useCallback } from 'react'
import { getExpenses, getCategories, deleteExpense } from '../services/api.js'
import FilterBar from './FilterBar.jsx'
import ExpenseTable from './ExpenseTable.jsx'
import AddExpenseButton from './AddExpenseButton.jsx'
import ExpenseFormModal from './ExpenseFormModal.jsx'
import styles from './ExpenseListPage.module.css'

export default function ExpenseListPage() {
  const [expenses, setExpenses] = useState([])
  const [categories, setCategories] = useState([])
  const [filters, setFilters] = useState({ category: '', from: '', to: '' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingExpense, setEditingExpense] = useState(null)
  const [showModal, setShowModal] = useState(false)

  const loadCategories = useCallback(async () => {
    try {
      const data = await getCategories()
      setCategories(data)
    } catch (err) {
      console.error('Failed to load categories', err)
    }
  }, [])

  const loadExpenses = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getExpenses(filters)
      setExpenses(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { loadCategories() }, [loadCategories])
  useEffect(() => { loadExpenses() }, [loadExpenses])

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) return
    try {
      await deleteExpense(id)
      setExpenses(prev => prev.filter(e => e.id !== id))
    } catch (err) {
      alert('Delete failed: ' + err.message)
    }
  }

  const handleEdit = (expense) => {
    setEditingExpense(expense)
    setShowModal(true)
  }

  const handleModalClose = () => {
    setShowModal(false)
    setEditingExpense(null)
  }

  const handleSaved = () => {
    handleModalClose()
    loadExpenses()
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Expenses</h1>
        <AddExpenseButton categories={categories} onCreated={handleSaved} />
      </div>
      <FilterBar
        categories={categories}
        selectedCategory={filters.category}
        fromDate={filters.from}
        toDate={filters.to}
        onChange={setFilters}
      />
      {loading && <p>Loading...</p>}
      {error && <p className={styles.error}>Error: {error}</p>}
      {!loading && !error && (
        <ExpenseTable expenses={expenses} onEdit={handleEdit} onDelete={handleDelete} />
      )}
      {showModal && (
        <ExpenseFormModal
          expense={editingExpense}
          categories={categories}
          onSave={handleSaved}
          onClose={handleModalClose}
        />
      )}
    </div>
  )
}
```
Main page that orchestrates fetching, filtering, deleting, and opening the create/edit modal for expenses.

```css
/* FILE: frontend/src/components/ExpenseListPage.module.css */
.page {
  max-width: 900px;
  margin: 0 auto;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.error {
  color: #ef4444;
  font-weight: 500;
}
```
Constrains the page width and arranges the title and add button side-by-side.

```jsx
// FILE: frontend/src/components/FilterBar.jsx
import PropTypes from 'prop-types'
import styles from './FilterBar.module.css'

export default function FilterBar({ categories, selectedCategory, fromDate, toDate, onChange }) {
  const set = (key, value) => onChange(prev => ({ ...prev, [key]: value }))

  return (
    <div className={styles.bar}>
      <label className={styles.field}>
        Category
        <select value={selectedCategory} onChange={e => set('category', e.target.value)}>
          <option value="">All</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>
      <label className={styles.field}>
        From
        <input type="date" value={fromDate} onChange={e => set('from', e.target.value)} />
      </label>
      <label className={styles.field}>
        To
        <input type="date" value={toDate} onChange={e => set('to', e.target.value)} />
      </label>
      <button
        className={styles.clear}
        onClick={() => onChange({ category: '', from: '', to: '' })}
      >
        Clear
      </button>
    </div>
  )
}

FilterBar.propTypes = {
  categories: PropTypes.arrayOf(PropTypes.string).isRequired,
  selectedCategory: PropTypes.string.isRequired,
  fromDate: PropTypes.string.isRequired,
  toDate: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
}
```
Renders category dropdown and date range inputs, calling `onChange` whenever any filter changes.

```css
/* FILE: frontend/src/components/FilterBar.module.css */
.bar {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: flex-end;
  background: #f1f5f9;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  font-size: 0.85rem;
  color: #475569;
  gap: 0.25rem;
}

.field select,
.field input {
  padding: 0.35rem 0.5rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.25rem;
  font-size: 0.95rem;
}

.clear {
  padding: 0.4rem 0.9rem;
  background: #e2e8f0;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  font-size: 0.9rem;
}

.clear:hover {
  background: #cbd5e1;
}
```
Styles the filter bar as a horizontal row with soft background and consistent input sizing.

```jsx
// FILE: frontend/src/components/ExpenseTable.jsx
import PropTypes from 'prop-types'
import ExpenseRow from './ExpenseRow.jsx'
import styles from './ExpenseTable.module.css'

export default function ExpenseTable({ expenses, onEdit, onDelete }) {
  if (expenses.length === 0) {
    return <p>No expenses found. Add one to get started!</p>
  }
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Date</th>
          <th>Description</th>
          <th>Category</th>
          <th className={styles.right}>Amount</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {expenses.map(exp => (
          <ExpenseRow key={exp.id} expense={exp} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </tbody>
    </table>
  )
}

ExpenseTable.propTypes = {
  expenses: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number.isRequired,
    amount: PropTypes.number.isRequired,
    description: PropTypes.string.isRequired,
    category: PropTypes.string.isRequired,
    date: PropTypes.string.isRequired,
  })).isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
}
```
Renders a table of expenses with column headers, delegating each row to `ExpenseRow`.

```css
/* FILE: frontend/src/components/ExpenseTable.module.css */
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.95rem;
}

.table th,
.table td {
  padding: 0.65rem 0.75rem;
  border-bottom: 1px solid #e2e8f0;
  text-align: left;
}

.table th {
  background: #f8fafc;
  font-weight: 600;
  color: #475569;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.right {
  text-align: right !important;
}
```
Styles the table with subtle borders and a soft header background.

```jsx
// FILE: frontend/src/components/ExpenseRow.jsx
import PropTypes from 'prop-types'
import styles from './ExpenseRow.module.css'

export default function ExpenseRow({ expense, onEdit, onDelete }) {
  return (
    <tr className={styles.row}>
      <td>{expense.date}</td>
      <td>{expense.description}</td>
      <td><span className={styles.badge}>{expense.category}</span></td>
      <td className={styles.amount}>${expense.amount.toFixed(2)}</td>
      <td className={styles.actions}>
        <button className={styles.edit} onClick={() => onEdit(expense)}>Edit</button>
        <button className={styles.delete} onClick={() => onDelete(expense.id)}>Delete</button>
      </td>
    </tr>
  )
}

ExpenseRow.propTypes = {
  expense: PropTypes.shape({
    id: PropTypes.number.isRequired,
    amount: PropTypes.number.isRequired,
    description: PropTypes.string.isRequired,
    category: PropTypes.string.isRequired,
    date: PropTypes.string.isRequired,
  }).isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
}
```
Renders a single table row with the expense data and Edit/Delete action buttons.

```css
/* FILE: frontend/src/components/ExpenseRow.module.css */
.row:hover {
  background: #f8fafc;
}

.amount {
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.badge {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  background: #e0f2fe;
  color: #0369a1;
  font-size: 0.8rem;
  font-weight: 500;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.edit,
.delete {
  padding: 0.25rem 0.6rem;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  font-size: 0.85rem;
}

.edit {
  background: #dbeafe;
  color: #1d4ed8;
}

.delete {
  background: #fee2e2;
  color: #b91c1c;
}
```
Styles each expense row with a category pill badge and colour-coded action buttons.

```jsx
// FILE: frontend/src/components/AddExpenseButton.jsx
import { useState } from 'react'
import PropTypes from 'prop-types'
import ExpenseFormModal from './ExpenseFormModal.jsx'
import styles from './AddExpenseButton.module.css'

export default function AddExpenseButton({ categories, onCreated }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button className={styles.btn} onClick={() => setOpen(true)}>
        + Add Expense
      </button>
      {open && (
        <ExpenseFormModal
          expense={null}
          categories={categories}
          onSave={() => { setOpen(false); onCreated() }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

AddExpenseButton.propTypes = {
  categories: PropTypes.arrayOf(PropTypes.string).isRequired,
  onCreated: PropTypes.func.isRequired,
}
```
Button that opens the `ExpenseFormModal` in create mode when clicked.

```css
/* FILE: frontend/src/components/AddExpenseButton.module.css */
.btn {
  padding: 0.5rem 1.1rem;
  background: #0ea5e9;
  color: #fff;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.btn:hover {
  background: #0284c7;
}

.btn:active {
  background: #0369a1;
}
```
Styles the primary action button in blue with hover and active states.

```jsx
// FILE: frontend/src/components/ExpenseFormModal.jsx
import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { createExpense, updateExpense } from '../services/api.js'
import styles from './ExpenseFormModal.module.css'

const today = () => new Date().toISOString().slice(0, 10)

export default function ExpenseFormModal({ expense, categories, onSave, onClose }) {
  const isEdit = expense !== null
  const [form, setForm] = useState({
    amount: '',
    description: '',
    category: categories[0] || '',
    date: today(),
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (isEdit) {
      setForm({
        amount: String(expense.amount),
        description: expense.description,
        category: expense.category,
        date: expense.date,
      })
    }
  }, [expense, isEdit])

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    const parsed = parseFloat(form.amount)
    if (isNaN(parsed) || parsed <= 0) {
      setError('Amount must be a positive number')
      return
    }
    const payload = { ...form, amount: parsed }
    setSaving(true)
    try {
      if (isEdit) {
        await updateExpense(expense.id, payload)
      } else {
        await createExpense(payload)
      }
      onSave()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.modal}>
        <h2>{isEdit ? 'Edit Expense' : 'Add Expense'}</h2>
        {error && <p className={styles.error}>{error}</p>}
        <form onSubmit={handleSubmit} className={styles.form}>
          <label>
            Amount ($)
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={form.amount}
              onChange={e => set('amount', e.target.value)}
            />
          </label>
          <label>
            Description
            <input
              type="text"
              required
              value={form.description}
              onChange={e => set('description', e.target.value)}
            />
          </label>
          <label>
            Category
            <select value={form.category} onChange={e => set('category', e.target.value)} required>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label>
            Date
            <input
              type="date"
              required
              value={form.date}
              onChange={e => set('date', e.target.value)}
            />
          </label>
          <div className={styles.actions}>
            <button type="button" onClick={onClose} className={styles.cancel}>Cancel</button>
            <button type="submit" disabled={saving} className={styles.save}>
              {saving ? 'Saving…' : isEdit ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

ExpenseFormModal.propTypes = {
  expense: PropTypes.shape({
    id: PropTypes.number.isRequired,
    amount: PropTypes.number.isRequired,
    description: PropTypes.string.isRequired,
    category: PropTypes.string.isRequired,
    date: PropTypes.string.isRequired,
  }),
  categories: PropTypes.arrayOf(PropTypes.string).isRequired,
  onSave: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
}
```
Modal form that handles both creating and editing an expense, calling the appropriate API endpoint based on whether an `expense` prop is supplied.

```css
/* FILE: frontend/src/components/ExpenseFormModal.module.css */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal {
  background: #fff;
  border-radius: 0.5rem;
  padding: 1.75rem 2rem;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.modal h2 {
  margin: 0 0 1rem;
  font-size: 1.15rem;
  color: #1e293b;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.form label {
  display: flex;
  flex-direction: column;
  font-size: 0.85rem;
  color: #475569;
  gap: 0.3rem;
}

.form input,
.form select {
  padding: 0.45rem 0.6rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.25rem;
  font-size: 1rem;
}

.error {
  color: #ef4444;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.cancel {
  padding: 0.45rem 1rem;
  background: #e2e8f0;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
}

.save {
  padding: 0.45rem 1.1rem;
  background: #0ea5e9;
  color: #fff;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  font-weight: 600;
}

.save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
```
Styles the modal overlay, centered card, form fields, and action buttons.

```jsx
// FILE: frontend/src/components/SummaryPage.jsx
import { useState, useEffect } from 'react'
import { getSummary } from '../services/api.js'
import MonthPicker from './MonthPicker.jsx'
import SummaryChart from './SummaryChart.jsx'
import SummaryTable from './SummaryTable.jsx'
import styles from './SummaryPage.module.css'

function currentMonth() {
  return new Date().toISOString().slice(0, 7)
}

export default function SummaryPage() {
  const [month, setMonth] = useState(currentMonth())
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getSummary(month)
      .then(data => { setSummary(data); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [month])

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Monthly Summary</h1>
        <MonthPicker value={month} onChange={setMonth} />
      </div>
      {loading && <p>Loading...</p>}
      {error && <p className={styles.error}>Error: {error}</p>}
      {!loading && !error && summary && (
        <>
          <SummaryChart byCategory={summary.byCategory} />
          <SummaryTable
            month={summary.month}
            total={summary.total}
            byCategory={summary.byCategory}
          />
        </>
      )}
    </div>
  )
}
```
Page that fetches and displays a monthly spending summary, switching months via `MonthPicker`.

```css
/* FILE: frontend/src/components/SummaryPage.module.css */
.page {
  max-width: 800px;
  margin: 0 auto;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.error {
  color: #ef4444;
  font-weight: 500;
}
```
Constrains the summary page width and aligns the title and month picker.

```jsx
// FILE: frontend/src/components/MonthPicker.jsx
import PropTypes from 'prop-types'
import styles from './MonthPicker.module.css'

export default function MonthPicker({ value, onChange }) {
  return (
    <div className={styles.wrapper}>
      <label htmlFor="month-picker">Month</label>
      <input
        id="month-picker"
        type="month"
        value={value}
        onChange={e => onChange(e.target.value)}
        className={styles.input}
      />
    </div>
  )
}

MonthPicker.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
}
```
Simple `<input type="month">` wrapped in a labelled container for picking the summary month.

```css
/* FILE: frontend/src/components/MonthPicker.module.css */
.wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: #475569;
}

.input {
  padding: 0.4rem 0.6rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.25rem;
  font-size: 0.95rem;
}

.input:focus {
  outline: 2px solid #38bdf8;
  border-color: transparent;
}
```
Styles the month picker as an inline label-and-input pair.

```jsx
// FILE: frontend/src/components/SummaryChart.jsx
import PropTypes from 'prop-types'
import styles from './SummaryChart.module.css'

export default function SummaryChart({ byCategory }) {
  if (!byCategory || byCategory.length === 0) {
    return <p>No data for this month.</p>
  }
  const max = Math.max(...byCategory.map(r => r.total))

  return (
    <div className={styles.chart}>
      {byCategory.map(row => (
        <div key={row.category} className={styles.row}>
          <span className={styles.label}>{row.category}</span>
          <div className={styles.barWrap}>
            <div
              className={styles.bar}
              style={{ width: `${(row.total / max) * 100}%` }}
            />
          </div>
          <span className={styles.value}>${row.total.toFixed(2)}</span>
        </div>
      ))}
    </div>
  )
}

SummaryChart.propTypes = {
  byCategory: PropTypes.arrayOf(PropTypes.shape({
    category: PropTypes.string.isRequired,
    total: PropTypes.number.isRequired,
  })).isRequired,
}
```
CSS-only horizontal bar chart that scales each category's bar relative to the largest value.

```css
/* FILE: frontend/src/components/SummaryChart.module.css */
.chart {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-bottom: 2rem;
}

.row {
  display: grid;
  grid-template-columns: 120px 1fr 90px;
  align-items: center;
  gap: 0.75rem;
}

.label {
  font-size: 0.9rem;
  color: #475569;
  text-align: right;
}

.barWrap {
  background: #e2e8f0;
  border-radius: 999px;
  height: 18px;
  overflow: hidden;
}

.bar {
  height: 100%;
  background: #0ea5e9;
  border-radius: 999px;
  transition: width 0.4s ease;
  min-width: 4px;
}

.value {
  font-size: 0.9rem;
  font-weight: 600;
  color: #1e293b;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
```
Styles each category bar as a proportionally-scaled filled track on a grey background.

```jsx
// FILE: frontend/src/components/SummaryTable.jsx
import PropTypes from 'prop-types'
import styles from './SummaryTable.module.css'

export default function SummaryTable({ month, total, byCategory }) {
  return (
    <div className={styles.wrapper}>
      <h2 className={styles.heading}>Breakdown — {month}</h2>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Category</th>
            <th className={styles.right}>Total</th>
            <th className={styles.right}>% of Spend</th>
          </tr>
        </thead>
        <tbody>
          {byCategory.map(row => (
            <tr key={row.category}>
              <td>{row.category}</td>
              <td className={styles.right}>${row.total.toFixed(2)}</td>
              <td className={styles.right}>
                {total > 0 ? ((row.total / total) * 100).toFixed(1) : '0.0'}%
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className={styles.total}>
            <td>Total</td>
            <td className={styles.right}>${total.toFixed(2)}</td>
            <td className={styles.right}>100%</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

SummaryTable.propTypes = {
  month: PropTypes.string.isRequired,
  total: PropTypes.number.isRequired,
  byCategory: PropTypes.arrayOf(PropTypes.shape({
    category: PropTypes.string.isRequired,
    total: PropTypes.number.isRequired,
  })).isRequired,
}
```
Tabular breakdown of spending by category with percentage share and a grand total footer row.

```css
/* FILE: frontend/src/components/SummaryTable.module.css */
.wrapper {
  margin-top: 1rem;
}

.heading {
  font-size: 1rem;
  color: #475569;
  margin-bottom: 0.5rem;
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.95rem;
}

.table th,
.table td {
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid #e2e8f0;
}

.table th {
  background: #f8fafc;
  font-weight: 600;
  color: #475569;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.right {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.total td {
  font-weight: 700;
  border-top: 2px solid #94a3b8;
  color: #1e293b;
}
```
Styles the summary table with the same design language as the expense list, adding a bold total footer.

```css
/* FILE: frontend/src/index.css */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f8fafc;
  color: #1e293b;
  line-height: 1.5;
}

h1 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
}

button {
  font-family: inherit;
}
```
Global CSS reset and base body styles shared across the entire application.
