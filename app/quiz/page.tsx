import Link from "next/link";

import { QuizPlayer } from "@/components/quiz-player";
import { decodeQuizSpecFromUrlParam } from "@/lib/quiz-share";
import { parseQuizSpec } from "@/lib/quiz-spec";
import { createServerClient } from "@/lib/supabase";

export default async function QuizPage(props: PageProps<"/quiz">) {
  const searchParams = await props.searchParams;
  const quizId =
    typeof searchParams.id === "string" ? searchParams.id : undefined;
  const encodedSpec =
    typeof searchParams.data === "string" ? searchParams.data : undefined;

  let spec = null;
  let resolvedQuizId: string | undefined = undefined;

  // Try loading from database by ID first
  if (quizId) {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("quizzes")
      .select("id, spec_json")
      .eq("id", quizId)
      .single();

    if (data?.spec_json) {
      const parsed = parseQuizSpec(JSON.stringify(data.spec_json));
      if (parsed.success) {
        spec = parsed.spec;
        resolvedQuizId = data.id;
      }
    }
  }

  // Fall back to base64 encoded spec (legacy sharing)
  if (!spec && encodedSpec) {
    const parsedSpec = decodeQuizSpecFromUrlParam(encodedSpec);
    if (parsedSpec.success) {
      spec = parsedSpec.spec;
    }
  }

  if (!spec) {
    return (
      <main className="min-h-screen bg-background px-6 py-12">
        <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-3xl items-center justify-center">
          <section className="w-full rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
            <h1 className="text-3xl font-semibold tracking-tight">
              No quiz link found
            </h1>
            <p className="mt-4 text-muted-foreground">
              Generate a quiz first, then open the share link from the builder page.
            </p>
            <Link
              className="mt-6 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              href="/"
            >
              Back to quiz builder
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return <QuizPlayer spec={spec} quizId={resolvedQuizId} />;
}
