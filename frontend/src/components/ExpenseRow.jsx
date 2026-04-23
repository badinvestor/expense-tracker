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
