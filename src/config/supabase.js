import { createClient } from "@supabase/supabase-js";
import { ENV } from "./env.js";

// No changes needed, already using environment variables
export const supabase = createClient(ENV.supabaseUrl, ENV.supabaseKey);
