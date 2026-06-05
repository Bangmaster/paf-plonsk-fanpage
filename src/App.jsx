import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import Home from './pages/Home.jsx'
import Schedule from './pages/Schedule.jsx'
import MatchDetail from './pages/MatchDetail.jsx'
import Players from './pages/Players.jsx'
import Summary from './pages/Summary.jsx'
import LoginPage from './pages/LoginPage.jsx'
import Backup from './pages/Backup.jsx'

export default function App() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/terminarz" element={<Schedule />} />
          <Route path="/mecz/:id" element={<MatchDetail />} />
          <Route path="/zawodnicy" element={<Players />} />
          <Route path="/podsumowanie" element={<Summary />} />
          <Route path="/admin" element={<LoginPage />} />
          <Route path="/backup" element={<Backup />} />
        </Routes>
      </main>
      <footer style={{
        borderTop: '1px solid #2a2a2a',
        padding: '20px',
        textAlign: 'center',
        color: '#555',
        fontFamily: 'var(--font-condensed)',
        fontSize: '13px',
        letterSpacing: '1px'
      }}>
        FANPAGE PAF PŁOŃSK © {new Date().getFullYear()}
      </footer>
    </div>
  )
}
