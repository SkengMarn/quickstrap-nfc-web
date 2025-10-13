import React, { useState, useEffect, useRef } from 'react';
import { X, ArrowRight, CheckCircle } from 'lucide-react';

interface TourStep {
  id: string;
  target: string; // CSS selector for the element to highlight
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  route?: string; // Navigate to this route before showing step
  action?: () => void; // Optional action to perform
  highlightPadding?: number; // Padding around highlighted element
}

interface InteractiveTourProps {
  onClose: () => void;
  onComplete: () => void;
}

const InteractiveTour: React.FC<InteractiveTourProps> = ({ onClose, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [bubblePosition, setBubblePosition] = useState({ top: 0, left: 0 });
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  const steps: TourStep[] = [
    {
      id: 'welcome',
      target: 'body',
      title: 'Welcome to QuickStrap NFC Portal! 🎉',
      description: 'Let me show you around. This tour will guide you through every feature in the portal.',
      position: 'bottom',
      highlightPadding: 0,
    },
    // OVERVIEW SECTION
    {
      id: 'dashboard',
      target: 'a[href="/"]',
      title: '📊 Dashboard',
      description: 'Your central command center. View real-time stats, recent activity, and event summaries.',
      position: 'right',
      highlightPadding: 8,
    },
    // EVENT MANAGEMENT SECTION
    {
      id: 'events',
      target: 'a[href="/events"]',
      title: '📅 Events',
      description: 'Create and manage your events here. Each event has its own wristbands, gates, analytics, and more.',
      position: 'right',
      highlightPadding: 8,
    },
    {
      id: 'wristbands',
      target: 'a[href="/wristbands"]',
      title: '🎟️ Wristbands',
      description: 'Manage all wristbands across all events. Bulk upload CSV files with thousands of wristbands at once.',
      position: 'right',
      highlightPadding: 8,
    },
    {
      id: 'checkins',
      target: 'a[href="/checkins"]',
      title: '✅ Check-ins',
      description: 'View all check-in activity across events. Filter by event, date, gate, or wristband category.',
      position: 'right',
      highlightPadding: 8,
    },
    // OPERATIONS SECTION
    {
      id: 'access-control',
      target: 'a[href="/access"]',
      title: '👥 Access Control',
      description: 'Manage team access and permissions. Grant users access to specific events with different permission levels.',
      position: 'right',
      highlightPadding: 8,
    },
    {
      id: 'analytics-sidebar',
      target: 'a[href="/analytics"]',
      title: '📈 Analytics',
      description: 'Deep dive into event analytics. View trends, patterns, and comprehensive performance metrics.',
      position: 'right',
      highlightPadding: 8,
    },
    {
      id: 'reports',
      target: 'a[href="/reports"]',
      title: '📄 Reports',
      description: 'Generate and download reports. Export data in CSV, PDF, Excel, or JSON formats.',
      position: 'right',
      highlightPadding: 8,
    },
    // SECURITY & MONITORING SECTION
    {
      id: 'fraud-detection',
      target: 'a[href="/fraud"]',
      title: '🛡️ Fraud Detection',
      description: 'AI-powered fraud monitoring. Detect multiple check-ins, impossible locations, and suspicious patterns.',
      position: 'right',
      highlightPadding: 8,
    },
    {
      id: 'emergency-center',
      target: 'a[href="/emergency"]',
      title: '🚨 Emergency Center',
      description: 'Emergency response controls. Pause check-ins, block categories, broadcast alerts, or trigger evacuation.',
      position: 'right',
      highlightPadding: 8,
    },
    {
      id: 'autonomous-ops',
      target: 'a[href="/autonomous-operations"]',
      title: '⚡ Autonomous Ops',
      description: 'AI-powered autonomous operations. The system monitors health and makes smart decisions automatically.',
      position: 'right',
      highlightPadding: 8,
    },
    // ADMINISTRATION SECTION
    {
      id: 'organization',
      target: 'a[href="/organization"]',
      title: '🏢 Organization',
      description: 'Manage your organization settings, team members, and billing information.',
      position: 'right',
      highlightPadding: 8,
    },
    {
      id: 'settings',
      target: 'a[href="/settings"]',
      title: '⚙️ Settings',
      description: 'Manage your account, change password, and configure preferences. You can restart this tour from the Help tab.',
      position: 'right',
      highlightPadding: 8,
    },
    // EVENT DETAIL FEATURES
    {
      id: 'event-details-intro',
      target: 'a[href="/events"]',
      title: '🎯 Event Details',
      description: 'When you open any event, you\'ll find powerful tabs for managing every aspect. Let me show you...',
      position: 'right',
      highlightPadding: 8,
    },
    {
      id: 'live-operations-tab',
      target: 'button[data-tab="command-center"]',
      title: '🎛️ Live Operations Tab',
      description: 'Inside each event: Real-time command center for monitoring check-ins, gate performance, and system health during live events.',
      position: 'bottom',
      highlightPadding: 8,
    },
    {
      id: 'analytics-tab',
      target: 'button[data-tab="analytics"]',
      title: '📊 Analytics Tab',
      description: 'Inside each event: View event-specific analytics, charts, time-series data, and performance insights.',
      position: 'bottom',
      highlightPadding: 8,
    },
    {
      id: 'team-access-tab',
      target: 'button[data-tab="access"]',
      title: '👥 Team Access Tab',
      description: 'Inside each event: Control who can access this specific event and what permissions they have.',
      position: 'bottom',
      highlightPadding: 8,
    },
    // STAFF MANAGEMENT
    {
      id: 'staff-management',
      target: 'a[href="/events"]',
      title: '👨‍💼 Staff Management',
      description: 'Each event has a Staff tab where you can track performance, monitor activity, and manage gate assignments. Access it from: Events → Open Event → More tabs.',
      position: 'right',
      highlightPadding: 8,
    },
    {
      id: 'complete',
      target: 'body',
      title: 'You\'re All Set! ✨',
      description: 'You now know where every feature is located. Start by creating an event, then explore the tabs inside!',
      position: 'bottom',
      highlightPadding: 0,
    },
  ];

  const currentStepData = steps[currentStep];

  useEffect(() => {
    // Navigate to route if specified
    if (currentStepData.route && window.location.pathname !== currentStepData.route) {
      window.location.href = currentStepData.route;
      // Wait for navigation and DOM update
      setTimeout(() => {
        updateHighlight();
      }, 300);
    } else {
      updateHighlight();
    }
  }, [currentStep]); // Remove currentStepData from dependencies

  const updateHighlight = () => {
    const targetElement = document.querySelector(currentStepData.target);

    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      setHighlightRect(rect);

      // Calculate bubble position based on target and position preference
      const padding = currentStepData.highlightPadding || 8;
      const bubbleWidth = 400;
      const bubbleHeight = 180;

      let top = 0;
      let left = 0;

      switch (currentStepData.position) {
        case 'right':
          top = rect.top + rect.height / 2 - bubbleHeight / 2;
          left = rect.right + padding + 20;
          break;
        case 'left':
          top = rect.top + rect.height / 2 - bubbleHeight / 2;
          left = rect.left - bubbleWidth - padding - 20;
          break;
        case 'top':
          top = rect.top - bubbleHeight - padding - 20;
          left = rect.left + rect.width / 2 - bubbleWidth / 2;
          break;
        case 'bottom':
          top = rect.bottom + padding + 20;
          left = rect.left + rect.width / 2 - bubbleWidth / 2;
          break;
      }

      // Keep bubble in viewport
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (left + bubbleWidth > viewportWidth - 20) {
        left = viewportWidth - bubbleWidth - 20;
      }
      if (left < 20) {
        left = 20;
      }
      if (top + bubbleHeight > viewportHeight - 20) {
        top = viewportHeight - bubbleHeight - 20;
      }
      if (top < 20) {
        top = 20;
      }

      setBubblePosition({ top, left });

      // Scroll element into view
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      // Fallback for body or missing elements
      setBubblePosition({ top: window.innerHeight / 2 - 100, left: window.innerWidth / 2 - 200 });
      setHighlightRect(null);
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      markAsComplete();
      onComplete();
    }
  };

  const handleSkip = () => {
    markAsComplete();
    onClose();
  };

  const markAsComplete = () => {
    localStorage.setItem('onboarding_completed', 'true');
    localStorage.setItem('onboarding_completed_at', new Date().toISOString());
  };

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <>
      {/* Overlay with spotlight */}
      <div className="fixed inset-0 z-[9998]" style={{ pointerEvents: 'none' }}>
        <svg className="w-full h-full">
          <defs>
            <mask id="spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {highlightRect && (
                <rect
                  x={highlightRect.left - (currentStepData.highlightPadding || 8)}
                  y={highlightRect.top - (currentStepData.highlightPadding || 8)}
                  width={highlightRect.width + (currentStepData.highlightPadding || 8) * 2}
                  height={highlightRect.height + (currentStepData.highlightPadding || 8) * 2}
                  rx="8"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.7)"
            mask="url(#spotlight-mask)"
          />
        </svg>

        {/* Highlighted element border */}
        {highlightRect && (
          <div
            className="absolute border-4 border-blue-500 rounded-lg pointer-events-none animate-pulse"
            style={{
              top: highlightRect.top - (currentStepData.highlightPadding || 8),
              left: highlightRect.left - (currentStepData.highlightPadding || 8),
              width: highlightRect.width + (currentStepData.highlightPadding || 8) * 2,
              height: highlightRect.height + (currentStepData.highlightPadding || 8) * 2,
            }}
          />
        )}
      </div>

      {/* Tour bubble */}
      <div
        ref={bubbleRef}
        className="fixed z-[9999] bg-white rounded-xl shadow-2xl border-2 border-blue-500 transition-all duration-300"
        style={{
          top: bubblePosition.top,
          left: bubblePosition.left,
          width: '400px',
          pointerEvents: 'auto',
        }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-t-xl text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold">{currentStepData.title}</h3>
            <button
              onClick={handleSkip}
              className="text-white hover:text-gray-200 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-blue-800 rounded-full h-1.5">
            <div
              className="bg-white rounded-full h-1.5 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-blue-100 mt-1">
            Step {currentStep + 1} of {steps.length}
          </p>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-gray-700 text-sm leading-relaxed">{currentStepData.description}</p>
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 flex items-center justify-between">
          <button
            onClick={handleSkip}
            className="text-sm text-gray-500 hover:text-gray-700 transition"
          >
            Skip Tour
          </button>

          <button
            onClick={handleNext}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition flex items-center text-sm"
          >
            {currentStep < steps.length - 1 ? (
              <>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Complete
              </>
            )}
          </button>
        </div>

        {/* Arrow pointer */}
        {highlightRect && (
          <div
            className="absolute w-0 h-0"
            style={{
              ...(currentStepData.position === 'right' && {
                left: '-10px',
                top: '50%',
                transform: 'translateY(-50%)',
                borderTop: '10px solid transparent',
                borderBottom: '10px solid transparent',
                borderRight: '10px solid #2563eb',
              }),
              ...(currentStepData.position === 'left' && {
                right: '-10px',
                top: '50%',
                transform: 'translateY(-50%)',
                borderTop: '10px solid transparent',
                borderBottom: '10px solid transparent',
                borderLeft: '10px solid #2563eb',
              }),
              ...(currentStepData.position === 'top' && {
                bottom: '-10px',
                left: '50%',
                transform: 'translateX(-50%)',
                borderLeft: '10px solid transparent',
                borderRight: '10px solid transparent',
                borderTop: '10px solid white',
              }),
              ...(currentStepData.position === 'bottom' && {
                top: '-10px',
                left: '50%',
                transform: 'translateX(-50%)',
                borderLeft: '10px solid transparent',
                borderRight: '10px solid transparent',
                borderBottom: '10px solid #2563eb',
              }),
            }}
          />
        )}
      </div>

      {/* Step indicators */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[9999] flex space-x-2">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentStep
                ? 'bg-blue-600 w-8'
                : index < currentStep
                ? 'bg-green-500'
                : 'bg-gray-300'
            }`}
          />
        ))}
      </div>
    </>
  );
};

export default InteractiveTour;
