import { createClient, SupabaseClient } from "@supabase/supabase-js"
import dotenv from "dotenv"

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// ✅ VALIDATION AVANT TOUT
if (!supabaseUrl) {
  throw new Error("SUPABASE_URL manquante dans les variables d’environnement")
}

if (!supabaseServiceKey) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY manquante dans les variables d’environnement"
  )
}

// ✅ MAINTENANT TypeScript SAIT que ce sont des strings
export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseServiceKey
)