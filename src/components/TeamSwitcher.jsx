import { useTeam } from '../context/TeamContext.jsx'

export default function TeamSwitcher() {
  const { activeTeam, switchTeam, TEAMS } = useTeam()

  return (
    <div style={{
      background: '#0a0a0a',
      borderBottom: '1px solid #222',
      padding: '6px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    }}>
      <span style={{
        fontFamily: 'var(--font-condensed)',
        fontSize: 11,
        letterSpacing: 2,
        color: '#555',
        textTransform: 'uppercase',
        marginRight: 4,
      }}>
        Drużyna:
      </span>
      {Object.values(TEAMS).map(team => {
        const isActive = activeTeam === team.id
        return (
          <button
            key={team.id}
            onClick={() => switchTeam(team.id)}
            style={{
              fontFamily: 'var(--font-condensed)',
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: 2,
              textTransform: 'uppercase',
              padding: '4px 16px',
              background: isActive ? team.color : 'transparent',
              border: `1px solid ${isActive ? team.color : '#333'}`,
              color: isActive ? '#fff' : '#666',
              cursor: 'pointer',
              transition: 'all 0.2s',
              position: 'relative',
            }}
            onMouseEnter={e => { if (!isActive) { e.currentTarget.style.borderColor = team.color; e.currentTarget.style.color = team.color } }}
            onMouseLeave={e => { if (!isActive) { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#666' } }}
          >
            {isActive && (
              <span style={{ marginRight: 6, fontSize: 10 }}>●</span>
            )}
            {team.short}
          </button>
        )
      })}
    </div>
  )
}
