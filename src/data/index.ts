import { isSupabaseConfigured } from '../lib/supabase'
import { DemoRepository } from './demoRepository'
import type { KskRepository } from './kskRepository'
import { SupabaseRepository } from './supabaseRepository'

export const kskRepository: KskRepository = isSupabaseConfigured
  ? new SupabaseRepository()
  : new DemoRepository()

