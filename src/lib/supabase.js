import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qsykmhtnhpbzbkxyiwji.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzeWttaHRuaHBiemJreHlpd2ppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2Mzk1MTYsImV4cCI6MjEwNDIxNTUxNn0.imjqnIsFkQhY4hA_1ErhLx7ygrVxm7N0FqL5Ef0JwBI'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
