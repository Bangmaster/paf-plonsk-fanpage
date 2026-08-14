import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div style={{ maxWidth: 600, margin: '80px auto', padding: '0 20px', textAlign: 'center' }} className="fade-in">
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 120, color: 'var(--red)', lineHeight: 1, marginBottom: 8 }}>404</div>
      <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 13, letterSpacing: 4, color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 24 }}>
        Strona nie istnieje
      </div>
      <div style={{ fontSize: 48, marginBottom: 20 }}>⚽</div>
      <p style={{ fontFamily: 'var(--font-condensed)', fontSize: 16, color: 'var(--white-muted)', letterSpacing: 1, lineHeight: 1.8, marginBottom: 32 }}>
        Ta piłka wyszła za autem.<br />
        Strona której szukasz nie istnieje.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link to="/" className="btn-primary" style={{ padding: '12px 28px' }}>← Strona główna</Link>
        <Link to="/terminarz" className="btn-ghost" style={{ padding: '12px 28px' }}>📅 Terminarz</Link>
        <Link to="/zawodnicy" className="btn-ghost" style={{ padding: '12px 28px' }}>👥 Zawodnicy</Link>
      </div>
    </div>
  )
}
