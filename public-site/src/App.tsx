import { Route, Routes } from 'react-router-dom';
import SiteLayout from './components/SiteLayout';
import Home from './pages/Home';
import Register from './pages/Register';
import Ideology from './pages/Ideology';
import History from './pages/History';
import Bearers from './pages/Bearers';
import News from './pages/News';
import Events from './pages/Events';

export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/ideology" element={<Ideology />} />
        <Route path="/history" element={<History />} />
        <Route path="/bearers" element={<Bearers />} />
        <Route path="/news" element={<News />} />
        <Route path="/events" element={<Events />} />
      </Route>
    </Routes>
  );
}
