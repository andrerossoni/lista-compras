import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error('Faltam VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY no .env.local')
}

export const supabase = createClient(url, anonKey)

export type ShoppingItem = {
  id: string
  text: string
  completed: boolean
  position: number
  completed_at: string | null
  created_at: string
}
