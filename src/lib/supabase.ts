import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

// Validate environment variables
const missingVars: string[] = [];
if (!supabaseUrl) missingVars.push('VITE_SUPABASE_URL');
if (!supabaseAnonKey) missingVars.push('VITE_SUPABASE_PUBLISHABLE_KEY');
if (!turnstileSiteKey) missingVars.push('VITE_TURNSTILE_SITE_KEY');

if (missingVars.length > 0) {
  console.warn(
    `[Configuration] Missing environment variables: ${missingVars.join(', ')}. ` +
    'Copy .env.example to .env and fill in your values.'
  );
}

// Export the site key for Turnstile
export const TURNSTILE_SITE_KEY = turnstileSiteKey || '';

// Toggle Turnstile CAPTCHA: set to true to enable, false to disable
// You can also control this using VITE_ENABLE_TURNSTILE in .env if desired
export const ENABLE_TURNSTILE = false;

// Initialize the Supabase client
export const supabase = createClient(
  supabaseUrl || 'https://placeholder-project.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);
