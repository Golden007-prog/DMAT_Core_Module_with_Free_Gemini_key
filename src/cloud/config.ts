/** Supabase project connection. The publishable key is safe to ship in the
 *  client (RLS is the security boundary). An empty key disables every cloud
 *  feature and the app stays fully local-first (R7). */
export const SUPABASE_URL = 'https://qnwkcqjkdyvafhqtbkhx.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_KEY ?? 'sb_publishable_1ANJcT92MXFRL01folizew_Pc_hQqn4';
