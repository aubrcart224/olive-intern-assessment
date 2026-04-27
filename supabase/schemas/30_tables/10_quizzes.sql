CREATE TABLE IF NOT EXISTS public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  spec_json JSONB NOT NULL,
  share_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(12), 'hex'),
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quizzes_share_token ON public.quizzes(share_token);
CREATE INDEX IF NOT EXISTS idx_quizzes_created_at ON public.quizzes(created_at);
