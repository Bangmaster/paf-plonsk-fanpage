import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useState } from 'react'

export default function Navbar() {
  const location = useLocation()
  const { isAdmin, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  const links = [
    { to: '/', label: 'Strona Główna' },
    { to: '/terminarz', label: 'Terminarz' },
    { to: '/zawodnicy', label: 'Zawodnicy' },
    { to: '/podsumowanie', label: 'Podsumowanie' },
    ...(isAdmin ? [{ to: '/admin', label: 'Panel Admina' }] : []),
  ]

  return (
    <nav style={{
      background: 'var(--black-soft)',
      borderBottom: '3px solid var(--red)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{
        maxWidth: 1100,
        margin: '0 auto',
        padding: '0 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 64,
      }}>
        {/* Logo + Name */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/logo.png" alt="PAF Płońsk" style={{ height: 44, width: 'auto' }} />
          <div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: 20,
              letterSpacing: 2,
              color: 'var(--white)',
              lineHeight: 1,
            }}>PAF Płońsk</div>
            <div style={{
              fontFamily: 'var(--font-condensed)',
              fontSize: 10,
              letterSpacing: 3,
              color: 'var(--gold)',
              textTransform: 'uppercase',
            }}>Fanpage</div>
          </div>
        </Link>

        {/* Desktop links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} className="desktop-nav">
          {links.map(link => (
            <Link
              key={link.to}
              to={link.to}
              style={{
                fontFamily: 'var(--font-condensed)',
                fontWeight: 700,
                fontSize: 14,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                padding: '8px 14px',
                color: location.pathname === link.to ? 'var(--gold)' : 'var(--white-dim)',
                borderBottom: location.pathname === link.to ? '2px solid var(--gold)' : '2px solid transparent',
                transition: 'all 0.2s',
              }}
            >
              {link.label}
            </Link>
          ))}
          {isAdmin ? (
            <button
              onClick={logout}
              style={{
                marginLeft: 12,
                background: 'transparent',
                border: '1px solid var(--red)',
                color: 'var(--red-light)',
                fontFamily: 'var(--font-condensed)',
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: 1,
                textTransform: 'uppercase',
                padding: '6px 14px',
                cursor: 'pointer',
              }}
            >
              Wyloguj
            </button>
          ) : (
            <Link
              to="/admin"
              style={{
                marginLeft: 12,
                background: 'var(--red)',
                color: 'var(--white)',
                fontFamily: 'var(--font-condensed)',
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: 1,
                textTransform: 'uppercase',
                padding: '6px 14px',
              }}
            >
              Admin
            </Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            color: 'var(--white)',
            fontSize: 24,
            cursor: 'pointer',
          }}
          className="mobile-menu-btn"
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{
          background: 'var(--black-card)',
          borderTop: '1px solid var(--black-border)',
          padding: '12px 20px',
        }} className="mobile-menu">
          {links.map(link => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMenuOpen(false)}
              style={{
                display: 'block',
                fontFamily: 'var(--font-condensed)',
                fontWeight: 700,
                fontSize: 16,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                padding: '12px 0',
                color: location.pathname === link.to ? 'var(--gold)' : 'var(--white-dim)',
                borderBottom: '1px solid var(--black-border)',
              }}
            >
              {link.label}
            </Link>
          ))}
          {isAdmin ? (
            <button
              onClick={() => { logout(); setMenuOpen(false) }}
              style={{
                display: 'block',
                marginTop: 12,
                background: 'transparent',
                border: '1px solid var(--red)',
                color: 'var(--red-light)',
                fontFamily: 'var(--font-condensed)',
                fontWeight: 700,
                fontSize: 14,
                letterSpacing: 1,
                textTransform: 'uppercase',
                padding: '8px 14px',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              Wyloguj
            </button>
          ) : (
            <Link
              to="/admin"
              onClick={() => setMenuOpen(false)}
              style={{
                display: 'block',
                marginTop: 12,
                background: 'var(--red)',
                color: 'var(--white)',
                fontFamily: 'var(--font-condensed)',
                fontWeight: 700,
                fontSize: 14,
                letterSpacing: 1,
                textTransform: 'uppercase',
                padding: '8px 14px',
                textAlign: 'center',
              }}
            >
              Admin
            </Link>
          )}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: block !important; }
        }
      `}</style>
    </nav>
  )
}
