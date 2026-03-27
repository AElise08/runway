/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

// Por padrão, use as variáveis de ambiente ou defina valores vazios
// Lembre-se de adicionar VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
