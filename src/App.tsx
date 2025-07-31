import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './services/supabase';
import { Session, User } from '@supabase/supabase-js';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Pages
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import EventsPage from './pages/EventsPage';
import EventDetailsPage from './pages/EventDetailsPage';
import EventCreatePage from './pages/EventCreatePage';
import EventEditPage from './pages/EventEditPage';
import WristbandsPage from './pages/WristbandsPage';
import WristbandCreatePage from './pages/WristbandCreatePage';
import WristbandEditPage from './pages/WristbandEditPage';
import CheckinsPage from './pages/CheckinsPage';
import AccessPage from './pages/AccessPage';
import AccessCreatePage from './pages/AccessCreatePage';
import AccessEditPage from './pages/AccessEditPage';
import SettingsPage from '@/pages/SettingsPage';
import NotificationTestPage from '@/pages/NotificationTestPage';

// Components
import DashboardLayout from './components/layout/DashboardLayout';
import LoadingScreen from './components/common/LoadingScreen';

export const App = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={!session ? <LoginPage /> : <Navigate to="/" />}
          />
          {/* Protected routes */}
          <Route
            element={
              session ? <DashboardLayout user={user} /> : <Navigate to="/login" />
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/events/new" element={<EventCreatePage />} />
            <Route path="/events/:id" element={<EventDetailsPage />} />
            <Route path="/events/:id/edit" element={<EventEditPage />} />
            <Route path="/wristbands" element={<WristbandsPage />} />
            <Route path="/wristbands/new" element={<WristbandCreatePage />} />
            <Route path="/wristbands/:id/edit" element={<WristbandEditPage />} />
            <Route path="/checkins" element={<CheckinsPage />} />
            <Route path="/access" element={<AccessPage />} />
            <Route path="/access/create" element={<AccessCreatePage />} />
            <Route path="/access/:id/edit" element={<AccessEditPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/notification-test" element={<NotificationTestPage />} />
            {/* Catch-all route for undefined paths */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
          {/* Catch-all route for non-authenticated users */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
