import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import TeamSwitcher from './components/TeamSwitcher';
import Home from './pages/Home';
import Schedule from './pages/Schedule';
import MatchDetail from './pages/MatchDetail';
import Players from './pages/Players';
import PlayerProfile from './pages/PlayerProfile';
import Table from './pages/Table';
import Summary from './pages/Summary';
import History from './pages/History';
import LoginPage from './pages/LoginPage';
import Backup from './pages/Backup';
import Interviews from './pages/Interviews';
import Predictions from './pages/Predictions';
import PlayerOfMonth from './pages/PlayerOfMonth';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <>
      <TeamSwitcher />
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/terminarz" element={<Schedule />} />
        <Route path="/mecz/:id" element={<MatchDetail />} />
        <Route path="/zawodnicy" element={<Players />} />
        <Route path="/zawodnik/:id" element={<PlayerProfile />} />
        <Route path="/tabela" element={<Table />} />
        <Route path="/podsumowanie" element={<Summary />} />
        <Route path="/historia" element={<History />} />
        <Route path="/wywiady" element={<Interviews />} />
        <Route path="/typowanie" element={<Predictions />} />
        <Route path="/pilkarz-miesiaca" element={<PlayerOfMonth />} />
        <Route path="/admin" element={<LoginPage />} />
        <Route path="/backup" element={<Backup />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
