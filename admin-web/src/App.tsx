import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/useAuth';
import Layout from './components/Layout';
import Login from './pages/login/Login';
import PostManager from './pages/posts/PostManager';
import JurisdictionTree from './pages/jurisdictions/JurisdictionTree';
import BearerForm from './pages/bearers/BearerForm';
import BearersList from './pages/bearers/BearersList';
import Directory from './pages/bearers/Directory';
import PendingRegistrations from './pages/registrations/PendingRegistrations';
import EventForm from './pages/events/EventForm';
import EventDashboard from './pages/dashboard/EventDashboard';
import CoverageReport from './pages/coverage/CoverageReport';
import PostComposer from './pages/news/PostComposer';
import Drafts from './pages/news/Drafts';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { loggedIn } = useAuth();
  if (!loggedIn) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { logIn } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login onLoggedIn={logIn} />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Navigate to="/posts" replace />} />
        <Route path="/posts" element={<PostManager />} />
        <Route path="/jurisdictions" element={<JurisdictionTree />} />
        <Route path="/bearers" element={<BearerForm />} />
        <Route path="/bearers/list" element={<BearersList />} />
        <Route path="/registrations" element={<PendingRegistrations />} />
        <Route path="/directory" element={<Directory />} />
        <Route path="/events" element={<EventForm />} />
        <Route path="/dashboard" element={<EventDashboard />} />
        <Route path="/coverage" element={<CoverageReport />} />
        <Route path="/news" element={<PostComposer />} />
        <Route path="/news/drafts" element={<Drafts />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
