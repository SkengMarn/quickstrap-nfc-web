# Event Series Use Cases - All Event Types

The Event Series System is a **general-purpose solution** that works for ANY type of event. Here are real-world examples across different industries:

---

## 🎵 Music & Entertainment

### 1. Multi-Day Music Festival

```typescript
const festival = await enhancedSeriesService.createSeries({
  main_event_id: 'summer-fest-2024',
  name: 'Day 1 - Electronic',
  series_type: 'standard',
  start_date: '2024-07-01T18:00:00Z',
  end_date: '2024-07-02T02:00:00Z',
  location: 'Main Stage',
  capacity: 10000,
});

// Assign 3-day pass holders to all days
await enhancedSeriesService.bulkAssignByCategory({
  series_id: day1.id,
  categories: ['3-Day Pass', 'VIP All-Access'],
});

// Assign Friday-only tickets just to Day 1
await enhancedSeriesService.bulkAssignByCategory({
  series_id: day1.id,
  categories: ['Friday Only'],
});
```

### 2. Theater Production (Multiple Shows)

```typescript
// Matinee Show
await enhancedSeriesService.createSeries({
  main_event_id: 'broadway-show',
  name: 'Matinee - 2:00 PM',
  series_type: 'standard',
  start_date: '2024-08-15T14:00:00Z',
  end_date: '2024-08-15T16:30:00Z',
  capacity: 500,
});

// Evening Show
await enhancedSeriesService.createSeries({
  main_event_id: 'broadway-show',
  name: 'Evening - 8:00 PM',
  series_type: 'standard',
  start_date: '2024-08-15T20:00:00Z',
  end_date: '2024-08-15T22:30:00Z',
  capacity: 500,
});
```

### 3. Comedy Club (Weekly Shows)

```typescript
// Create recurring weekly show
const weeklyComedy = await enhancedSeriesService.createSeries({
  main_event_id: 'comedy-club-season',
  name: 'Thursday Night Comedy',
  series_type: 'standard',
  start_date: '2024-09-05T20:00:00Z',
  end_date: '2024-09-05T22:00:00Z',
  is_recurring: true,
  recurrence_pattern: {
    type: 'weekly',
    interval: 1,
    days_of_week: [4], // Thursday
    end_after_occurrences: 20,
  },
});

// Generate 20 weeks of shows
await enhancedSeriesService.createRecurringInstances({
  parent_series_id: weeklyComedy.data.id,
  occurrences: 20,
});
```

---

## 🎨 Art & Culture

### 1. Art Gallery Exhibition

```typescript
// Opening Night (VIP Only)
await enhancedSeriesService.createSeries({
  main_event_id: 'modern-art-expo',
  name: 'Opening Night Gala',
  series_type: 'custom',
  start_date: '2024-06-01T18:00:00Z',
  end_date: '2024-06-01T22:00:00Z',
  requires_separate_ticket: true,
  capacity: 200,
});

// Public Weekend
await enhancedSeriesService.createSeries({
  main_event_id: 'modern-art-expo',
  name: 'Weekend Public Viewing',
  series_type: 'standard',
  start_date: '2024-06-02T10:00:00Z',
  end_date: '2024-06-04T18:00:00Z',
  capacity: 5000,
});

// Set category limits
await enhancedSeriesService.setSeriesCategoryLimits(openingNight.id, [
  { category: 'VIP', max_wristbands: 150, price: 250 },
  { category: 'Patron', max_wristbands: 50, price: 500 },
]);
```

### 2. Museum Special Exhibition

```typescript
// Morning Sessions (Guided Tours)
await enhancedSeriesService.createSeries({
  main_event_id: 'egyptian-artifacts',
  name: 'Morning Guided Tour',
  series_type: 'standard',
  start_date: '2024-07-15T09:00:00Z',
  end_date: '2024-07-15T12:00:00Z',
  capacity: 50,
  requires_separate_ticket: true,
});

// Afternoon Sessions (Self-Guided)
await enhancedSeriesService.createSeries({
  main_event_id: 'egyptian-artifacts',
  name: 'Afternoon Open Viewing',
  series_type: 'standard',
  start_date: '2024-07-15T13:00:00Z',
  end_date: '2024-07-15T18:00:00Z',
  capacity: 200,
});
```

---

## 🍴 Food & Beverage

### 1. Food Festival (Multiple Meal Services)

