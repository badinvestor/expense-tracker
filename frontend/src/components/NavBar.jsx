import { NavLink } from 'react-router-dom'
import styles from './NavBar.module.css'

export default function NavBar() {
  return (
    <nav className={styles.nav}>
      <span className={styles.brand}>Expense Tracker</span>
      <div className={styles.links}>
        <NavLink to="/" className={({ isActive }) => isActive ? styles.active : undefined}>
          Expenses
        </NavLink>
        <NavLink to="/summary" className={({ isActive }) => isActive ? styles.active : undefined}>
          Summary
        </NavLink>
      </div>
    </nav>
  )
}
