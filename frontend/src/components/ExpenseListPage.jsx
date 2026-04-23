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
