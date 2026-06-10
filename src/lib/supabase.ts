import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.')
}

// Using untyped client to avoid 'never' inference issues with custom Database type.
// Supabase types can be regenerated with: npx supabase gen types typescript --project-id YOUR_PROJECT_ID
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
