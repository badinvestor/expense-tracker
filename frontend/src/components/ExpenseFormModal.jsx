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
