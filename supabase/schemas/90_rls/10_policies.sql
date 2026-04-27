-- Enable RLS on tables
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read quizzes (needed to take a quiz)
CREATE POLICY "Allow public select on quizzes"
  ON public.quizzes FOR SELECT
  USING (true);

-- Allow anyone to insert quizzes (needed when generating from builder)
CREATE POLICY "Allow public insert on quizzes"
  ON public.quizzes FOR INSERT
  WITH CHECK (true);

-- Allow anyone to create quiz sessions (needed to track responses)
CREATE POLICY "Allow public insert on quiz_sessions"
  ON public.quiz_sessions FOR INSERT
  WITH CHECK (true);

-- Allow anyone to update their own quiz session (needed to mark complete)
CREATE POLICY "Allow public update on quiz_sessions"
  ON public.quiz_sessions FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Allow anyone to read quiz sessions (needed for dashboard analytics)
CREATE POLICY "Allow public select on quiz_sessions"
  ON public.quiz_sessions FOR SELECT
  USING (true);
