import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useTeam } from '../context/TeamContext.jsx'
import { useNavigate } from 'react-router-dom'

export default function Players() {
  const { isAdmin } = useAuth()
  const { activeTeam, team } = useTeam()
  const navigate = useNavigate()
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [shirtNumber, setShirtNumber] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState(null)
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', shirt_number: '' })
  const [uploadingPhoto, setUploadingPhoto] = useState(null)
  const [search, setSearch] = useState('')

  async function loadPlayers() {
    const { data } = await supabase
      .from('players').select('*')
      .eq('team', activeTeam)
      .order('last_name', { ascending: true })
      .order('first_name', { ascending: true })
    setPlayers(data || [])
    setLoading(false)
  }

  useEffect(() => { setLoading(true); loadPlayers() }, [activeTeam])

  async function addPlayer() {
    if (!firstName.trim() || !lastName.trim()) return
    setSaving(true)
    await supabase.from('players').insert({ first_name: firstName.trim(), last_name: lastName.trim(), shirt_number: shirtNumber ? parseInt(shirtNumber) : null, team: activeTeam })
    setFirstName(''); setLastName(''); setShirtNumber(''); setShowForm(false)
    await loadPlayers(); setSaving(false)
  }

  async function saveEdit() {
    if (!editForm.first_name.trim() || !editForm.last_name.trim()) return
    setSaving(true)
    await supabase.from('players').update({ first_name: editForm.first_name.trim(), last_name: editForm.last_name.trim(), shirt_number: editForm.shirt_number ? parseInt(editForm.shirt_number) : null }).eq('id', editingPlayer)
    setEditingPlayer(null); await loadPlayers(); setSaving(false)
  }

  async function toggleActive(player) {
    await supabase.from('players').update({ active: !player.active }).eq('id', player.id)
    await loadPlayers()
  }

  async function deletePlayer(id) {
    if (!confirm('Usunąć zawodnika?')) return
    await supabase.from('players').delete().eq('id', id)
    await loadPlayers()
  }

  async function uploadPhoto(player, file) {
    if (!file) return
    setUploadingPhoto(player.id)
    try {
      const ext = file.name.split('.').pop()
      const path = `${player.id}.${ext}`
      await supabase.storage.from('player-photos').remove([path])
      const { error } = await supabase.storage.from('player-photos').upload(path, file, { upsert: true })
      if (error) throw error
      const { data: urlData } = supabase.storage.from('player-photos').getPublicUrl(path)
      await supabase.from('players').update({ photo_url: urlData.publicUrl + '?t=' + Date.now() }).eq('id', player.id)
      await loadPlayers()
    } catch (err) { alert('Błąd uploadu: ' + err.message) }
    setUploadingPhoto(null)
  }

  async function removePhoto(player) {
    if (!confirm('Usunąć zdjęcie?')) return
    const ext = player.photo_url?.split('.').pop()?.split('?')[0]
    if (ext) await supabase.storage.from('player-photos').remove([`${player.id}.${ext}`])
    await supabase.from('players').update({ photo_url: null }).eq('id', player.id)
    await loadPlayers()
  }

  const filtered = players.filter(p => `${p.last_name} ${p.first_name}`.toLowerCase().includes(search.toLowerCase()))
  const active = filtered.filter(p => p.active)
  const inactive = filtered.filter(p => !p.active)

  const lStyle = { fontFamily: 'var(--font-condensed)', fontSize: 11, letterSpacing: 2, color: 'var(--white-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }
  const iStyle = { background: '#222', border: '1px solid var(--black-border)', color: 'var(--white)', padding: '10px 14px', fontSize: 15, width: '100%', outline: 'none', fontFamily: 'var(--font-body)' }

  function PlayerCard({ player }) {
    const isEditing = editingPlayer === player.id
    const isUploading = uploadingPhoto === player.id
    return (
      <div>
        <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, borderLeft: '3px solid transparent', transition: 'all 0.2s' }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            {player.photo_url ? (
              <img src={player.photo_url} alt={`${player.last_name}`} style={{ width: 48, height: 48, objectFit: 'cover', border: `2px solid ${team.color}`, cursor: 'pointer' }} onClick={() => navigate(`/zawodnik/${player.id}`)} />
            ) : (
              <div style={{ width: 48, height: 48, background: player.active ? team.color : 'var(--black-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: player.shirt_number ? 18 : 14, color: 'var(--white)', cursor: 'pointer' }} onClick={() => navigate(`/zawodnik/${player.id}`)}>
                {player.shirt_number || `${player.last_name[0]}${player.first_name[0]}`}
              </div>
            )}
            {isAdmin && (
              <label style={{ position: 'absolute', bottom: -4, right: -4, width: 18, height: 18, background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 10, borderRadius: '50%', border: '1px solid var(--black)' }}>
                {isUploading ? '⏳' : '📷'}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => uploadPhoto(player, e.target.files[0])} disabled={isUploading} />
              </label>
            )}
          </div>

          {isEditing ? (
            <div style={{ flex: 1, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <input className="input-field" value={editForm.first_name} onChange={e => setEditForm({ ...editForm, first_name: e.target.value })} placeholder="Imię" style={{ width: 120, padding: '6px 10px', fontSize: 14 }} />
              <input className="input-field" value={editForm.last_name} onChange={e => setEditForm({ ...editForm, last_name: e.target.value })} placeholder="Nazwisko" style={{ width: 140, padding: '6px 10px', fontSize: 14 }} />
              <input className="input-field" type="number" value={editForm.shirt_number} onChange={e => setEditForm({ ...editForm, shirt_number: e.target.value })} placeholder="Nr" style={{ width: 70, padding: '6px 10px', fontSize: 14 }} />
              <button className="btn-gold" style={{ padding: '6px 14px', fontSize: 13 }} onClick={saveEdit} disabled={saving}>{saving ? '...' : 'Zapisz'}</button>
              <button className="btn-ghost" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => setEditingPlayer(null)}>Anuluj</button>
            </div>
          ) : (
            <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => navigate(`/zawodnik/${player.id}`)}>
              <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 16, fontWeight: 700 }}>
                {player.last_name} {player.first_name}
                {player.shirt_number && <span style={{ marginLeft: 8, fontFamily: 'var(--font-condensed)', fontSize: 13, color: 'var(--white-muted)', fontWeight: 400 }}>#{player.shirt_number}</span>}
              </div>
              {!player.active && <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 11, color: 'var(--white-muted)', letterSpacing: 1 }}>NIEAKTYWNY</div>}
            </div>
          )}

          {isAdmin && !isEditing && (
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              {player.photo_url && <button className="btn-danger" style={{ padding: '5px 8px', fontSize: 11 }} onClick={() => removePhoto(player)}>🗑️📷</button>}
              <button style={{ fontFamily: 'var(--font-condensed)', fontSize: 12, fontWeight: 700, padding: '5px 10px', background: 'transparent', border: '1px solid #333', color: 'var(--white-muted)', cursor: 'pointer' }}
                onClick={() => { setEditingPlayer(player.id); setEditForm({ first_name: player.first_name, last_name: player.last_name, shirt_number: player.shirt_number || '' }) }}>✏️ Edytuj</button>
              <button style={{ fontFamily: 'var(--font-condensed)', fontSize: 12, fontWeight: 700, padding: '5px 10px', background: 'transparent', border: `1px solid ${player.active ? '#4ade8044' : '#4ade80'}`, color: player.active ? 'var(--white-muted)' : '#4ade80', cursor: 'pointer' }}
                onClick={() => toggleActive(player)}>{player.active ? 'Dezaktywuj' : 'Aktywuj'}</button>
              <button className="btn-danger" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => deletePlayer(player.id)}>🗑️</button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 20px' }} className="fade-in">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 8 }}>
        <div>
          <h1 className="section-title">Zawodnicy</h1>
          <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 12, letterSpacing: 2, color: team.color, textTransform: 'uppercase', marginTop: 4 }}>{team.name}</div>
          <div className="gold-line" />
        </div>
        {isAdmin && <button className="btn-primary" onClick={() => setShowForm(!showForm)}>{showForm ? 'Anuluj' : '+ Dodaj zawodnika'}</button>}
      </div>

      {isAdmin && showForm && (
        <div className="card" style={{ padding: 24, marginBottom: 28, borderLeft: '4px solid var(--red)' }}>
          <h3 style={{ fontFamily: 'var(--font-condensed)', fontSize: 16, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>Nowy zawodnik — {team.name}</h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 140 }}><label style={lStyle}>Imię *</label><input style={iStyle} value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Imię" /></div>
            <div style={{ flex: 1, minWidth: 160 }}><label style={lStyle}>Nazwisko *</label><input style={iStyle} value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Nazwisko" /></div>
            <div style={{ width: 100 }}><label style={lStyle}>Nr koszulki</label><input style={iStyle} type="number" value={shirtNumber} onChange={e => setShirtNumber(e.target.value)} placeholder="Nr" onKeyDown={e => e.key === 'Enter' && addPlayer()} /></div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}><button className="btn-gold" onClick={addPlayer} disabled={saving}>{saving ? 'Dodaję...' : 'Dodaj'}</button></div>
          </div>
        </div>
      )}

      {/* Wyszukiwarka */}
      <input
        value={search} onChange={e => setSearch(e.target.value)}
        placeholder="🔍 Szukaj zawodnika..."
        style={{ width: '100%', background: '#1e1e1e', border: `1px solid ${search ? team.color : 'var(--black-border)'}`, color: 'var(--white)', padding: '10px 14px', fontSize: 15, marginBottom: 20, fontFamily: 'var(--font-body)', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
      />

      {loading ? (
        <div style={{ color: 'var(--white-muted)', fontFamily: 'var(--font-condensed)', letterSpacing: 2 }}>Ładowanie...</div>
      ) : (
        <>
          {isAdmin && <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 12, color: 'var(--white-muted)', letterSpacing: 1, marginBottom: 12 }}>💡 Kliknij 📷 przy zawodniku żeby dodać zdjęcie</div>}
          <div style={{ marginBottom: 4, fontFamily: 'var(--font-condensed)', fontSize: 11, letterSpacing: 2, color: 'var(--white-muted)', textTransform: 'uppercase' }}>Aktywni ({active.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 28 }}>
            {active.length === 0 ? <div style={{ color: 'var(--white-muted)', fontFamily: 'var(--font-condensed)', padding: '16px 0' }}>Brak zawodników</div>
              : active.map(p => <PlayerCard key={p.id} player={p} />)}
          </div>
          {inactive.length > 0 && <>
            <div style={{ marginBottom: 4, fontFamily: 'var(--font-condensed)', fontSize: 11, letterSpacing: 2, color: 'var(--white-muted)', textTransform: 'uppercase' }}>Nieaktywni ({inactive.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>{inactive.map(p => <PlayerCard key={p.id} player={p} />)}</div>
          </>}
        </>
      )}
    </div>
  )
}
