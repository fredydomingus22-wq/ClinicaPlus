import { createClient } from '@supabase/supabase-js';
import { config } from './config';

/**
 * Cliente Supabase para operações administrativas (Service Role).
 * Usado para gerar Signed URLs e gerir a storage de laudos.
 */
export const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);
