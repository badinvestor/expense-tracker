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
