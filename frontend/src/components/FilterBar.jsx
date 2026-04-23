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
