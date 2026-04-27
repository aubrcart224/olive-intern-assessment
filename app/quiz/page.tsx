import Link from "next/link";

import { QuizPlayer } from "@/components/quiz-player";
import { decodeQuizSpecFromUrlParam } from "@/lib/quiz-share";

export default async function QuizPage(props: PageProps<"/quiz">) {
  const searchParams = await props.searchParams;
  const encodedSpec =
    typeof searchParams.data === "string" ? searchParams.data : undefined;

  if (!encodedSpec) {
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

  const parsedSpec = decodeQuizSpecFromUrlParam(encodedSpec);

  if (!parsedSpec.success) {
    return (
      <main className="min-h-screen bg-background px-6 py-12">
        <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-3xl items-center justify-center">
          <section className="w-full rounded-3xl border border-border bg-card p-8 shadow-sm">
            <h1 className="text-3xl font-semibold tracking-tight">
              Invalid quiz link
            </h1>
            <p className="mt-4 text-muted-foreground">
              This shared quiz could not be decoded or validated.
            </p>
            <ul className="mt-6 list-disc space-y-2 pl-5 text-sm text-destructive">
              {parsedSpec.issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
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

  return <QuizPlayer spec={parsedSpec.spec} />;
}
