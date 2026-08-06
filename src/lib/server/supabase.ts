import { createClient } from "@supabase/supabase-js";
import {
	PUBLIC_SUPABASE_URL,
} from "$env/static/public";
import { env } from "$env/dynamic/private";

const supabaseUrl = PUBLIC_SUPABASE_URL || "";
const rawServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY || "";
const serviceRoleKey = rawServiceKey.replace(/^["']|["']$/g, "").trim();

export const isServerSupabaseAdminConfigured = Boolean(supabaseUrl && serviceRoleKey);

export const supabaseAdmin = isServerSupabaseAdminConfigured
	? createClient(supabaseUrl, serviceRoleKey, {
			auth: {
				persistSession: false,
				autoRefreshToken: false,
				detectSessionInUrl: false,
			},
	  })
	: null;
