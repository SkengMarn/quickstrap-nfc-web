import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './services/supabase';
import { Session, User } from '@supabase/supabase-js';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './styles/design-system.css';

// Pages
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import AutonomousOperations from './pages/AutonomousOperations';
import EventsPage from './pages/EventsPage';
import EventDetailsPage from './pages/EventDetailsPage';
import EventCreatePage from './pages/EventCreatePage';
import EventEditPage from './pages/EventEditPage';
// import WristbandEditPage from './pages/WristbandEditPage';
import CheckinsPage from './pages/CheckinsPage';
import AccessPage from './pages/AccessPage';
// import AccessCreatePage from './pages/AccessCreatePage'; // Currently unused
import AccessEditPage from './pages/AccessEditPage';
import SettingsPage from './pages/SettingsPage';
import NotificationTestPage from './pages/NotificationTestPage';
import StaffManagementPage from './pages/StaffManagementPage';
import WebhooksPage from './pages/WebhooksPage';
import TelegramTestPage from './pages/TelegramTestPage';
import ReportsPage from './pages/ReportsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import OrganizationPage from './pages/OrganizationPage';
import TicketsPage from './pages/TicketsPage';
import FraudDetectionPage from './pages/FraudDetectionPage';
import EmergencyPage from './pages/EmergencyPage';

// Components
import DashboardLayout from './components/layout/DashboardLayout';
import LoadingScreen from './components/common/LoadingScreen';
import ErrorBoundary from './components/common/ErrorBoundary';
import PlaceholderPage from './components/common/PlaceholderPage';
import InteractiveTour from './components/onboarding/InteractiveTour';
import TourButton from './components/onboarding/TourButton';
import { OrganizationProvider } from './contexts/OrganizationContext';
import { BarChart3, FileText, Shield, AlertTriangle, Building } from 'lucide-react';

export const App = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    // Add timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      console.warn('Auth initialization timeout, proceeding without session');
      setLoading(false);
    }, 10000); // 10 second timeout

    // Get initial session with error handling
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        clearTimeout(timeout);
        if (error) {
          console.error('Auth session error:', error);
        }
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      })
      .catch((error) => {
        clearTimeout(timeout);
        console.error('Auth initialization failed:', error);
        setLoading(false);
      });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  const handleTourComplete = () => {
    setShowTour(false);
    localStorage.setItem('onboarding_completed', 'true');
    localStorage.setItem('onboarding_completed_at', new Date().toISOString());
  };

  return (
    <ErrorBoundary>
      {/* Interactive Tour */}
      {session && showTour && (
        <InteractiveTour
          onClose={() => setShowTour(false)}
          onComplete={handleTourComplete}
        />
      )}

      {/* Tour Button */}
      {session && !showTour && (
        <TourButton onClick={() => setShowTour(true)} />
      )}

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
          {session ? (
            <Route path="/*" element={
              <OrganizationProvider>
                <DashboardLayout user={user} />
              </OrganizationProvider>
            }>
              <Route index element={<Dashboard />} />
              <Route path="autonomous-operations" element={<AutonomousOperations />} />
              <Route path="events" element={<EventsPage />} />
              <Route path="events/new" element={<EventCreatePage />} />
              <Route path="events/:id" element={<EventDetailsPage />} />
              <Route path="events/:id/edit" element={<EventEditPage />} />
              <Route path="events/:eventId/staff" element={<StaffManagementPage />} />
              {/* <Route path="wristbands/:id/edit" element={<WristbandEditPage />} /> */}
              <Route path="checkins" element={<CheckinsPage />} />
              <Route path="access" element={<AccessPage />} />
              <Route path="access/:id/edit" element={<AccessEditPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="fraud" element={<FraudDetectionPage />} />
              <Route path="emergency" element={<EmergencyPage />} />
              <Route path="organization" element={<OrganizationPage />} />
              <Route path="webhooks" element={<WebhooksPage />} />
              <Route path="telegram-test" element={<TelegramTestPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="notification-test" element={<NotificationTestPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          ) : (
            <Route path="*" element={<Navigate to="/login" replace />} />
          )}
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
