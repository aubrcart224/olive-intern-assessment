CREATE TABLE IF NOT EXISTS public.quiz_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  is_complete BOOLEAN DEFAULT false,
  final_score INTEGER,
  final_band_id TEXT,
  answers_json JSONB DEFAULT '{}',
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quiz_sessions_quiz_id ON public.quiz_sessions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_created_at ON public.quiz_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_is_complete ON public.quiz_sessions(is_complete);
