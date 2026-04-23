import { Routes, Route } from 'react-router-dom'
import NavBar from './components/NavBar.jsx'
import ExpenseListPage from './components/ExpenseListPage.jsx'
import SummaryPage from './components/SummaryPage.jsx'

export default function App() {
  return (
    <>
      <NavBar />
      <main style={{ padding: '1rem 2rem' }}>
        <Routes>
          <Route path="/" element={<ExpenseListPage />} />
          <Route path="/summary" element={<SummaryPage />} />
        </Routes>
      </main>
    </>
  )
}
