import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
// Supabase new format uses PUBLISHABLE_DEFAULT_KEY (replaces old anon key)
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️  Supabase env vars not set. Check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseKey)
