import { NavLink, Outlet } from 'react-router-dom'

function navigationClass({ isActive }) {
  return `app-nav-link${isActive ? ' active' : ''}`
}

export default function AppLayout() {
  return (
    <div className="app-layout">
      <header className="app-header">
        <NavLink to="/" className="app-brand">
          <span className="app-brand-mark">屋</span>
          <span>
            <strong>我的小屋</strong>
            <small>Room Studio</small>
          </span>
        </NavLink>
        <nav className="app-nav" aria-label="主导航">
          <NavLink to="/" end className={navigationClass}>我的小屋</NavLink>
          <NavLink to="/furniture" className={navigationClass}>我的家具</NavLink>
          <button type="button" className="app-nav-link app-nav-placeholder" disabled>用户</button>
          <button type="button" className="app-nav-link app-nav-placeholder" disabled>社区</button>
        </nav>
      </header>
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  )
}
