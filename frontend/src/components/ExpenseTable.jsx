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
