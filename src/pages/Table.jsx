import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'

const emptyForm = { team_name: '', played: 0, goals_for: 0, goals_against: 0, points: 0, position: null }

export default function Table() {
  const { isAdmin } = useAuth()
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)

  async function loadTeams() {
    const { data } = await supabase
      .from('league_table')
      .select('*')
      .is('season_id', null)
    
    // Sortowanie: punkty → bilans bramek → bramki zdobyte
    const sorted = (data || []).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points
      const diffA = a.goals_for - a.goals_against
      const diffB = b.goals_for - b.goals_against
      if (diffB !== diffA) return diffB - diffA
      return b.goals_for - a.goals_for
    })
    setTeams(sorted)
    setLoading(false)
  }

  useEffect(() => { loadTeams() }, [])

  async function handleSave() {
    if (!form.team_name.trim()) return
    setSaving(true)
    const payload = {
      team_name: form.team_name.trim(),
      played: parseInt(form.played) || 0,
      goals_for: parseInt(form.goals_for) || 0,
      goals_against: parseInt(form.goals_against) || 0,
      points: parseInt(form.points) || 0,
    }
    if (editId) {
      await supabase.from('league_table').update(payload).eq('id', editId)
    } else {
      await supabase.from('league_table').insert({ ...payload, season_id: null })
    }
    await loadTeams()
    setForm(emptyForm)
    setEditId(null)
    setShowForm(false)
    setSaving(false)
  }

  async function handleDelete(id) {
    if (!confirm('Usunąć drużynę z tabeli?')) return
    await supabase.from('league_table').delete().eq('id', id)
    await loadTeams()
  }

  function startEdit(team) {
    setForm({
      team_name: team.team_name,
      played: team.played,
      goals_for: team.goals_for,
      goals_against: team.goals_against,
      points: team.points,
    })
    setEditId(team.id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const labelStyle = {
    fontFamily: 'var(--font-condensed)',
    fontSize: 11, letterSpacing: 2, color: 'var(--white-muted)',
    textTransform: 'uppercase', display: 'block', marginBottom: 6,
  }

  const pafIndex = teams.findIndex(t => t.team_name.toLowerCase().includes('paf'))

  // Kolory pozycji
  function posColor(i, total) {
    if (i === 0) return 'var(--gold)'
    if (i === 1) return '#4ade80'
    if (i >= total - 3) return 'var(--red-light)'
    return 'var(--white-muted)'
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 20px' }} className="fade-in">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 8 }}>
        <div>
          <h1 className="section-title">Tabela ligowa</h1>
          <div className="gold-line" />
        </div>
        {isAdmin && (
          <button className="btn-primary" onClick={() => { setShowForm(!showForm); setEditId(null); setForm(emptyForm) }}>
            {showForm ? 'Anuluj' : '+ Dodaj drużynę'}
          </button>
        )}
      </div>

      {/* Form */}
      {isAdmin && showForm && (
        <div className="card" style={{ padding: 24, marginBottom: 28, borderLeft: '4px solid var(--red)' }}>
          <h3 style={{ fontFamily: 'var(--font-condensed)', fontSize: 16, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>
            {editId ? 'Edytuj drużynę' : 'Nowa drużyna'}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>Nazwa drużyny *</label>
              <input className="input-field" value={form.team_name} onChange={e => setForm({ ...form, team_name: e.target.value })} placeholder="np. PAF Płońsk" />
            </div>
            <div>
              <label style={labelStyle}>Mecze</label>
              <input className="input-field" type="number" min="0" value={form.played} onChange={e => setForm({ ...form, played: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Bramki +</label>
              <input className="input-field" type="number" min="0" value={form.goals_for} onChange={e => setForm({ ...form, goals_for: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Bramki -</label>
              <input className="input-field" type="number" min="0" value={form.goals_against} onChange={e => setForm({ ...form, goals_against: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Punkty</label>
              <input className="input-field" type="number" min="0" value={form.points} onChange={e => setForm({ ...form, points: e.target.value })} />
            </div>
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <button className="btn-gold" onClick={handleSave} disabled={saving}>
              {saving ? 'Zapisuję...' : editId ? 'Zapisz zmiany' : 'Dodaj drużynę'}
            </button>
            <button className="btn-ghost" onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm) }}>Anuluj</button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={{ color: 'var(--white-muted)', fontFamily: 'var(--font-condensed)', letterSpacing: 2 }}>Ładowanie...</div>
      ) : teams.length === 0 ? (
        <div style={{ color: 'var(--white-muted)', fontFamily: 'var(--font-condensed)', letterSpacing: 2 }}>Brak drużyn w tabeli</div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          {/* Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isAdmin ? '36px 1fr 44px 44px 44px 60px 60px 80px' : '36px 1fr 44px 44px 44px 60px 60px',
            padding: '10px 16px',
            borderBottom: '2px solid var(--red)',
            background: '#161616',
          }}>
            {['#', 'Drużyna', 'M', 'G+', 'G-', 'Bil.', 'Pkt', ...(isAdmin ? [''] : [])].map((h, i) => (
              <div key={i} style={{
                fontFamily: 'var(--font-condensed)', fontSize: 11,
                letterSpacing: 2, color: 'var(--white-muted)',
                textTransform: 'uppercase',
                textAlign: i === 0 ? 'center' : i === 1 ? 'left' : 'center',
              }}>{h}</div>
            ))}
          </div>

          {teams.map((team, i) => {
            const isPAF = i === pafIndex
            const goalDiff = team.goals_for - team.goals_against
            const isEditing = editId === team.id && showForm

            return (
              <div key={team.id}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isAdmin ? '36px 1fr 44px 44px 44px 60px 60px 80px' : '36px 1fr 44px 44px 44px 60px 60px',
                  padding: '0 16px',
                  height: 52,
                  borderBottom: '1px solid var(--black-border)',
                  background: isPAF ? '#1a0f00' : i % 2 === 0 ? 'transparent' : '#141414',
                  alignItems: 'center',
                  transition: 'background 0.15s',
                }}
                  onMouseEnter={e => { if (!isPAF) e.currentTarget.style.background = '#1e1e1e' }}
                  onMouseLeave={e => { if (!isPAF) e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : '#141414' }}
                >
                  {/* Pozycja */}
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 18,
                    color: posColor(i, teams.length),
                    textAlign: 'center',
                    lineHeight: 1,
                  }}>
                    {i + 1}
                  </div>

                  {/* Nazwa */}
                  <div style={{
                    fontFamily: 'var(--font-condensed)',
                    fontSize: 15,
                    fontWeight: isPAF ? 800 : 500,
                    color: isPAF ? 'var(--gold)' : 'var(--white)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    overflow: 'hidden',
                  }}>
                    {isPAF && <span style={{ fontSize: 11, flexShrink: 0 }}>⭐</span>}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{team.team_name}</span>
                  </div>

                  {/* M */}
                  <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 15, textAlign: 'center', color: 'var(--white-dim)', tabularNums: true }}>
                    {team.played}
                  </div>

                  {/* G+ */}
                  <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 15, textAlign: 'center', color: '#4ade80', fontWeight: 600 }}>
                    {team.goals_for}
                  </div>

                  {/* G- */}
                  <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 15, textAlign: 'center', color: 'var(--red-light)', fontWeight: 600 }}>
                    {team.goals_against}
                  </div>

                  {/* Bilans */}
                  <div style={{
                    fontFamily: 'var(--font-condensed)', fontSize: 14, textAlign: 'center', fontWeight: 700,
                    color: goalDiff > 0 ? '#4ade80' : goalDiff < 0 ? 'var(--red-light)' : 'var(--white-muted)',
                  }}>
                    {goalDiff > 0 ? `+${goalDiff}` : goalDiff}
                  </div>

                  {/* Punkty */}
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: isPAF ? 24 : 22,
                    textAlign: 'center',
                    color: isPAF ? 'var(--gold)' : i === 0 ? 'var(--gold)' : 'var(--white)',
                    lineHeight: 1,
                  }}>
                    {team.points}
                  </div>

                  {/* Admin actions */}
                  {isAdmin && (
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                      <button
                        className="btn-ghost"
                        style={{ padding: '3px 8px', fontSize: 12 }}
                        onClick={() => startEdit(team)}
                      >
                        ✏️
                      </button>
                      <button
                        className="btn-danger"
                        style={{ padding: '3px 8px', fontSize: 12 }}
                        onClick={() => handleDelete(team.id)}
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Legend */}
      <div style={{ marginTop: 16, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <LegendItem color="var(--gold)" label="1. miejsce" />
        <LegendItem color="#4ade80" label="Awans (top 2)" />
        <LegendItem color="var(--red-light)" label="Spadek (3 ostatnie)" />
        <LegendItem color="#1a0f00" border="var(--gold)" label="PAF Płońsk" />
      </div>
      <div style={{ marginTop: 8, fontFamily: 'var(--font-condensed)', fontSize: 12, color: 'var(--white-muted)', letterSpacing: 1 }}>
        M = mecze • G+ = bramki zdobyte • G- = bramki stracone • Bil. = bilans • Pkt = punkty
      </div>
      <div style={{ marginTop: 4, fontFamily: 'var(--font-condensed)', fontSize: 11, color: '#555', letterSpacing: 1 }}>
        Sortowanie: punkty → bilans bramek → bramki zdobyte
      </div>
    </div>
  )
}

function LegendItem({ color, label, border }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 12, height: 12, background: color, border: border ? `1px solid ${border}` : 'none', flexShrink: 0 }} />
      <span style={{ fontFamily: 'var(--font-condensed)', fontSize: 12, color: 'var(--white-muted)', letterSpacing: 1 }}>{label}</span>
    </div>
  )
}
