import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pmrxyisasfaimumuobvu.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtcnh5aXNhc2ZhaW11bXVvYnZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyODQ2ODMsImV4cCI6MjA2ODg2MDY4M30.rVsKq08Ynw82RkCntxWFXOTgP8T0cGyhJvqfrnOH4YQ'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkSchema() {
  console.log('Checking event_series table schema...\n')
  
  // Try to get one row to see the structure
  const { data, error } = await supabase
    .from('event_series')
    .select('*')
    .limit(1)
  
  if (error) {
    console.error('Error:', error.message)
    console.log('\nTrying to check if table exists...')
    
    // Try a simple count query
    const { count, error: countError } = await supabase
      .from('event_series')
      .select('*', { count: 'exact', head: true })
    
    if (countError) {
      console.error('Table might not exist:', countError.message)
    } else {
      console.log(`Table exists with ${count} rows`)
    }
  } else {
    if (data && data.length > 0) {
      console.log('Table structure (first row):')
      console.log(JSON.stringify(data[0], null, 2))
    } else {
      console.log('Table exists but is empty')
      console.log('Expected columns: id, name, parent_event_id or main_event_id, lifecycle_status, sequence_number, etc.')
    }
  }
}

checkSchema()
