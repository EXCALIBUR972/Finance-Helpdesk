import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Usamos la Service Role Key para el webhook para saltar RLS 
// y poder crear clientes/casos sin sesión de usuario.
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
