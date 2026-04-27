"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { buildQuizPath } from "@/lib/quiz-share";
import { parseQuizSpec, type QuizSpec } from "@/lib/quiz-spec";

type GenerationState = {
  message: string;
  tone: "idle" | "success" | "error" | "info";
};

type GenerateQuizApiResponse =
  | {
      ok: true;
      spec: QuizSpec;
      rawOutput: string;
      repaired: boolean;
      issues: string[];
    }
  | {
      ok: false;
      rawOutput?: string;
      repaired?: boolean;
      issues: string[];
      errorMessage: string;
    };

type SaveQuizApiResponse =
  | {
      ok: true;
      quiz: { id: string; share_token: string };
    }
  | {
      ok: false;
      error: string;
    };

export default function Home() {
  const [sourceText, setSourceText] = useState("");
  const [submittedText, setSubmittedText] = useState("");
  const [editorText, setEditorText] = useState("");
  const [generatedSpec, setGeneratedSpec] = useState<QuizSpec | null>(null);
  const [savedQuizId, setSavedQuizId] = useState<string | null>(null);
  const [issues, setIssues] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [, setIsSaving] = useState(false);
  const [generationState, setGenerationState] = useState<GenerationState>({
    message:
      "Describe the quiz you want in plain text. The backend will turn it into a structured JSON spec.",
    tone: "idle",
  });

  const sharePath = useMemo(() => {
    if (savedQuizId) {
      return `/quiz?id=${savedQuizId}`;
    }
    return generatedSpec ? buildQuizPath(generatedSpec) : "";
  }, [generatedSpec, savedQuizId]);

  const shareUrl = useMemo(() => {
    if (!sharePath || typeof window === "undefined") {
      return "";
    }

    return new URL(sharePath, window.location.origin).toString();
  }, [sharePath]);

  const generateQuiz = async () => {
    const prompt = sourceText.trim();

    if (!prompt) {
      return;
    }

    setIsGenerating(true);
    setSubmittedText(prompt);
    setIssues([]);
    setGenerationState({
      message: "Generating quiz spec...",
      tone: "info",
    });

    try {
      const response = await fetch("/api/quiz-spec", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      const payload = (await response.json()) as GenerateQuizApiResponse;

      if (!payload.ok) {
        setGeneratedSpec(null);
        setIssues(payload.issues ?? []);

        if (payload.rawOutput) {
          setEditorText(payload.rawOutput);
        }

        setGenerationState({
          message:
            payload.errorMessage ??
            "Quiz generation failed. Update the prompt or fix the JSON manually.",
          tone: "error",
        });
        return;
      }

      if (!response.ok) {
        setGeneratedSpec(null);
        setGenerationState({
          message: "Quiz generation failed. Update the prompt or fix the JSON manually.",
          tone: "error",
        });
        return;
      }

      setGeneratedSpec(payload.spec);
      setSavedQuizId(null);
      setEditorText(JSON.stringify(payload.spec, null, 2));
      setIssues([]);
      setGenerationState({
        message: payload.repaired
          ? "The first model response was malformed, but an automatic repair pass produced a valid quiz spec."
          : "Quiz spec generated successfully.",
        tone: "success",
      });

      await saveQuiz(payload.spec);
    } catch (error) {
      setGeneratedSpec(null);
      setGenerationState({
        message:
          error instanceof Error
            ? error.message
            : "Unexpected error while generating the quiz.",
        tone: "error",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await generateQuiz();
  };

  const saveQuiz = async (spec: QuizSpec) => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/quiz/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spec }),
      });

      const payload = (await response.json()) as SaveQuizApiResponse;

      if (payload.ok) {
        setSavedQuizId(payload.quiz.id);
        setGenerationState((prev) => ({
          ...prev,
          message: `${prev.message} Saved to database.`,
          tone: "success",
        }));
      } else {
        setGenerationState((prev) => ({
          ...prev,
          message: `${prev.message} (Could not save to database: ${payload.error})`,
          tone: "success",
        }));
      }
    } catch {
      setGenerationState((prev) => ({
        ...prev,
        message: `${prev.message} (Could not save to database.)`,
        tone: "success",
      }));
    } finally {
      setIsSaving(false);
    }
  };

  const handleValidateEditor = async () => {
    const result = parseQuizSpec(editorText);

    if (!result.success) {
      setGeneratedSpec(null);
      setSavedQuizId(null);
      setIssues(result.issues);
      setGenerationState({
        message:
          "The JSON editor content is invalid. Fix the issues below or re-run the prompt.",
        tone: "error",
      });
      return;
    }

    setGeneratedSpec(result.spec);
    setSavedQuizId(null);
    setEditorText(JSON.stringify(result.spec, null, 2));
    setIssues([]);
    setGenerationState({
      message: "Manual JSON is valid and ready to use.",
      tone: "success",
    });

    await saveQuiz(result.spec);
  };

  const handleCopyShareLink = async () => {
    if (!shareUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setGenerationState({
        message: "Share link copied to clipboard.",
        tone: "success",
      });
    } catch {
      setGenerationState({
        message: "Could not copy the share link. You can still open it manually below.",
        tone: "error",
      });
    }
  };

  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground">
              Olive Interview
            </p>
            <h1 className="text-4xl font-semibold tracking-tight">Text-to-Quiz</h1>
            <p className="max-w-2xl text-lg text-muted-foreground">
              Paste or type source material below, then generate a quiz from it.
            </p>
          </div>

          <Link href="/dashboard">
            <Button size="lg" variant="outline">
              Open dashboard
            </Button>
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <form
            className="rounded-3xl border border-border bg-card p-6 shadow-sm"
            onSubmit={handleSubmit}
          >
            <div className="space-y-3">
              <label
                className="text-sm font-medium text-foreground"
                htmlFor="source-text"
              >
                Quiz prompt
              </label>
              <textarea
                id="source-text"
                className="min-h-72 w-full resize-y rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                onChange={(event) => setSourceText(event.target.value)}
                placeholder="Example: Create a 5-question employee onboarding quiz with mostly multiple choice questions, one confidence slider, simple scoring, and a results screen with beginner/intermediate/expert bands."
                value={sourceText}
              />
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Describe the quiz in plain English. The server turns it into a structured JSON spec.
                </p>
                <Button disabled={!sourceText.trim() || isGenerating} size="lg" type="submit">
                  {isGenerating ? "Generating..." : "Generate Quiz"}
                </Button>
              </div>
            </div>
          </form>

          <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="space-y-4">
              <div className="space-y-2">
                <h2 className="text-lg font-semibold tracking-tight">
                  Generation status
                </h2>
                <p
                  className={[
                    "rounded-2xl px-4 py-3 text-sm",
                    generationState.tone === "success"
                      ? "bg-emerald-500/10 text-emerald-700"
                      : generationState.tone === "error"
                        ? "bg-destructive/10 text-destructive"
                        : generationState.tone === "info"
                          ? "bg-primary/10 text-foreground"
                          : "bg-muted text-muted-foreground",
                  ].join(" ")}
                >
                  {generationState.message}
                </p>
              </div>

              <div className="space-y-2 rounded-2xl bg-muted/40 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  Last prompt
                </p>
                <p className="whitespace-pre-wrap break-words text-sm text-foreground">
                  {submittedText || "No quiz request submitted yet."}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                    Questions
                  </p>
                  <p className="mt-2 text-2xl font-semibold">
                    {generatedSpec?.quiz.questions.length ?? 0}
                  </p>
                </div>
                <div className="rounded-2xl border border-border p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                    Result bands
                  </p>
                  <p className="mt-2 text-2xl font-semibold">
                    {generatedSpec?.quiz.resultsScreen.bands.length ?? 0}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {submittedText ? (
                  <Button
                    disabled={isGenerating}
                    onClick={generateQuiz}
                    type="button"
                    variant="outline"
                  >
                    Re-run prompt
                  </Button>
                ) : null}
                <Button onClick={handleValidateEditor} type="button" variant="secondary">
                  Validate edited JSON
                </Button>
              </div>

              {shareUrl ? (
                <div className="space-y-3 rounded-2xl border border-border bg-muted/30 p-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                      Shareable quiz link
                    </p>
                    <a
                      className="mt-2 block break-all text-sm text-primary underline-offset-4 hover:underline"
                      href={shareUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {shareUrl}
                    </a>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={handleCopyShareLink} type="button" variant="outline">
                      Copy link
                    </Button>
                    <a
                      className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
                      href={sharePath}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Take quiz
                    </a>
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
          <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">
                    Manual quiz spec editor
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    If generation fails or you want to tweak the output, edit the JSON here and validate it.
                  </p>
                </div>
              </div>
              <textarea
                className="min-h-[28rem] w-full rounded-2xl border border-input bg-background px-4 py-3 font-mono text-sm outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                onChange={(event) => setEditorText(event.target.value)}
                placeholder='{"version":"1.0","quiz":{...}}'
                value={editorText}
              />
              {issues.length > 0 ? (
                <div className="rounded-2xl bg-destructive/10 p-4 text-sm text-destructive">
                  <p className="font-medium">Validation issues</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {issues.map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Structured preview</h2>
                <p className="text-sm text-muted-foreground">
                  This reflects the validated quiz schema, including question types, scoring, branching, and results.
                </p>
              </div>

              {generatedSpec ? (
                <>
                  <div className="rounded-2xl bg-muted/40 p-4">
                    <h3 className="text-base font-semibold">{generatedSpec.quiz.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {generatedSpec.quiz.description}
                    </p>
                    <p className="mt-3 text-sm text-foreground">
                      <span className="font-medium">Scoring:</span>{" "}
                      0-100{" "}
                      {generatedSpec.quiz.scoring.scoreLabel.toLowerCase()}
                    </p>
                  </div>

                  <div className="space-y-3">
                    {generatedSpec.quiz.questions.map((question) => (
                      <div
                        className="rounded-2xl border border-border p-4"
                        key={question.id}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{question.title}</p>
                          <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                            {question.type}
                          </span>
                        </div>
                        {question.description ? (
                          <p className="mt-2 text-sm text-muted-foreground">
                            {question.description}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>

                  <div className="rounded-2xl border border-border p-4">
                    <h3 className="font-medium">Results screen</h3>
                    <div className="mt-3 space-y-2">
                      {generatedSpec.quiz.resultsScreen.bands.map((band) => (
                        <div
                          className="rounded-xl bg-muted/40 px-3 py-2 text-sm"
                          key={band.id}
                        >
                          <span className="font-medium">{band.title}</span>{" "}
                          <span className="text-muted-foreground">
                            ({band.minPercent}%–{band.maxPercent}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground">
                  No valid quiz spec yet. Generate one from a prompt or validate the edited JSON.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
