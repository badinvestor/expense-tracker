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