```typescript
// Lunch Service
await enhancedSeriesService.createSeries({
  main_event_id: 'taste-of-chicago',
  name: 'Lunch Service',
  series_type: 'standard',
  start_date: '2024-08-20T11:00:00Z',
  end_date: '2024-08-20T15:00:00Z',
  capacity: 3000,
});

// Dinner Service
await enhancedSeriesService.createSeries({
  main_event_id: 'taste-of-chicago',
  name: 'Dinner Service',
  series_type: 'standard',
  start_date: '2024-08-20T17:00:00Z',
  end_date: '2024-08-20T22:00:00Z',
  capacity: 5000,
});

// VIP Tasting Experience
await enhancedSeriesService.createSeries({
  main_event_id: 'taste-of-chicago',
  name: 'VIP Chef Tasting',
  series_type: 'custom',
  start_date: '2024-08-20T18:00:00Z',
  end_date: '2024-08-20T20:00:00Z',
  capacity: 100,
  requires_separate_ticket: true,
});
```

### 2. Wine Tasting Event

```typescript
// Beginner Session
await enhancedSeriesService.createSeries({
  main_event_id: 'wine-masters',
  name: 'Beginner Wine Tasting',
  series_type: 'standard',
  start_date: '2024-09-10T14:00:00Z',
  end_date: '2024-09-10T16:00:00Z',
  capacity: 50,
});

// Advanced Session
await enhancedSeriesService.createSeries({
  main_event_id: 'wine-masters',
  name: 'Advanced Sommelier Session',
  series_type: 'standard',
  start_date: '2024-09-10T18:00:00Z',
  end_date: '2024-09-10T21:00:00Z',
  capacity: 30,
});
```

---

## 🏢 Corporate & Business

### 1. Multi-Day Conference

```typescript
// Day 1 - Workshops
await enhancedSeriesService.createSeries({
  main_event_id: 'tech-summit-2024',
  name: 'Day 1 - Workshops',
  series_type: 'standard',
  start_date: '2024-10-15T09:00:00Z',
  end_date: '2024-10-15T17:00:00Z',
  location: 'Convention Center - Hall A',
});

// Day 2 - Keynotes
await enhancedSeriesService.createSeries({
  main_event_id: 'tech-summit-2024',
  name: 'Day 2 - Keynote Speakers',
  series_type: 'standard',
  start_date: '2024-10-16T09:00:00Z',
  end_date: '2024-10-16T17:00:00Z',
  location: 'Main Auditorium',
});

// Day 3 - Networking
await enhancedSeriesService.createSeries({
  main_event_id: 'tech-summit-2024',
  name: 'Day 3 - Networking & Expo',
  series_type: 'standard',
  start_date: '2024-10-17T10:00:00Z',
  end_date: '2024-10-17T16:00:00Z',
  location: 'Expo Hall',
});
```

### 2. Training Program (Multi-Session)

```typescript
// Session 1 - Basics
await enhancedSeriesService.createSeries({
  main_event_id: 'leadership-training',
  name: 'Session 1 - Leadership Fundamentals',
  series_type: 'standard',
  sequence_number: 1,
  start_date: '2024-11-05T09:00:00Z',
  end_date: '2024-11-05T12:00:00Z',
  capacity: 100,
});

// Session 2 - Advanced
await enhancedSeriesService.createSeries({
  main_event_id: 'leadership-training',
  name: 'Session 2 - Strategic Thinking',
  series_type: 'standard',
  sequence_number: 2,
  start_date: '2024-11-06T09:00:00Z',
  end_date: '2024-11-06T12:00:00Z',
  capacity: 100,
});

// Session 3 - Practical Application
await enhancedSeriesService.createSeries({
  main_event_id: 'leadership-training',
  name: 'Session 3 - Case Studies',
  series_type: 'standard',
  sequence_number: 3,
  start_date: '2024-11-07T09:00:00Z',
  end_date: '2024-11-07T12:00:00Z',
  capacity: 100,
});
```

### 3. Trade Show (Different Halls/Zones)

```typescript
// Tech Zone
await enhancedSeriesService.createSeries({
  main_event_id: 'global-trade-expo',
  name: 'Technology Zone',
  series_type: 'standard',
  start_date: '2024-12-01T09:00:00Z',
  end_date: '2024-12-03T18:00:00Z',
  location: 'Hall A',
  capacity: 5000,
});

// Fashion Zone
await enhancedSeriesService.createSeries({
  main_event_id: 'global-trade-expo',
  name: 'Fashion Zone',
  series_type: 'standard',
  start_date: '2024-12-01T09:00:00Z',
  end_date: '2024-12-03T18:00:00Z',
  location: 'Hall B',
  capacity: 3000,
});
```

