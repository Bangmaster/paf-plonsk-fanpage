import { createContext, useContext, useState } from 'react'

const TeamContext = createContext(null)

export const TEAMS = {
  paf1: { id: 'paf1', name: 'PAF Płońsk', short: 'PAF 1', color: '#C0392B', colorDark: '#96281B' },
  paf2: { id: 'paf2', name: 'PAF 2 Płońsk', short: 'PAF 2', color: '#2980B9', colorDark: '#1a5276' },
}

export function TeamProvider({ children }) {
  const [activeTeam, setActiveTeam] = useState(() => {
    return localStorage.getItem('paf_active_team') || 'paf1'
  })

  function switchTeam(teamId) {
    localStorage.setItem('paf_active_team', teamId)
    setActiveTeam(teamId)
  }

  const team = TEAMS[activeTeam] || TEAMS.paf1

  return (
    <TeamContext.Provider value={{ activeTeam, team, switchTeam, TEAMS }}>
      {children}
    </TeamContext.Provider>
  )
}

export function useTeam() {
  return useContext(TeamContext)
}
