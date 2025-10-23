import { useState } from 'react';
import { ChevronLeft, ChevronRight, Edit, Clock, Calendar as CalendarIcon } from 'lucide-react';
import { EventSeries } from '../../services/eventSeriesService';

interface SeriesCalendarViewProps {
  series: EventSeries[];
  eventName: string;
  onEditSeries: (series: EventSeries) => void;
  showCompletedEvents: boolean;
}

type ViewMode = 'day' | 'week' | '4days' | 'month' | 'year';

export default function SeriesCalendarView({ 
  series, 
  eventName, 
  onEditSeries,
  showCompletedEvents 
}: SeriesCalendarViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Filter series based on showCompletedEvents
  const filteredSeries = showCompletedEvents 
    ? series 
    : series.filter(s => new Date(s.end_date) >= new Date());

  // Navigation functions
  const navigatePrevious = () => {
    const newDate = new Date(currentDate);
    switch (viewMode) {
      case 'day':
        newDate.setDate(newDate.getDate() - 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() - 7);
        break;
      case '4days':
        newDate.setDate(newDate.getDate() - 4);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() - 1);
        break;
      case 'year':
        newDate.setFullYear(newDate.getFullYear() - 1);
        break;
    }
    setCurrentDate(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    switch (viewMode) {
      case 'day':
        newDate.setDate(newDate.getDate() + 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + 7);
        break;
      case '4days':
        newDate.setDate(newDate.getDate() + 4);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + 1);
        break;
      case 'year':
        newDate.setFullYear(newDate.getFullYear() + 1);
        break;
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get date range title
  const getDateRangeTitle = () => {
    const options: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' };
    
    switch (viewMode) {
      case 'day':
        return currentDate.toLocaleDateString('en-US', { 
          weekday: 'long', 
          month: 'long', 
          day: 'numeric', 
          year: 'numeric' 
        });
      case 'week':
      case '4days':
        const days = viewMode === 'week' ? 7 : 4;
        const startOfWeek = getStartOfWeek(currentDate);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + days - 1);
        
        if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
          return `${startOfWeek.toLocaleDateString('en-US', { month: 'long' })} ${startOfWeek.getDate()} - ${endOfWeek.getDate()}, ${startOfWeek.getFullYear()}`;
        } else {
          return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${startOfWeek.getFullYear()}`;
        }
      case 'month':
        return currentDate.toLocaleDateString('en-US', options);
      case 'year':
        return currentDate.getFullYear().toString();
    }
  };

  const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          {/* Left: Today button and navigation */}
          <div className="flex items-center space-x-4">
            <button
              onClick={goToToday}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Today
            </button>
            <div className="flex items-center space-x-2">
              <button
                onClick={navigatePrevious}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={navigateNext}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <ChevronRight size={20} />
              </button>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              {getDateRangeTitle()}
            </h2>
          </div>

          {/* Right: View mode selector */}
          <div className="relative">
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as ViewMode)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer appearance-none pr-10"
            >
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="4days">4 days</option>
              <option value="month">Month</option>
              <option value="year">Year</option>
            </select>
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Event name subtitle */}
        <p className="text-sm text-gray-600">{eventName}</p>
      </div>

      {/* Calendar Content */}
      <div className="p-4">
        {viewMode === 'month' && (
          <MonthView 
            currentDate={currentDate} 
            series={filteredSeries} 
            onEditSeries={onEditSeries} 
          />
        )}
        {viewMode === 'year' && (
          <YearView 
            currentDate={currentDate} 
            series={filteredSeries} 
            onEditSeries={onEditSeries} 
          />
        )}
        {(viewMode === 'day' || viewMode === 'week' || viewMode === '4days') && (
          <TimeGridView 
            currentDate={currentDate} 
            viewMode={viewMode} 
            series={filteredSeries} 
            onEditSeries={onEditSeries} 
          />
        )}
      </div>
    </div>
  );
}

// Month View Component
function MonthView({ currentDate, series, onEditSeries }: { 
  currentDate: Date; 
  series: EventSeries[]; 
  onEditSeries: (s: EventSeries) => void;
}) {
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();
  
  const calendarDays = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  // Group series by date
  const seriesByDate: { [key: string]: EventSeries[] } = {};
  series.forEach(s => {
    const startDate = new Date(s.start_date);
    const endDate = new Date(s.end_date);
    
    const currentDateIter = new Date(startDate);
    while (currentDateIter <= endDate) {
      if (currentDateIter.getMonth() === currentDate.getMonth() && 
          currentDateIter.getFullYear() === currentDate.getFullYear()) {
        const dateKey = currentDateIter.getDate().toString();
        if (!seriesByDate[dateKey]) {
          seriesByDate[dateKey] = [];
        }
        if (!seriesByDate[dateKey].find(existing => existing.id === s.id)) {
          seriesByDate[dateKey].push(s);
        }
      }
      currentDateIter.setDate(currentDateIter.getDate() + 1);
    }
  });

  const now = new Date();

  return (
    <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200">
      {/* Day headers */}
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
        <div key={day} className="bg-gray-50 text-center text-xs font-semibold text-gray-600 py-2">
          {day}
        </div>
      ))}
      
      {/* Calendar days */}
      {calendarDays.map((day, index) => {
        if (day === null) {
          return <div key={`empty-${index}`} className="bg-white min-h-[120px]" />;
        }
        
        const dateSeriesList = seriesByDate[day.toString()] || [];
        const isToday = now.getDate() === day && 
                       now.getMonth() === currentDate.getMonth() &&
                       now.getFullYear() === currentDate.getFullYear();
        
        return (
          <div
            key={day}
            className={`bg-white min-h-[120px] p-2 ${isToday ? 'bg-blue-50' : ''}`}
          >
            <div className={`text-sm font-medium mb-2 ${
              isToday ? 'text-blue-600' : 'text-gray-700'
            }`}>
              {day}
            </div>
            <div className="space-y-1">
              {dateSeriesList.slice(0, 3).map(s => {
                const startDate = new Date(s.start_date);
                const endDate = new Date(s.end_date);
                const isOngoing = startDate <= now && endDate >= now;
                const isPast = endDate < now;
                
                return (
                  <div
                    key={s.id}
                    onClick={() => onEditSeries(s)}
                    className={`text-xs p-1 rounded cursor-pointer truncate ${
                      isPast 
                        ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        : isOngoing 
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                    }`}
                    title={s.name}
                  >
                    • {s.name}
                  </div>
                );
              })}
              {dateSeriesList.length > 3 && (
                <div className="text-xs text-gray-500 pl-1">
                  +{dateSeriesList.length - 3} more
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Year View Component
function YearView({ currentDate, series, onEditSeries }: { 
  currentDate: Date; 
  series: EventSeries[]; 
  onEditSeries: (s: EventSeries) => void;
}) {
  const year = currentDate.getFullYear();
  const months = Array.from({ length: 12 }, (_, i) => i);

  return (
    <div className="grid grid-cols-3 gap-6">
      {months.map(month => {
        const monthDate = new Date(year, month, 1);
        const monthSeries = series.filter(s => {
          const start = new Date(s.start_date);
          const end = new Date(s.end_date);
          return (start.getFullYear() === year && start.getMonth() === month) ||
                 (end.getFullYear() === year && end.getMonth() === month) ||
                 (start <= monthDate && end >= new Date(year, month + 1, 0));
        });

        return (
          <div key={month} className="border border-gray-200 rounded-lg p-3">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">
              {monthDate.toLocaleDateString('en-US', { month: 'long' })}
            </h4>
            <MiniMonthCalendar 
              monthDate={monthDate} 
              series={monthSeries} 
              onEditSeries={onEditSeries}
            />
          </div>
        );
      })}
    </div>
  );
}

// Mini Month Calendar for Year View
function MiniMonthCalendar({ monthDate, series, onEditSeries }: {
  monthDate: Date;
  series: EventSeries[];
  onEditSeries: (s: EventSeries) => void;
}) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();
  
  const calendarDays = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  // Check which days have series
  const daysWithSeries = new Set<number>();
  series.forEach(s => {
    const startDate = new Date(s.start_date);
    const endDate = new Date(s.end_date);
    
    const currentDateIter = new Date(startDate);
    while (currentDateIter <= endDate) {
      if (currentDateIter.getMonth() === monthDate.getMonth() && 
          currentDateIter.getFullYear() === monthDate.getFullYear()) {
        daysWithSeries.add(currentDateIter.getDate());
      }
      currentDateIter.setDate(currentDateIter.getDate() + 1);
    }
  });

  return (
    <div className="grid grid-cols-7 gap-1">
      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
        <div key={i} className="text-center text-xs text-gray-500">
          {day}
        </div>
      ))}
      {calendarDays.map((day, index) => {
        if (day === null) {
          return <div key={`empty-${index}`} className="h-6" />;
        }
        
        const hasSeries = daysWithSeries.has(day);
        
        return (
          <div
            key={day}
            className={`h-6 flex items-center justify-center text-xs rounded ${
              hasSeries 
                ? 'bg-blue-100 text-blue-800 font-medium' 
                : 'text-gray-600'
            }`}
          >
            {day}
          </div>
        );
      })}
    </div>
  );
}

// Time Grid View (Day, Week, 4 Days)
function TimeGridView({ currentDate, viewMode, series, onEditSeries }: {
  currentDate: Date;
  viewMode: 'day' | 'week' | '4days';
  series: EventSeries[];
  onEditSeries: (s: EventSeries) => void;
}) {
  const days = viewMode === 'day' ? 1 : viewMode === 'week' ? 7 : 4;
  const startDate = viewMode === 'day' 
    ? new Date(currentDate) 
    : getStartOfWeek(currentDate);
  
  const dateColumns = Array.from({ length: days }, (_, i) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    return date;
  });

  // Time slots (24 hours)
  const hours = Array.from({ length: 24 }, (_, i) => i);
  
  const now = new Date();

  // Group series by day
  const seriesByDay: { [key: string]: EventSeries[] } = {};
  dateColumns.forEach(date => {
    const dateKey = date.toDateString();
    seriesByDay[dateKey] = series.filter(s => {
      const startDate = new Date(s.start_date);
      const endDate = new Date(s.end_date);
      
      // Check if series overlaps with this day
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      
      return (startDate <= dayEnd && endDate >= dayStart);
    });
  });

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[800px]">
        {/* Day headers */}
        <div className="grid gap-px bg-gray-200 border-b border-gray-200" style={{ gridTemplateColumns: `60px repeat(${days}, 1fr)` }}>
          <div className="bg-white"></div>
          {dateColumns.map(date => {
            const isToday = date.toDateString() === now.toDateString();
            return (
              <div key={date.toDateString()} className={`bg-white text-center py-3 ${isToday ? 'bg-blue-50' : ''}`}>
                <div className="text-xs text-gray-600">
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className={`text-2xl font-semibold ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                  {date.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Time grid */}
        <div className="relative">
          {hours.map(hour => (
            <div key={hour} className="grid gap-px bg-gray-200 border-b border-gray-200" style={{ gridTemplateColumns: `60px repeat(${days}, 1fr)`, minHeight: '50px' }}>
              <div className="bg-white text-right pr-2 py-1 text-xs text-gray-500 h-full">
                {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
              </div>
              {dateColumns.map(date => {
                const dateKey = date.toDateString();
                const daySeries = seriesByDay[dateKey] || [];
                
                // Filter series that are active during this hour
                const hourSeries = daySeries.filter(s => {
                  const startDate = new Date(s.start_date);
                  const endDate = new Date(s.end_date);
                  
                  const hourStart = new Date(date);
                  hourStart.setHours(hour, 0, 0, 0);
                  const hourEnd = new Date(date);
                  hourEnd.setHours(hour, 59, 59, 999);
                  
                  return (startDate <= hourEnd && endDate >= hourStart);
                });

                return (
                  <div key={`${dateKey}-${hour}`} className="bg-white p-0.5 relative overflow-hidden h-full">
                    <div className="space-y-0.5 h-full flex flex-col justify-start">
                      {hourSeries.map(s => {
                        const startDate = new Date(s.start_date);
                        const endDate = new Date(s.end_date);
                        const isOngoing = startDate <= now && endDate >= now;
                        const isPast = endDate < now;
                        
                        // Only show if this is the starting hour
                        const seriesHour = startDate.getHours();
                        if (seriesHour === hour && startDate.toDateString() === date.toDateString()) {
                          return (
                            <div
                              key={s.id}
                              onClick={() => onEditSeries(s)}
                              className={`text-[11px] p-1 rounded cursor-pointer border-l-2 ${
                                isPast
                                  ? 'bg-gray-100 text-gray-700 border-gray-400'
                                  : isOngoing 
                                    ? 'bg-green-100 text-green-800 border-green-500'
                                    : 'bg-blue-100 text-blue-800 border-blue-500'
                              }`}
                              title={s.name}
                            >
                              <div className="font-medium truncate leading-tight">{s.name}</div>
                              <div className="text-[9px] opacity-75 flex items-center gap-0.5">
                                <Clock size={8} />
                                {startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getStartOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
}