---

## 💒 Private Events

### 1. Wedding (Multi-Event)

```typescript
// Rehearsal Dinner
await enhancedSeriesService.createSeries({
  main_event_id: 'smith-johnson-wedding',
  name: 'Rehearsal Dinner',
  series_type: 'standard',
  start_date: '2024-06-14T18:00:00Z',
  end_date: '2024-06-14T22:00:00Z',
  location: 'Restaurant Venue',
  capacity: 50,
});

// Wedding Ceremony
await enhancedSeriesService.createSeries({
  main_event_id: 'smith-johnson-wedding',
  name: 'Wedding Ceremony',
  series_type: 'standard',
  start_date: '2024-06-15T15:00:00Z',
  end_date: '2024-06-15T16:00:00Z',
  location: 'Church',
  capacity: 200,
});

// Reception
await enhancedSeriesService.createSeries({
  main_event_id: 'smith-johnson-wedding',
  name: 'Reception',
  series_type: 'standard',
  start_date: '2024-06-15T18:00:00Z',
  end_date: '2024-06-16T00:00:00Z',
  location: 'Banquet Hall',
  capacity: 200,
});

// Brunch (Next Day)
await enhancedSeriesService.createSeries({
  main_event_id: 'smith-johnson-wedding',
  name: 'Day-After Brunch',
  series_type: 'standard',
  start_date: '2024-06-16T11:00:00Z',
  end_date: '2024-06-16T14:00:00Z',
  location: 'Hotel Restaurant',
  capacity: 100,
});
```

### 2. Birthday Party (Multiple Activities)

```typescript
// Pool Party
await enhancedSeriesService.createSeries({
  main_event_id: '50th-birthday-bash',
  name: 'Afternoon Pool Party',
  series_type: 'standard',
  start_date: '2024-07-20T14:00:00Z',
  end_date: '2024-07-20T17:00:00Z',
  location: 'Backyard Pool',
});

// Dinner
await enhancedSeriesService.createSeries({
  main_event_id: '50th-birthday-bash',
  name: 'Formal Dinner',
  series_type: 'standard',
  start_date: '2024-07-20T18:00:00Z',
  end_date: '2024-07-20T21:00:00Z',
  location: 'Main House',
});

// After Party
await enhancedSeriesService.createSeries({
  main_event_id: '50th-birthday-bash',
  name: 'After Party',
  series_type: 'standard',
  start_date: '2024-07-20T21:00:00Z',
  end_date: '2024-07-21T02:00:00Z',
  location: 'Lounge Area',
});
```

---

## 🏃 Fitness & Wellness

### 1. Yoga Retreat (Multiple Sessions)

```typescript
// Morning Meditation
await enhancedSeriesService.createSeries({
  main_event_id: 'wellness-retreat',
  name: 'Morning Meditation',
  series_type: 'standard',
  start_date: '2024-08-10T06:00:00Z',
  end_date: '2024-08-10T07:00:00Z',
  capacity: 50,
});

// Yoga Practice
await enhancedSeriesService.createSeries({
  main_event_id: 'wellness-retreat',
  name: 'Yoga Session',
  series_type: 'standard',
  start_date: '2024-08-10T08:00:00Z',
  end_date: '2024-08-10T10:00:00Z',
  capacity: 50,
});

// Workshop
await enhancedSeriesService.createSeries({
  main_event_id: 'wellness-retreat',
  name: 'Wellness Workshop',
  series_type: 'standard',
  start_date: '2024-08-10T15:00:00Z',
  end_date: '2024-08-10T17:00:00Z',
  capacity: 30,
});
```

### 2. Marathon (Different Races)

```typescript
// 5K Fun Run
await enhancedSeriesService.createSeries({
  main_event_id: 'city-marathon-2024',
  name: '5K Fun Run',
  series_type: 'standard',
  start_date: '2024-10-01T07:00:00Z',
  end_date: '2024-10-01T09:00:00Z',
  capacity: 1000,
});

// 10K Race
await enhancedSeriesService.createSeries({
  main_event_id: 'city-marathon-2024',
  name: '10K Race',
  series_type: 'standard',
  start_date: '2024-10-01T08:00:00Z',
  end_date: '2024-10-01T11:00:00Z',
  capacity: 2000,
});

// Full Marathon
await enhancedSeriesService.createSeries({
  main_event_id: 'city-marathon-2024',
  name: 'Full Marathon',
  series_type: 'standard',
  start_date: '2024-10-01T09:00:00Z',
  end_date: '2024-10-01T15:00:00Z',
  capacity: 5000,
});
```

