import React, { useState, useEffect } from 'react';
import { X, ArrowRight, ArrowLeft, CheckCircle, Calendar, CreditCard, Users, Activity, Shield, BarChart3, FileDown, AlertTriangle, TestTube, Settings } from 'lucide-react';

interface OnboardingWizardProps {
  onClose: () => void;
  onComplete: () => void;
}

interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  content: React.ReactNode;
  actionLabel?: string;
  actionUrl?: string;
}

const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onClose, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  const steps: WizardStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to QuickStrap NFC Portal',
      description: 'AI-powered autonomous wristband management system',
      icon: CreditCard,
      content: (
        <div className="space-y-4">
          <p className="text-lg text-gray-700">
            Welcome to the most advanced NFC event management platform! 🎉
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h4 className="font-semibold text-blue-900 mb-3">What can you do with this portal?</h4>
            <ul className="space-y-2 text-blue-800">
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                <span>Manage events with real-time check-in monitoring</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                <span>Bulk upload thousands of wristbands via CSV</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                <span>Detect and prevent fraud in real-time</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                <span>Access comprehensive analytics and reporting</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                <span>Respond to emergencies with one-click controls</span>
              </li>
            </ul>
          </div>
          <p className="text-gray-600 text-sm">
            This wizard will guide you through the key features in just 3 minutes.
          </p>
        </div>
      ),
    },
    {
      id: 'create-event',
      title: 'Step 1: Create Your First Event',
      description: 'Events are the foundation of your operations',
      icon: Calendar,
      content: (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 border border-purple-200">
            <h4 className="font-semibold text-purple-900 mb-3">Creating an Event</h4>
            <ol className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-600 text-white text-sm font-bold mr-3 flex-shrink-0">1</span>
                <span>Click <strong>"Events"</strong> in the sidebar, then <strong>"Create Event"</strong></span>
              </li>
              <li className="flex items-start">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-600 text-white text-sm font-bold mr-3 flex-shrink-0">2</span>
                <span>Fill in basic details: name, date, location, capacity</span>
              </li>
              <li className="flex items-start">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-600 text-white text-sm font-bold mr-3 flex-shrink-0">3</span>
                <span>Configure settings: security mode, gate behavior, alerts</span>
              </li>
              <li className="flex items-start">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-600 text-white text-sm font-bold mr-3 flex-shrink-0">4</span>
                <span>Save and you're ready to add wristbands!</span>
              </li>
            </ol>
          </div>
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <p className="text-sm text-yellow-800">
              <strong>💡 Tip:</strong> Set up your event at least 1 week before to allow time for testing and wristband distribution.
            </p>
          </div>
        </div>
      ),
      actionLabel: 'Create Event',
      actionUrl: '/events/new',
    },
    {
      id: 'upload-wristbands',
      title: 'Step 2: Add Wristbands',
      description: 'Bulk upload or create individual wristbands',
      icon: CreditCard,
      content: (
        <div className="space-y-4">
          <div className="bg-green-50 rounded-lg p-6 border border-green-200">
            <h4 className="font-semibold text-green-900 mb-3">Two Ways to Add Wristbands</h4>

            <div className="space-y-4">
              <div className="bg-white rounded-lg p-4 border border-green-200">
                <h5 className="font-semibold text-green-800 mb-2">📤 Bulk CSV Upload (Recommended)</h5>
                <ol className="space-y-2 text-gray-700 text-sm">
                  <li>1. Go to Event Details → <strong>Wristbands</strong> tab</li>
                  <li>2. Click <strong>"Upload CSV"</strong></li>
                  <li>3. Download the template or upload your file</li>
                  <li>4. Map columns: NFC ID, Category, Attendee Name, Email</li>
                  <li>5. Upload thousands of wristbands in seconds!</li>
                </ol>
                <div className="mt-3 p-3 bg-green-100 rounded">
                  <p className="text-xs text-green-800">
                    <strong>CSV Format:</strong> nfc_id, category, attendee_name, attendee_email
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-green-200">
                <h5 className="font-semibold text-green-800 mb-2">➕ Manual Entry</h5>
                <p className="text-sm text-gray-700">
                  Click <strong>"Add Wristband"</strong> to create individual wristbands. Great for small events or last-minute additions.
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
      actionLabel: 'View Wristbands',
      actionUrl: '/wristbands',
    },
    {
      id: 'event-features',
      title: 'Step 3: Explore Event Features',
      description: 'Discover 10 powerful tabs in Event Details',
      icon: Activity,
      content: (
        <div className="space-y-3">
          <p className="text-gray-700 mb-4">
            Once you open an event, you'll see these powerful features:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center mb-2">
                <Activity className="w-5 h-5 text-blue-600 mr-2" />
                <h5 className="font-semibold text-blue-900">Command Center</h5>
              </div>
              <p className="text-sm text-blue-800">Live operations dashboard with real-time check-ins</p>
            </div>

            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center mb-2">
                <Settings className="w-5 h-5 text-purple-600 mr-2" />
                <h5 className="font-semibold text-purple-900">Gates</h5>
              </div>
              <p className="text-sm text-purple-800">Manage entry gates and monitor performance</p>
            </div>

            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center mb-2">
                <CreditCard className="w-5 h-5 text-green-600 mr-2" />
                <h5 className="font-semibold text-green-900">Wristbands</h5>
              </div>
              <p className="text-sm text-green-800">Complete wristband manager with CSV upload</p>
            </div>

            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <div className="flex items-center mb-2">
                <Shield className="w-5 h-5 text-red-600 mr-2" />
                <h5 className="font-semibold text-red-900">Fraud Detection</h5>
              </div>
              <p className="text-sm text-red-800">Real-time fraud alerts and monitoring</p>
            </div>

            <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
              <div className="flex items-center mb-2">
                <BarChart3 className="w-5 h-5 text-indigo-600 mr-2" />
                <h5 className="font-semibold text-indigo-900">Analytics</h5>
              </div>
              <p className="text-sm text-indigo-800">Interactive charts and event insights</p>
            </div>

            <div className="bg-teal-50 rounded-lg p-4 border border-teal-200">
              <div className="flex items-center mb-2">
                <FileDown className="w-5 h-5 text-teal-600 mr-2" />
                <h5 className="font-semibold text-teal-900">Export</h5>
              </div>
              <p className="text-sm text-teal-800">Generate reports in CSV, PDF, Excel, JSON</p>
            </div>

            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <div className="flex items-center mb-2">
                <AlertTriangle className="w-5 h-5 text-orange-600 mr-2" />
                <h5 className="font-semibold text-orange-900">Emergency</h5>
              </div>
              <p className="text-sm text-orange-800">Quick response controls for emergencies</p>
            </div>

            <div className="bg-pink-50 rounded-lg p-4 border border-pink-200">
              <div className="flex items-center mb-2">
                <TestTube className="w-5 h-5 text-pink-600 mr-2" />
                <h5 className="font-semibold text-pink-900">Testing</h5>
              </div>
              <p className="text-sm text-pink-800">Pre-event testing and simulation suite</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center mb-2">
                <Users className="w-5 h-5 text-gray-600 mr-2" />
                <h5 className="font-semibold text-gray-900">Access</h5>
              </div>
              <p className="text-sm text-gray-800">User permissions and access control</p>
            </div>
          </div>
        </div>
      ),
      actionLabel: 'View Events',
      actionUrl: '/events',
    },
    {
      id: 'live-operations',
      title: 'Step 4: Live Event Operations',
      description: 'Monitor and manage your event in real-time',
      icon: Activity,
      content: (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-4">During Your Event</h4>

            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold mr-3 flex-shrink-0">1</div>
                <div>
                  <h5 className="font-semibold text-gray-900">Open Command Center</h5>
                  <p className="text-sm text-gray-700">Your mission control for real-time operations monitoring</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-600 text-white text-sm font-bold mr-3 flex-shrink-0">2</div>
                <div>
                  <h5 className="font-semibold text-gray-900">Monitor Fraud Detection</h5>
                  <p className="text-sm text-gray-700">Watch for suspicious activity and respond immediately</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-white text-sm font-bold mr-3 flex-shrink-0">3</div>
                <div>
                  <h5 className="font-semibold text-gray-900">Track Gate Performance</h5>
                  <p className="text-sm text-gray-700">Ensure smooth entry flow and balanced gate utilization</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-pink-600 text-white text-sm font-bold mr-3 flex-shrink-0">4</div>
                <div>
                  <h5 className="font-semibold text-gray-900">Emergency Controls</h5>
                  <p className="text-sm text-gray-700">Pause check-ins, broadcast alerts, or evacuate if needed</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border-l-4 border-green-400 p-4">
            <p className="text-sm text-green-800">
              <strong>✅ Pro Tip:</strong> Keep the Command Center tab open on a large screen for at-a-glance monitoring during your event.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'post-event',
      title: 'Step 5: Post-Event Analysis',
      description: 'Generate insights and export reports',
      icon: BarChart3,
      content: (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-indigo-50 to-teal-50 rounded-lg p-6 border border-indigo-200">
            <h4 className="font-semibold text-indigo-900 mb-4">After Your Event</h4>

            <div className="space-y-4">
              <div className="bg-white rounded-lg p-4 border border-indigo-200">
                <h5 className="font-semibold text-indigo-800 mb-2 flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Analytics Dashboard
                </h5>
                <ul className="text-sm text-gray-700 space-y-1 ml-7">
                  <li>• View comprehensive event metrics</li>
                  <li>• Analyze time-series check-in trends</li>
                  <li>• Compare gate performance</li>
                  <li>• Review category distribution</li>
                </ul>
              </div>

              <div className="bg-white rounded-lg p-4 border border-teal-200">
                <h5 className="font-semibold text-teal-800 mb-2 flex items-center">
                  <FileDown className="w-5 h-5 mr-2" />
                  Export & Reporting
                </h5>
                <p className="text-sm text-gray-700 ml-7 mb-2">Generate professional reports:</p>
                <ul className="text-sm text-gray-700 space-y-1 ml-7">
                  <li>📄 Check-in Log (CSV)</li>
                  <li>📊 Attendance Summary (PDF)</li>
                  <li>📈 Gate Performance (Excel)</li>
                  <li>👥 Staff Performance (Excel)</li>
                  <li>🛡️ Security Report (CSV)</li>
                  <li>📋 Compliance Audit (JSON)</li>
                </ul>
              </div>

              <div className="bg-white rounded-lg p-4 border border-purple-200">
                <h5 className="font-semibold text-purple-800 mb-2">Schedule Automated Reports</h5>
                <p className="text-sm text-gray-700">
                  Set up daily, weekly, or monthly reports sent automatically to your team.
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
      actionLabel: 'View Analytics',
      actionUrl: '/events',
    },
    {
      id: 'advanced-features',
      title: 'Advanced Features',
      description: 'Power user capabilities',
      icon: Shield,
      content: (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6 border border-purple-200">
            <h4 className="font-semibold text-purple-900 mb-4">Advanced Capabilities</h4>

            <div className="space-y-3">
              <div className="flex items-start p-3 bg-white rounded-lg border border-purple-200">
                <Shield className="w-6 h-6 text-purple-600 mr-3 flex-shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-semibold text-gray-900">AI-Powered Fraud Detection</h5>
                  <p className="text-sm text-gray-700">Automatically detect multiple check-ins, impossible location changes, and suspicious patterns</p>
                </div>
              </div>

              <div className="flex items-start p-3 bg-white rounded-lg border border-purple-200">
                <Activity className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-semibold text-gray-900">Autonomous Operations</h5>
                  <p className="text-sm text-gray-700">Access from sidebar - AI makes decisions based on system health and predictive analytics</p>
                </div>
              </div>

              <div className="flex items-start p-3 bg-white rounded-lg border border-purple-200">
                <Users className="w-6 h-6 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-semibold text-gray-900">Staff Management</h5>
                  <p className="text-sm text-gray-700">Track staff performance, monitor activity, and manage gate assignments per event</p>
                </div>
              </div>

              <div className="flex items-start p-3 bg-white rounded-lg border border-purple-200">
                <TestTube className="w-6 h-6 text-pink-600 mr-3 flex-shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-semibold text-gray-900">Pre-Event Testing</h5>
                  <p className="text-sm text-gray-700">Simulate scenarios, test gates, validate configurations before going live</p>
                </div>
              </div>

              <div className="flex items-start p-3 bg-white rounded-lg border border-purple-200">
                <AlertTriangle className="w-6 h-6 text-orange-600 mr-3 flex-shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-semibold text-gray-900">Emergency Response</h5>
                  <p className="text-sm text-gray-700">One-click emergency controls: pause check-ins, block categories, broadcast alerts</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
            <p className="text-sm text-blue-800">
              <strong>🎓 Learn More:</strong> Check out FEATURE_ACCESS_GUIDE.md in the project root for detailed documentation.
            </p>
          </div>
        </div>
      ),
      actionLabel: 'Explore Autonomous Ops',
      actionUrl: '/autonomous-operations',
    },
    {
      id: 'complete',
      title: 'You\'re All Set! 🎉',
      description: 'Start managing your events like a pro',
      icon: CheckCircle,
      content: (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-8 border border-green-200 text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Congratulations!</h3>
            <p className="text-lg text-gray-700 mb-6">
              You now know how to use all the powerful features of QuickStrap NFC Portal.
            </p>

            <div className="bg-white rounded-lg p-6 mb-6">
              <h4 className="font-semibold text-gray-900 mb-4">Quick Reference</h4>
              <div className="grid grid-cols-2 gap-4 text-left">
                <div>
                  <h5 className="font-semibold text-sm text-gray-700 mb-2">Setup Phase:</h5>
                  <ol className="text-sm text-gray-600 space-y-1">
                    <li>1. Create Event</li>
                    <li>2. Upload Wristbands (CSV)</li>
                    <li>3. Set up Gates</li>
                    <li>4. Run Tests</li>
                  </ol>
                </div>
                <div>
                  <h5 className="font-semibold text-sm text-gray-700 mb-2">Live Phase:</h5>
                  <ol className="text-sm text-gray-600 space-y-1">
                    <li>1. Monitor Command Center</li>
                    <li>2. Watch Fraud Alerts</li>
                    <li>3. Track Gates</li>
                    <li>4. Emergency Controls</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <a
                href="/events"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                Create First Event
              </a>
              <a
                href="/autonomous-operations"
                className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition"
              >
                Explore AI Features
              </a>
            </div>

            <button
              onClick={() => {
                markAsComplete();
                onComplete();
              }}
              className="text-sm text-gray-600 hover:text-gray-800 underline"
            >
              Don't show this wizard again
            </button>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>💡 Need Help?</strong> You can always access this wizard again from Settings → Onboarding Guide
            </p>
          </div>
        </div>
      ),
    },
  ];

  const markAsComplete = () => {
    localStorage.setItem('onboarding_completed', 'true');
    localStorage.setItem('onboarding_completed_at', new Date().toISOString());
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCompletedSteps([...completedSteps, steps[currentStep].id]);
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    markAsComplete();
    onClose();
  };

  const currentStepData = steps[currentStep];
  const Icon = currentStepData.icon;
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Icon className="w-8 h-8 mr-3" />
              <div>
                <h2 className="text-2xl font-bold">{currentStepData.title}</h2>
                <p className="text-blue-100 text-sm">{currentStepData.description}</p>
              </div>
            </div>
            <button
              onClick={handleSkip}
              className="text-white hover:text-gray-200 transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-blue-800 rounded-full h-2">
            <div
              className="bg-white rounded-full h-2 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-blue-100 mt-2">
            Step {currentStep + 1} of {steps.length}
          </p>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto max-h-[calc(90vh-250px)]">
          {currentStepData.content}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-8 py-6 flex items-center justify-between border-t">
          <div className="flex space-x-2">
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

          <div className="flex space-x-3">
            {currentStep > 0 && (
              <button
                onClick={handlePrevious}
                className="px-6 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-100 transition flex items-center"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </button>
            )}

            {currentStepData.actionUrl && (
              <a
                href={currentStepData.actionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-2 border border-blue-600 text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition"
              >
                {currentStepData.actionLabel || 'Try it now'}
              </a>
            )}

            {currentStep < steps.length - 1 ? (
              <button
                onClick={handleNext}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition flex items-center"
              >
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            ) : (
              <button
                onClick={() => {
                  markAsComplete();
                  onComplete();
                }}
                className="px-8 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition flex items-center"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                Complete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;
