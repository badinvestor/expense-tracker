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
