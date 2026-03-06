import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Faltan variables de entorno de Supabase. Por favor, revisa el archivo .env.example y asegúrate de tener un archivo .env configurado.');
}

// Ensure defaults to prevent crashes if env variables are missing during dev/startup
export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder'
);
