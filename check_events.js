import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pmrxyisasfaimumuobvu.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtcnh5aXNhc2ZhaW11bXVvYnZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyODQ2ODMsImV4cCI6MjA2ODg2MDY4M30.rVsKq08Ynw82RkCntxWFXOTgP8T0cGyhJvqfrnOH4YQ'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkEvents() {
  console.log('Checking events in database...\n')
  
  const { data, error, count } = await supabase
    .from('events')
    .select('*', { count: 'exact' })
  
  if (error) {
    console.error('Error fetching events:', error)
    return
  }
  
  console.log(`Total events found: ${count}`)
  
  if (data && data.length > 0) {
    console.log('\nEvents:')
    data.forEach((event, index) => {
      console.log(`\n${index + 1}. ${event.name}`)
      console.log(`   ID: ${event.id}`)
      console.log(`   Status: ${event.lifecycle_status}`)
      console.log(`   Active: ${event.is_active}`)
      console.log(`   URL: http://localhost:3000/events/${event.id}`)
    })
  } else {
    console.log('\n⚠️  No events found in database!')
    console.log('You need to create an event first.')
    console.log('Go to: http://localhost:3000/events/new')
  }
}

checkEvents()
