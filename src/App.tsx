import { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './services/supabase';
import { Session, User } from '@supabase/supabase-js';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'leaflet/dist/leaflet.css';
import './styles/design-system.css';

// Eager load only critical components
import DashboardLayout from './components/layout/DashboardLayout';
import LoadingScreen from './components/common/LoadingScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OrganizationProvider } from './contexts/OrganizationContext';
import { checkSystemHealth } from './utils/selfHealing';

// Lazy load all pages for better performance
const LoginPage = lazy(() => import('./pages/LoginPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AutonomousOperations = lazy(() => import('./pages/AutonomousOperations'));
const EventsPage = lazy(() => import('./pages/EventsPage'));
const EventDetailsPage = lazy(() => import('./pages/EventDetailsPage'));
const EventCreatePage = lazy(() => import('./pages/EventCreatePage'));
const EventEditPage = lazy(() => import('./pages/EventEditPage'));
const Contact = lazy(() => import('./pages/Contact'));
const JobsMapDemo = lazy(() => import('./pages/JobsMapDemo'));
const AccessPage = lazy(() => import('./pages/AccessPage'));
const AccessEditPage = lazy(() => import('./pages/AccessEditPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const NotificationTestPage = lazy(() => import('./pages/NotificationTestPage'));
const StaffManagementPage = lazy(() => import('./pages/StaffManagementPage'));
const WebhooksPage = lazy(() => import('./pages/WebhooksPage'));
const TelegramTestPage = lazy(() => import('./pages/TelegramTestPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const OrganizationPage = lazy(() => import('./pages/OrganizationPage'));
const TicketsPage = lazy(() => import('./pages/TicketsPage'));
const CheckinsPage = lazy(() => import('./pages/CheckinsPage'));
const WristbandsPage = lazy(() => import('./pages/WristbandsPage'));
const MapDemo = lazy(() => import('./pages/MapDemo'));
const FraudDetectionPage = lazy(() => import('./pages/FraudDetectionPage'));
const EmergencyPage = lazy(() => import('./pages/EmergencyPage'));
// SeriesManagementPage removed - series now use EventDetailsPage
const PlaceholderPage = lazy(() => import('./components/common/PlaceholderPage'));
const InteractiveTour = lazy(() => import('./components/onboarding/InteractiveTour'));
const TourButton = lazy(() => import('./components/onboarding/TourButton'));

export const App = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [showTour, setShowTour] = useState(false);
  const [systemHealthy, setSystemHealthy] = useState(true);

  useEffect(() => {
    // Run system health check on startup
    console.log('[App] Running startup system health check...');
    checkSystemHealth()
      .then(health => {
        setSystemHealthy(health.healthy);
        if (!health.healthy) {
          console.error('[App] System health check failed on startup:', health.errors);
        } else {
          console.log('[App] System health check passed');
        }
      })
      .catch(error => {
        console.error('[App] System health check error:', error);
        setSystemHealthy(false);
      });

    // Initialize auth with timeout protection
    const timeout = setTimeout(() => {
      console.warn('Auth initialization timeout, proceeding without session');
      setLoading(false);
    }, 8000); // 8 second timeout for auth

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
    <ErrorBoundary enableAutoRecovery={true}>
      {/* Show warning banner if system is unhealthy */}
      {!systemHealthy && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: '#f59e0b',
          color: 'white',
          padding: '8px 16px',
          textAlign: 'center',
          zIndex: 9999,
          fontSize: '14px',
          fontWeight: 'bold',
        }}>
          System health check failed. Some features may not work correctly. Self-healing in progress...
        </div>
      )}

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
        <Suspense fallback={<LoadingScreen />}>
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
              {/* Series use same EventDetailsPage as main events */}
              <Route path="series/:id" element={<EventDetailsPage />} />
              <Route path="series/:id/edit" element={<EventEditPage isSeries={true} />} />
              <Route path="wristbands" element={<WristbandsPage />} />
              <Route path="tickets" element={<TicketsPage />} />
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
              <Route path="map-demo" element={<MapDemo />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="notification-test" element={<NotificationTestPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          ) : (
            <Route path="*" element={<Navigate to="/login" replace />} />
          )}
        </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