---

## 🎓 Education

### 1. University Lecture Series

```typescript
// Create recurring weekly lectures
const lectureSeries = await enhancedSeriesService.createSeries({
  main_event_id: 'cs101-fall-2024',
  name: 'Weekly Lecture',
  series_type: 'standard',
  start_date: '2024-09-03T14:00:00Z',
  end_date: '2024-09-03T15:30:00Z',
  location: 'Room 201',
  capacity: 100,
  is_recurring: true,
  recurrence_pattern: {
    type: 'weekly',
    interval: 1,
    days_of_week: [2, 4], // Tuesday and Thursday
    end_after_occurrences: 28, // 14 weeks × 2 days
  },
});

// Generate semester of lectures
await enhancedSeriesService.createRecurringInstances({
  parent_series_id: lectureSeries.data.id,
  occurrences: 28,
});
```

### 2. Exam Sessions

```typescript
// Midterm Exam
await enhancedSeriesService.createSeries({
  main_event_id: 'cs101-fall-2024',
  name: 'Midterm Exam',
  series_type: 'standard',
  start_date: '2024-10-15T10:00:00Z',
  end_date: '2024-10-15T12:00:00Z',
  location: 'Auditorium',
  capacity: 200,
  requires_separate_ticket: true, // Requires registration
});

// Final Exam
await enhancedSeriesService.createSeries({
  main_event_id: 'cs101-fall-2024',
  name: 'Final Exam',
  series_type: 'standard',
  start_date: '2024-12-10T14:00:00Z',
  end_date: '2024-12-10T17:00:00Z',
  location: 'Auditorium',
  capacity: 200,
  requires_separate_ticket: true,
});
```

---

## 🎮 Gaming & Esports

### 1. Gaming Tournament (NOT sports!)

```typescript
// Qualifier Rounds
await enhancedSeriesService.createSeries({
  main_event_id: 'esports-championship',
  name: 'Qualifier Round',
  series_type: 'standard',
  start_date: '2024-11-01T10:00:00Z',
  end_date: '2024-11-01T18:00:00Z',
  capacity: 256, // 256 players
});

// Semi-Finals
await enhancedSeriesService.createSeries({
  main_event_id: 'esports-championship',
  name: 'Semi-Finals',
  series_type: 'knockout',
  start_date: '2024-11-02T12:00:00Z',
  end_date: '2024-11-02T16:00:00Z',
  capacity: 8,
});

// Grand Finals
await enhancedSeriesService.createSeries({
  main_event_id: 'esports-championship',
  name: 'Grand Finals',
  series_type: 'knockout',
  start_date: '2024-11-03T15:00:00Z',
  end_date: '2024-11-03T18:00:00Z',
  capacity: 2,
});
```

---

## 🎪 Community Events

### 1. Street Fair (Different Zones)

```typescript
// Food Zone
await enhancedSeriesService.createSeries({
  main_event_id: 'summer-street-fair',
  name: 'Food Vendors Zone',
  series_type: 'standard',
  start_date: '2024-08-15T10:00:00Z',
  end_date: '2024-08-15T22:00:00Z',
  location: 'Main Street Block 1-3',
});

// Arts & Crafts Zone
await enhancedSeriesService.createSeries({
  main_event_id: 'summer-street-fair',
  name: 'Arts & Crafts Zone',
  series_type: 'standard',
  start_date: '2024-08-15T10:00:00Z',
  end_date: '2024-08-15T22:00:00Z',
  location: 'Main Street Block 4-6',
});

// Kids Zone
await enhancedSeriesService.createSeries({
  main_event_id: 'summer-street-fair',
  name: 'Kids Activities Zone',
  series_type: 'standard',
  start_date: '2024-08-15T10:00:00Z',
  end_date: '2024-08-15T18:00:00Z',
  location: 'Park Area',
  capacity: 500,
});
```

---

## ✅ Summary

The Event Series System works for **ANY** event type:
- Music & Entertainment
- Art & Culture
- Food & Beverage
- Corporate & Business
- Private Events
- Fitness & Wellness
- Education
- Gaming
- Community Events
- And literally any other event type you can imagine!

**The system is completely industry-agnostic and general-purpose!** 🎉
