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
