import { NavLink, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useTeam } from '../context/TeamContext';
import PixelPlayer from './PixelPlayer';

const NAV_LINKS = [
  { path: '/', label: '🏠 Dom' },
  { path: '/terminarz', label: '📅 Terminarz' },
  { path: '/zawodnicy', label: '👥 Zawodnicy' },
  { path: '/tabela', label: '📊 Tabela' },
  { path: '/podsumowanie', label: '📋 Podsumowanie' },
  { path: '/historia', label: '🏆 Historia' },
  { path: '/wywiady', label: '🎙️ Wywiady' },
  { path: '/typowanie', label: '🎯 Typowanie' },
  { path: '/pilkarz-miesiaca', label: '⭐ Piłkarz' },
  { path: '/admin', label: '🔐 Admin' },
];

export default function Navbar() {
  const { teamColor } = useTeam();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const linkStyle = (isActive) => ({
    display: 'block',
    padding: '10px 16px',
    color: isActive ? teamColor : '#ccc',
    textDecoration: 'none',
    fontWeight: isActive ? 700 : 400,
    borderBottom: isActive ? `2px solid ${teamColor}` : '2px solid transparent',
    fontSize: 14,
    whiteSpace: 'nowrap',
    transition: 'color 0.15s',
  });

  const mobileLinkStyle = (isActive) => ({
    display: 'block',
    padding: '12px 20px',
    color: isActive ? teamColor : '#ccc',
    textDecoration: 'none',
    fontWeight: isActive ? 700 : 400,
    borderLeft: isActive ? `3px solid ${teamColor}` : '3px solid transparent',
    fontSize: 15,
    background: isActive ? `${teamColor}10` : 'transparent',
  });

  return (
    <nav style={{
      background: '#111',
      borderBottom: `2px solid ${teamColor}`,
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{
        maxWidth: 900,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
      }}>
        {/* Logo */}
        <NavLink to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <PixelPlayer color={teamColor} />
          <span style={{ color: teamColor, fontWeight: 800, fontSize: 15, letterSpacing: 1 }}>
            PAF Płońsk
          </span>
        </NavLink>

        {/* Desktop links */}
        <div style={{ display: 'flex', alignItems: 'center', overflowX: 'auto', gap: 0 }}
          className="desktop-nav">
          {NAV_LINKS.map(link => (
            <NavLink
              key={link.path}
              to={link.path}
              end={link.path === '/'}
              style={({ isActive }) => linkStyle(isActive)}
            >
              {link.label}
            </NavLink>
          ))}
        </div>

        {/* Hamburger */}
        <button
          onClick={() => setOpen(o => !o)}
          className="hamburger"
          style={{
            background: 'none',
            border: 'none',
            color: teamColor,
            fontSize: 24,
            cursor: 'pointer',
            padding: '8px 0',
            display: 'none',
          }}
        >
          {open ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div style={{ background: '#111', borderTop: `1px solid ${teamColor}30` }} className="mobile-menu">
          {NAV_LINKS.map(link => (
            <NavLink
              key={link.path}
              to={link.path}
              end={link.path === '/'}
              style={({ isActive }) => mobileLinkStyle(isActive)}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .hamburger { display: block !important; }
        }
        @media (min-width: 769px) {
          .mobile-menu { display: none !important; }
        }
      `}</style>
    </nav>
  );
}
