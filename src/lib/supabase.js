import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hcbgxmrhjvluzxnactbf.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjYmd4bXJoanZsdXp4bmFjdGJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2ODQ1ODIsImV4cCI6MjA5NjI2MDU4Mn0.Nrz6g3kUAk5twyPQZBADxIHg6rc9Y-OZHM_37p6whvg'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
