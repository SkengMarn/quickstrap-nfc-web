/**
 * EXACT INTEGRATION EXAMPLE
 *
 * This file shows EXACTLY where to add the series components
 * to your EventDetailsPage.tsx
 *
 * Search for these comments in your file and add the code below them.
 */

// ============================================================================
// STEP 1: ADD IMPORTS (at the top of EventDetailsPage.tsx)
// ============================================================================
// Find the section with other component imports and add these:

import SeriesManagement from '../components/events/SeriesManagement'
import CreateSeriesDialog from '../components/events/CreateSeriesDialog'

// ============================================================================
// STEP 2: ADD STATE (inside EventDetailsPage component, around line 45)
// ============================================================================
// Add this with your other useState declarations:

const [showCreateSeriesDialog, setShowCreateSeriesDialog] = useState(false)

// ============================================================================
// STEP 3: ADD TO TABS ARRAY
// ============================================================================
// Find where tabs are defined (search for "const tabs =") and add 'series':

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'series', label: 'Series' },  // ← ADD THIS LINE
  { id: 'wristbands', label: 'Wristbands' },
  { id: 'gates', label: 'Gates' },
  { id: 'tickets', label: 'Guest List' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'command', label: 'Command Center' },
  { id: 'monitoring', label: 'Monitoring' },
  { id: 'reports', label: 'Reports' },
  { id: 'emergency', label: 'Emergency' },
  { id: 'testing', label: 'Testing' },
]

// ============================================================================
// STEP 4: ADD SERIES TAB CONTENT
// ============================================================================
// Find where activeTab conditions are (search for "activeTab === 'overview'")
// Add this section after the overview section:

{/* OVERVIEW TAB */}
{activeTab === 'overview' && (
  <div className="space-y-6">
    {/* Your existing overview content */}
  </div>
)}

{/* ↓↓↓ ADD THIS ENTIRE SECTION ↓↓↓ */}
{/* SERIES TAB */}
{activeTab === 'series' && (
  <div className="space-y-6">
    <SeriesManagement
      eventId={id!}
      eventName={event?.name || ''}
      onCreateSeries={() => setShowCreateSeriesDialog(true)}
    />
  </div>
)}
{/* ↑↑↑ END OF SERIES TAB ↑↑↑ */}

{/* WRISTBANDS TAB */}
{activeTab === 'wristbands' && (
  <div className="space-y-6">
    {/* Your existing wristbands content */}
  </div>
)}

// ... rest of tabs ...

// ============================================================================
// STEP 5: ADD DIALOG AT THE END OF COMPONENT
// ============================================================================
// At the very end of your EventDetailsPage component,
// just before the final closing tag, add:

return (
  <div className="min-h-screen bg-gray-50">
    {/* ... all your existing content ... */}

    {/* ... all your existing modals/dialogs ... */}

    {/* ↓↓↓ ADD THIS AT THE END ↓↓↓ */}
    {/* Create Series Dialog */}
    {showCreateSeriesDialog && (
      <CreateSeriesDialog
        eventId={id!}
        eventName={event?.name || ''}
        isOpen={showCreateSeriesDialog}
        onClose={() => setShowCreateSeriesDialog(false)}
        onSuccess={() => {
          // Optionally switch to series tab after creation
          setActiveTab('series')
        }}
      />
    )}
    {/* ↑↑↑ END OF DIALOG ↑↑↑ */}
  </div>
)

// ============================================================================
// STEP 6: ADD "ADD TO SERIES" TO WRISTBANDS (Optional but Recommended)
// ============================================================================
// If you're using EnhancedWristbandManager or similar:

// 6a. Import the component at the top:
import AddToSeriesBulkAction from '../components/wristbands/AddToSeriesBulkAction'

// 6b. Add state for it:
const [showAddToSeriesDialog, setShowAddToSeriesDialog] = useState(false)
const [selectedWristbandIds, setSelectedWristbandIds] = useState<string[]>([])

// 6c. Pass props to your wristband manager:
<EnhancedWristbandManager
  eventId={id!}
  event={event}
  onAddToSeries={(wristbandIds) => {
    setSelectedWristbandIds(wristbandIds)
    setShowAddToSeriesDialog(true)
  }}
/>

// 6d. Add the dialog at the end (with the series dialog):
{showAddToSeriesDialog && (
  <AddToSeriesBulkAction
    eventId={id!}
    selectedWristbandIds={selectedWristbandIds}
    isOpen={showAddToSeriesDialog}
    onClose={() => {
      setShowAddToSeriesDialog(false)
      setSelectedWristbandIds([])
    }}
    onSuccess={() => {
      setSelectedWristbandIds([])
      // Optionally refresh wristbands list
    }}
  />
)}

// ============================================================================
// ALTERNATIVE: If you have a wristbands table with checkboxes
// ============================================================================
// Add this button to show when wristbands are selected:

{selectedWristbandIds.length > 0 && (
  <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
    <span className="text-sm text-blue-700">
      {selectedWristbandIds.length} wristband{selectedWristbandIds.length !== 1 ? 's' : ''} selected
    </span>
    <button
      onClick={() => setShowAddToSeriesDialog(true)}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
    >
      Add to Series
    </button>
    <button
      onClick={() => setSelectedWristbandIds([])}
      className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors text-sm"
    >
      Clear Selection
    </button>
  </div>
)}

// ============================================================================
// THAT'S IT! 🎉
// ============================================================================
// After adding these sections, your series management will be fully functional:
//
// ✅ Users can create series from the Series tab
// ✅ Series are displayed in a nested table with proper hierarchy
// ✅ Users can expand/collapse series to see details
// ✅ Users can bulk assign wristbands to series
// ✅ Access control is enforced (wristbands must be assigned to series)
//
// Test it by:
// 1. Creating a test event
// 2. Going to Series tab
// 3. Creating a series
// 4. Going to Wristbands tab
// 5. Selecting wristbands and adding them to the series
// 6. Verifying the assignment worked
