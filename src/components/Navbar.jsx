import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useState } from 'react'

export default function Navbar() {
  const location = useLocation()
  const { isAdmin, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  const publicLinks = [
    { to: '/', label: 'Strona Główna' },
    { to: '/terminarz', label: 'Terminarz' },
    { to: '/tabela', label: 'Tabela' },
    { to: '/zawodnicy', label: 'Zawodnicy' },
    { to: '/podsumowanie', label: 'Podsumowanie' },
    { to: '/historia', label: 'Historia' },
  ]

  const adminLinks = [
    { to: '/admin', label: 'Panel Admina' },
    { to: '/backup', label: 'Backup' },
  ]

  const links = isAdmin ? [...publicLinks, ...adminLinks] : publicLinks

  return (
    <nav style={{ background: 'var(--black-soft)', borderBottom: '3px solid var(--red)', position: 'sticky', top: 0, zIndex: 100 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>

        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/logo.png" alt="PAF Płońsk" style={{ height: 44, width: 'auto' }} />
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: 2, color: 'var(--white)', lineHeight: 1 }}>PAF Płońsk</div>
            <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 10, letterSpacing: 3, color: 'var(--gold)', textTransform: 'uppercase' }}>Fanpage</div>
          </div>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }} className="desktop-nav">
          {links.map(link => (
            <Link key={link.to} to={link.to} style={{
              fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 13,
              letterSpacing: 1, textTransform: 'uppercase', padding: '8px 10px',
              color: location.pathname === link.to ? 'var(--gold)' : 'var(--white-dim)',
              borderBottom: location.pathname === link.to ? '2px solid var(--gold)' : '2px solid transparent',
              transition: 'all 0.2s',
            }}>
              {link.label}
            </Link>
          ))}
          {isAdmin ? (
            <button onClick={logout} style={{
              marginLeft: 8, background: 'transparent', border: '1px solid var(--red)',
              color: 'var(--red-light)', fontFamily: 'var(--font-condensed)', fontWeight: 700,
              fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', padding: '6px 12px', cursor: 'pointer',
            }}>
              Wyloguj
            </button>
          ) : (
            <Link to="/admin" style={{
              marginLeft: 8, background: 'var(--red)', color: 'var(--white)',
              fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 12,
              letterSpacing: 1, textTransform: 'uppercase', padding: '6px 12px',
            }}>
              Admin
            </Link>
          )}
        </div>

        <button onClick={() => setMenuOpen(!menuOpen)} style={{ display: 'none', background: 'none', border: 'none', color: 'var(--white)', fontSize: 24, cursor: 'pointer' }} className="mobile-menu-btn">
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>

      {menuOpen && (
        <div style={{ background: 'var(--black-card)', borderTop: '1px solid var(--black-border)', padding: '12px 20px' }}>
          {links.map(link => (
            <Link key={link.to} to={link.to} onClick={() => setMenuOpen(false)} style={{
              display: 'block', fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 16,
              letterSpacing: 1.5, textTransform: 'uppercase', padding: '12px 0',
              color: location.pathname === link.to ? 'var(--gold)' : 'var(--white-dim)',
              borderBottom: '1px solid var(--black-border)',
            }}>
              {link.label}
            </Link>
          ))}
          {isAdmin ? (
            <button onClick={() => { logout(); setMenuOpen(false) }} style={{
              display: 'block', marginTop: 12, background: 'transparent', border: '1px solid var(--red)',
              color: 'var(--red-light)', fontFamily: 'var(--font-condensed)', fontWeight: 700,
              fontSize: 14, letterSpacing: 1, textTransform: 'uppercase', padding: '8px 14px', cursor: 'pointer', width: '100%',
            }}>
              Wyloguj
            </button>
          ) : (
            <Link to="/admin" onClick={() => setMenuOpen(false)} style={{
              display: 'block', marginTop: 12, background: 'var(--red)', color: 'var(--white)',
              fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 14,
              letterSpacing: 1, textTransform: 'uppercase', padding: '8px 14px', textAlign: 'center',
            }}>
              Admin
            </Link>
          )}
        </div>
      )}

      <style>{`
        @media (max-width: 900px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: block !important; }
        }
      `}</style>
    </nav>
  )
}
