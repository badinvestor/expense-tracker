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
