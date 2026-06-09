import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'

export default function Players() {
  const { isAdmin } = useAuth()
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [shirtNumber, setShirtNumber] = useState('')
  const [saving, setSaving] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [playerStats, setPlayerStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState(null)
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', shirt_number: '' })

  async function loadPlayers() {
    const { data } = await supabase.from('players').select('*').order('last_name', { ascending: true }).order('first_name', { ascending: true })
    setPlayers(data || [])
    setLoading(false)
  }

  useEffect(() => { loadPlayers() }, [])

  async function addPlayer() {
    if (!firstName.trim() || !lastName.trim()) return
    setSaving(true)
    await supabase.from('players').insert({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      shirt_number: shirtNumber ? parseInt(shirtNumber) : null,
    })
    setFirstName('')
    setLastName('')
    setShirtNumber('')
    setShowForm(false)
    await loadPlayers()
    setSaving(false)
  }

  async function saveEdit() {
    if (!editForm.first_name.trim() || !editForm.last_name.trim()) return
    setSaving(true)
    await supabase.from('players').update({
      first_name: editForm.first_name.trim(),
      last_name: editForm.last_name.trim(),
      shirt_number: editForm.shirt_number ? parseInt(editForm.shirt_number) : null,
    }).eq('id', editingPlayer)
    setEditingPlayer(null)
    await loadPlayers()
    setSaving(false)
  }

  async function toggleActive(player) {
    await supabase.from('players').update({ active: !player.active }).eq('id', player.id)
    await loadPlayers()
  }

  async function deletePlayer(id) {
    if (!confirm('Usunąć zawodnika? Wszystkie jego statystyki zostaną usunięte.')) return
    await supabase.from('players').delete().eq('id', id)
    if (selectedPlayer?.id === id) setSelectedPlayer(null)
    await loadPlayers()
  }

  async function openPlayer(player) {
    if (selectedPlayer?.id === player.id) { setSelectedPlayer(null); setPlayerStats(null); return }
    setSelectedPlayer(player)
    setStatsLoading(true)
    const [{ data: g }, { data: c }, { data: mp }] = await Promise.all([
      supabase.from('goals').select('id, matches(match_date, opponent)').eq('player_id', player.id),
      supabase.from('cards').select('id, card_type, matches(match_date, opponent)').eq('player_id', player.id),
      supabase.from('match_players').select('id, minutes_played, matches(match_date, opponent, status)').eq('player_id', player.id),
    ])
    const totalMinutes = (mp || []).filter(m => m.matches?.status === 'played').reduce((sum, m) => sum + (m.minutes_played || 0), 0)
    setPlayerStats({
      goals: g || [],
      cards: c || [],
      matchPlayers: (mp || []).filter(m => m.matches?.status === 'played'),
      totalMinutes,
      yellowCards: (c || []).filter(c => c.card_type === 'yellow' || c.card_type === 'double_yellow').length,
      redCards: (c || []).filter(c => c.card_type === 'red' || c.card_type === 'double_yellow').length,
    })
    setStatsLoading(false)
  }

  const active = players.filter(p => p.active)
  const inactive = players.filter(p => !p.active)

  const labelStyle = {
    fontFamily: 'var(--font-condensed)',
    fontSize: 11,
    letterSpacing: 2,
    color: 'var(--white-muted)',
    textTransform: 'uppercase',
    display: 'block',
    marginBottom: 6,
  }

  function PlayerCard({ player }) {
    const isSelected = selectedPlayer?.id === player.id
    const isEditing = editingPlayer === player.id

    return (
      <div>
        <div
          className="card"
          style={{
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            borderLeft: isSelected ? '3px solid var(--gold)' : '3px solid transparent',
            transition: 'all 0.2s',
          }}
        >
          {/* Numer koszulki */}
          <div style={{
            width: 44, height: 44,
            background: player.active ? 'var(--red)' : 'var(--black-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)',
            fontSize: player.shirt_number ? 20 : 14,
            color: 'var(--white)',
            flexShrink: 0,
            cursor: 'pointer',
          }}
            onClick={() => openPlayer(player)}
          >
            {player.shirt_number || `${player.first_name[0]}${player.last_name[0]}`}
          </div>

          {isEditing ? (
            /* Tryb edycji */
            <div style={{ flex: 1, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                className="input-field"
                value={editForm.first_name}
                onChange={e => setEditForm({ ...editForm, first_name: e.target.value })}
                placeholder="Imię"
                style={{ width: 120, padding: '6px 10px', fontSize: 14 }}
              />
              <input
                className="input-field"
                value={editForm.last_name}
                onChange={e => setEditForm({ ...editForm, last_name: e.target.value })}
                placeholder="Nazwisko"
                style={{ width: 140, padding: '6px 10px', fontSize: 14 }}
              />
              <input
                className="input-field"
                type="number"
                value={editForm.shirt_number}
                onChange={e => setEditForm({ ...editForm, shirt_number: e.target.value })}
                placeholder="Nr"
                style={{ width: 70, padding: '6px 10px', fontSize: 14 }}
              />
              <button className="btn-gold" style={{ padding: '6px 14px', fontSize: 13 }} onClick={saveEdit} disabled={saving}>
                {saving ? '...' : 'Zapisz'}
              </button>
              <button className="btn-ghost" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => setEditingPlayer(null)}>
                Anuluj
              </button>
            </div>
          ) : (
            /* Tryb widoku */
            <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => openPlayer(player)}>
              <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 16, fontWeight: 700 }}>
                {player.last_name} {player.first_name}
                {player.shirt_number && (
                  <span style={{ marginLeft: 8, fontFamily: 'var(--font-condensed)', fontSize: 13, color: 'var(--white-muted)', fontWeight: 400 }}>
                    #{player.shirt_number}
                  </span>
                )}
              </div>
              {!player.active && (
                <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 11, color: 'var(--white-muted)', letterSpacing: 1 }}>
                  NIEAKTYWNY
                </div>
              )}
            </div>
          )}

          {isAdmin && !isEditing && (
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                style={{
                  fontFamily: 'var(--font-condensed)',
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  padding: '5px 10px',
                  background: 'transparent',
                  border: '1px solid #333',
                  color: 'var(--white-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onClick={() => {
                  setEditingPlayer(player.id)
                  setEditForm({
                    first_name: player.first_name,
                    last_name: player.last_name,
                    shirt_number: player.shirt_number || '',
                  })
                  setSelectedPlayer(null)
                }}
              >
                ✏️ Edytuj
              </button>
              <button
                style={{
                  fontFamily: 'var(--font-condensed)',
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  padding: '5px 10px',
                  background: 'transparent',
                  border: '1px solid ' + (player.active ? '#4ade8044' : '#4ade80'),
                  color: player.active ? 'var(--white-muted)' : '#4ade80',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onClick={() => toggleActive(player)}
              >
                {player.active ? 'Dezaktywuj' : 'Aktywuj'}
              </button>
              <button className="btn-danger" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => deletePlayer(player.id)}>
                🗑️
              </button>
            </div>
          )}
        </div>

        {/* Stats panel */}
        {isSelected && !isEditing && (
          <div style={{
            background: '#141414',
            border: '1px solid var(--black-border)',
            borderTop: 'none',
            padding: '20px 18px',
          }}>
            {statsLoading ? (
              <div style={{ color: 'var(--white-muted)', fontFamily: 'var(--font-condensed)' }}>Ładowanie...</div>
            ) : playerStats ? (
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                <StatBox label="Mecze" value={playerStats.matchPlayers.length} />
                <StatBox label="Minuty" value={playerStats.totalMinutes + "'"} />
                <StatBox label="Gole" value={playerStats.goals.length} color="var(--gold)" />
                <StatBox label="Żółte" value={playerStats.yellowCards} color="#facc15" />
                <StatBox label="Czerwone" value={playerStats.redCards} color="var(--red-light)" />
              </div>
            ) : null}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 20px' }} className="fade-in">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 8 }}>
        <div>
          <h1 className="section-title">Zawodnicy</h1>
          <div className="gold-line" />
        </div>
        {isAdmin && (
          <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Anuluj' : '+ Dodaj zawodnika'}
          </button>
        )}
      </div>

      {/* Add form */}
      {isAdmin && showForm && (
        <div className="card" style={{ padding: 24, marginBottom: 28, borderLeft: '4px solid var(--red)' }}>
          <h3 style={{ fontFamily: 'var(--font-condensed)', fontSize: 16, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>
            Nowy zawodnik
          </h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label style={labelStyle}>Imię *</label>
              <input className="input-field" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Imię" />
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label style={labelStyle}>Nazwisko *</label>
              <input className="input-field" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Nazwisko" />
            </div>
            <div style={{ width: 100 }}>
              <label style={labelStyle}>Nr koszulki</label>
              <input className="input-field" type="number" value={shirtNumber} onChange={e => setShirtNumber(e.target.value)} placeholder="Nr"
                onKeyDown={e => e.key === 'Enter' && addPlayer()} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn-gold" onClick={addPlayer} disabled={saving}>
                {saving ? 'Dodaję...' : 'Dodaj'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ color: 'var(--white-muted)', fontFamily: 'var(--font-condensed)', letterSpacing: 2 }}>Ładowanie...</div>
      ) : (
        <>
          <div style={{ marginBottom: 4, fontFamily: 'var(--font-condensed)', fontSize: 11, letterSpacing: 2, color: 'var(--white-muted)', textTransform: 'uppercase' }}>
            Aktywni ({active.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 28 }}>
            {active.length === 0 ? (
              <div style={{ color: 'var(--white-muted)', fontFamily: 'var(--font-condensed)', padding: '16px 0' }}>Brak zawodników</div>
            ) : active.map(p => <PlayerCard key={p.id} player={p} />)}
          </div>

          {inactive.length > 0 && (
            <>
              <div style={{ marginBottom: 4, fontFamily: 'var(--font-condensed)', fontSize: 11, letterSpacing: 2, color: 'var(--white-muted)', textTransform: 'uppercase' }}>
                Nieaktywni ({inactive.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {inactive.map(p => <PlayerCard key={p.id} player={p} />)}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

function StatBox({ label, value, color = 'var(--white)' }) {
  return (
    <div style={{ textAlign: 'center', minWidth: 60 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color, letterSpacing: 1 }}>{value}</div>
      <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 11, letterSpacing: 2, color: 'var(--white-muted)', textTransform: 'uppercase' }}>{label}</div>
    </div>
  )
}
