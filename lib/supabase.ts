import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export function createServerClient() {
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });
}

export function createBrowserClient() {
  return createClient(supabaseUrl, supabaseAnonKey);
}

export type QuizRow = {
  id: string;
  title: string;
  description: string | null;
  spec_json: Record<string, unknown>;
  share_token: string;
  is_published: boolean;
  created_at: string;
};

export type QuizSessionRow = {
  id: string;
  quiz_id: string;
  started_at: string;
  completed_at: string | null;
  is_complete: boolean;
  final_score: number | null;
  final_band_id: string | null;
  answers_json: Record<string, unknown>;
  user_agent: string | null;
  created_at: string;
};
