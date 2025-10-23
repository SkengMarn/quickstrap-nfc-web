import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pmrxyisasfaimumuobvu.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtcnh5aXNhc2ZhaW11bXVvYnZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyODQ2ODMsImV4cCI6MjA2ODg2MDY4M30.rVsKq08Ynw82RkCntxWFXOTgP8T0cGyhJvqfrnOH4YQ'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkSeries() {
  console.log('Checking event_series in database...\n')
  
  const { data, error, count } = await supabase
    .from('event_series')
    .select('*', { count: 'exact' })
  
  if (error) {
    console.error('Error fetching series:', error)
    return
  }
  
  console.log(`Total series found: ${count}`)
  
  if (data && data.length > 0) {
    console.log('\nSeries:')
    data.forEach((series, index) => {
      console.log(`\n${index + 1}. ${series.name}`)
      console.log(`   Series ID: ${series.id}`)
      console.log(`   Parent Event ID: ${series.parent_event_id}`)
      console.log(`   Status: ${series.lifecycle_status}`)
      console.log(`   Sequence: ${series.sequence_number}`)
      console.log(`   URL: http://localhost:3000/events/${series.id}`)
    })
  } else {
    console.log('\n⚠️  No series found in database!')
  }
}

checkSeries()
