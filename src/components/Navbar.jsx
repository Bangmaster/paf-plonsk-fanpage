import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useTeam } from '../context/TeamContext.jsx'
import { useState } from 'react'
import PixelPlayer from './PixelPlayer.jsx'

export default function Navbar() {
  const location = useLocation()
  const { isAdmin, logout } = useAuth()
  const { team } = useTeam()
  const [menuOpen, setMenuOpen] = useState(false)

  const publicLinks = [
    { to: '/', label: 'Główna' },
    { to: '/terminarz', label: 'Terminarz' },
    { to: '/tabela', label: 'Tabela' },
    { to: '/zawodnicy', label: 'Zawodnicy' },
    { to: '/podsumowanie', label: 'Podsumowanie' },
    { to: '/historia', label: 'Historia' },
    { to: '/wywiady', label: 'Wywiady' },
  ]

  const adminLinks = [
    { to: '/admin', label: 'Panel' },
    { to: '/backup', label: 'Backup' },
  ]

  const links = isAdmin ? [...publicLinks, ...adminLinks] : publicLinks

  return (
    <nav style={{
      background: 'var(--black-soft)',
      borderBottom: `3px solid ${team.color}`,
      position: 'sticky', top: 0, zIndex: 100,
      transition: 'border-color 0.3s',
    }}>
      <PixelPlayer />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64, position: 'relative', zIndex: 2 }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
          <img src="/logo.png" alt="PAF Płońsk" style={{ height: 44, width: 'auto' }} />
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: 2, color: 'var(--white)', lineHeight: 1 }}>PAF Płońsk</div>
            <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 10, letterSpacing: 3, color: team.color, textTransform: 'uppercase', transition: 'color 0.3s' }}>{team.short} — Fanpage</div>
          </div>
        </Link>

        {/* Desktop nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }} className="desktop-nav">
          {links.map(link => (
            <Link key={link.to} to={link.to} style={{
              fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 12,
              letterSpacing: 1, textTransform: 'uppercase', padding: '8px 9px',
              color: location.pathname === link.to ? team.color : 'var(--white-dim)',
              borderBottom: location.pathname === link.to ? `2px solid ${team.color}` : '2px solid transparent',
              transition: 'all 0.2s', textDecoration: 'none',
            }}>
              {link.label}
            </Link>
          ))}
          {isAdmin ? (
            <button onClick={logout} style={{ marginLeft: 6, background: 'transparent', border: '1px solid var(--red)', color: 'var(--red-light)', fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', padding: '5px 10px', cursor: 'pointer' }}>
              Wyloguj
            </button>
          ) : (
            <Link to="/admin" style={{ marginLeft: 6, background: 'var(--red)', color: 'var(--white)', fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', padding: '5px 10px', textDecoration: 'none' }}>
              Admin
            </Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <button onClick={() => setMenuOpen(!menuOpen)} style={{ display: 'none', background: 'none', border: 'none', color: 'var(--white)', fontSize: 24, cursor: 'pointer', padding: 4 }} className="mobile-menu-btn">
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{ background: 'var(--black-card)', borderTop: '1px solid var(--black-border)', padding: '12px 20px' }}>
          {links.map(link => (
            <Link key={link.to} to={link.to} onClick={() => setMenuOpen(false)} style={{
              display: 'block', fontFamily: 'var(--font-condensed)', fontWeight: 700,
              fontSize: 15, letterSpacing: 1.5, textTransform: 'uppercase',
              padding: '12px 0', color: location.pathname === link.to ? team.color : 'var(--white-dim)',
              borderBottom: '1px solid var(--black-border)', textDecoration: 'none',
            }}>
              {link.label}
            </Link>
          ))}
          {isAdmin ? (
            <button onClick={() => { logout(); setMenuOpen(false) }} style={{ display: 'block', marginTop: 12, background: 'transparent', border: '1px solid var(--red)', color: 'var(--red-light)', fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 14, letterSpacing: 1, textTransform: 'uppercase', padding: '8px 14px', cursor: 'pointer', width: '100%' }}>
              Wyloguj
            </button>
          ) : (
            <Link to="/admin" onClick={() => setMenuOpen(false)} style={{ display: 'block', marginTop: 12, background: 'var(--red)', color: 'var(--white)', fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 14, letterSpacing: 1, textTransform: 'uppercase', padding: '8px 14px', textAlign: 'center', textDecoration: 'none' }}>
              Admin
            </Link>
          )}
        </div>
      )}

      <style>{`
        @media (max-width: 960px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: block !important; }
        }
      `}</style>
    </nav>
  )
}
