"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { buildQuizPath } from "@/lib/quiz-share";
import { type QuizSpec, type QuizQuestion, type ResultBand, type ChoiceOption } from "@/lib/quiz-spec";

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

type RegenerateOptionsResponse =
  | {
      ok: true;
      options: ChoiceOption[];
    }
  | {
      ok: false;
      error: string;
    };

// Inline editable field component
function EditableField({
  value,
  onChange,
  placeholder,
  className,
  multiline = false,
  maxLength,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
  multiline?: boolean;
  maxLength?: number;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleSave = () => {
    onChange(editValue.trim());
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !multiline) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (isEditing) {
    const inputClasses = `w-full rounded-xl border border-primary bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring ${className}`;
    return (
      <div className="space-y-2">
        {multiline ? (
          <textarea
            className={`${inputClasses} min-h-[80px] resize-y`}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            maxLength={maxLength}
            autoFocus
          />
        ) : (
          <input
            className={inputClasses}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            maxLength={maxLength}
            autoFocus
          />
        )}
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            Save
          </button>
          <button
            onClick={handleCancel}
            className="rounded-md bg-muted px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/80"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={`group cursor-pointer rounded-xl border border-transparent px-2 py-1 -mx-2 transition hover:border-border hover:bg-muted/50 ${className}`}
    >
      <span className={value ? "" : "text-muted-foreground italic"}>
        {value || placeholder}
      </span>
      <span className="ml-2 opacity-0 group-hover:opacity-100 text-xs text-muted-foreground">
        Click to edit
      </span>
    </div>
  );
}

// Number input for score editing
function ScoreInput({
  value,
  onChange,
  min = -20,
  max = 20,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value));

  const handleSave = () => {
    const num = parseInt(editValue, 10);
    if (!isNaN(num)) {
      onChange(Math.max(min, Math.min(max, num)));
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(String(value));
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="number"
          className="w-20 rounded-md border border-primary bg-background px-2 py-1 text-sm text-center outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          min={min}
          max={max}
          autoFocus
        />
        <button
          onClick={handleSave}
          className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          ✓
        </button>
        <button
          onClick={handleCancel}
          className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/80"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition hover:bg-muted ${
        value > 0 ? "text-emerald-600 bg-emerald-50" : value < 0 ? "text-red-600 bg-red-50" : "text-muted-foreground bg-muted"
      }`}
      title="Click to edit score"
    >
      {value > 0 ? "+" : ""}{value}
    </button>
  );
}

export default function Home() {
  const [sourceText, setSourceText] = useState("");
  const [submittedText, setSubmittedText] = useState("");
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

        setGenerationState({
          message:
            payload.errorMessage ??
            "Quiz generation failed. Try updating your prompt.",
          tone: "error",
        });
        return;
      }

      if (!response.ok) {
        setGeneratedSpec(null);
        setGenerationState({
          message: "Quiz generation failed. Try updating your prompt.",
          tone: "error",
        });
        return;
      }

      setGeneratedSpec(payload.spec);
      setSavedQuizId(null);
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

  const handleSaveEdited = async () => {
    if (!generatedSpec) return;
    setSavedQuizId(null);
    await saveQuiz(generatedSpec);
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

  // Update quiz metadata
  const updateQuizTitle = (title: string) => {
    if (!generatedSpec) return;
    setGeneratedSpec({
      ...generatedSpec,
      quiz: { ...generatedSpec.quiz, title },
    });
  };

  const updateQuizDescription = (description: string) => {
    if (!generatedSpec) return;
    setGeneratedSpec({
      ...generatedSpec,
      quiz: { ...generatedSpec.quiz, description },
    });
  };

  const updateQuizScoreLabel = (scoreLabel: string) => {
    if (!generatedSpec) return;
    setGeneratedSpec({
      ...generatedSpec,
      quiz: {
        ...generatedSpec.quiz,
        scoring: { ...generatedSpec.quiz.scoring, scoreLabel },
      },
    });
  };

  // Update question
  const updateQuestion = (index: number, updates: Partial<QuizQuestion>) => {
    if (!generatedSpec) return;
    const newQuestions = [...generatedSpec.quiz.questions];
    newQuestions[index] = { ...newQuestions[index], ...updates } as QuizQuestion;
    setGeneratedSpec({
      ...generatedSpec,
      quiz: { ...generatedSpec.quiz, questions: newQuestions },
    });
  };

  // Update option for a question
  const updateOption = (questionIndex: number, optionIndex: number, updates: Partial<ChoiceOption>) => {
    if (!generatedSpec) return;
    const question = generatedSpec.quiz.questions[questionIndex];
    if (!("options" in question)) return;

    const newOptions = [...question.options];
    newOptions[optionIndex] = { ...newOptions[optionIndex], ...updates };
    updateQuestion(questionIndex, { options: newOptions } as Partial<QuizQuestion>);
  };

  // Remove an option from a question
  const removeOption = (questionIndex: number, optionIndex: number) => {
    if (!generatedSpec) return;
    const question = generatedSpec.quiz.questions[questionIndex];
    if (!("options" in question)) return;
    if (question.options.length <= 2) return; // Keep at least 2 options

    const newOptions = question.options.filter((_, i) => i !== optionIndex);
    updateQuestion(questionIndex, { options: newOptions } as Partial<QuizQuestion>);
  };

  // Regenerate options for a question
  const [regeneratingQuestionIndex, setRegeneratingQuestionIndex] = useState<number | null>(null);

  const regenerateOptions = async (questionIndex: number) => {
    if (!generatedSpec) return;
    const question = generatedSpec.quiz.questions[questionIndex];
    
    // Only works for multiple choice or image_choice questions
    if (!("options" in question)) {
      setGenerationState({
        message: "Cannot regenerate options for this question type.",
        tone: "error",
      });
      return;
    }

    setRegeneratingQuestionIndex(questionIndex);
    setGenerationState({
      message: `Regenerating options for question ${questionIndex + 1}...`,
      tone: "info",
    });

    try {
      const response = await fetch("/api/quiz-spec/regenerate-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionTitle: question.title,
          questionDescription: "description" in question ? question.description : undefined,
          questionType: question.type,
          numOptions: question.options.length,
          context: generatedSpec.quiz.description,
        }),
      });

      const payload = (await response.json()) as RegenerateOptionsResponse;

      if (!payload.ok) {
        setGenerationState({
          message: `Failed to regenerate options: ${payload.error}`,
          tone: "error",
        });
        return;
      }

      // Update the question with new options while preserving structure
      updateQuestion(questionIndex, { options: payload.options } as Partial<QuizQuestion>);
      setGenerationState({
        message: `Options regenerated for question ${questionIndex + 1}. Save to persist.`,
        tone: "success",
      });
    } catch (error) {
      setGenerationState({
        message: `Error regenerating options: ${error instanceof Error ? error.message : "Unknown error"}`,
        tone: "error",
      });
    } finally {
      setRegeneratingQuestionIndex(null);
    }
  };

  // Update result band
  const updateResultBand = (index: number, updates: Partial<ResultBand>) => {
    if (!generatedSpec) return;
    const newBands = [...generatedSpec.quiz.resultsScreen.bands];
    newBands[index] = { ...newBands[index], ...updates };
    setGeneratedSpec({
      ...generatedSpec,
      quiz: {
        ...generatedSpec.quiz,
        resultsScreen: { ...generatedSpec.quiz.resultsScreen, bands: newBands },
      },
    });
  };

  // Remove question
  const removeQuestion = (index: number) => {
    if (!generatedSpec) return;
    const newQuestions = generatedSpec.quiz.questions.filter((_, i) => i !== index);
    setGeneratedSpec({
      ...generatedSpec,
      quiz: { ...generatedSpec.quiz, questions: newQuestions },
    });
  };

  // Move question up/down
  const moveQuestion = (index: number, direction: -1 | 1) => {
    if (!generatedSpec) return;
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= generatedSpec.quiz.questions.length) return;
    const newQuestions = [...generatedSpec.quiz.questions];
    [newQuestions[index], newQuestions[newIndex]] = [newQuestions[newIndex], newQuestions[index]];
    setGeneratedSpec({
      ...generatedSpec,
      quiz: { ...generatedSpec.quiz, questions: newQuestions },
    });
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
              Describe the quiz you want in plain text. Then edit it visually before sharing.
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

        {/* Single preview/editor section */}
        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Quiz preview & editor</h2>
              <p className="text-sm text-muted-foreground">
                Click any text to edit it directly. Save your changes when done.
              </p>
            </div>
            {generatedSpec && (
              <Button onClick={handleSaveEdited} variant="secondary" size="sm">
                Save changes
              </Button>
            )}
          </div>

          {generatedSpec ? (
            <div className="space-y-6">
              {/* Quiz header */}
              <div className="rounded-2xl bg-muted/40 p-4 space-y-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground mb-1">
                    Quiz title
                  </p>
                  <EditableField
                    value={generatedSpec.quiz.title}
                    onChange={updateQuizTitle}
                    placeholder="Enter quiz title..."
                    className="text-base font-semibold"
                    maxLength={120}
                  />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground mb-1">
                    Description
                  </p>
                  <EditableField
                    value={generatedSpec.quiz.description}
                    onChange={updateQuizDescription}
                    placeholder="Enter quiz description..."
                    multiline
                    maxLength={400}
                  />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground mb-1">
                    Score label
                  </p>
                  <EditableField
                    value={generatedSpec.quiz.scoring.scoreLabel}
                    onChange={updateQuizScoreLabel}
                    placeholder="Enter score label..."
                    maxLength={40}
                  />
                </div>
              </div>

              {/* Questions */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  Questions ({generatedSpec.quiz.questions.length})
                </h3>
                {generatedSpec.quiz.questions.map((question, index) => (
                  <div
                    className="rounded-2xl border border-border p-4 space-y-4"
                    key={question.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-3">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground mb-1">
                            Question {index + 1}
                          </p>
                          <EditableField
                            value={question.title}
                            onChange={(title) => updateQuestion(index, { title })}
                            placeholder="Enter question title..."
                            className="font-medium"
                            maxLength={180}
                          />
                        </div>
                        {"description" in question && (
                          <div>
                            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground mb-1">
                              Description (optional)
                            </p>
                            <EditableField
                              value={question.description || ""}
                              onChange={(description) => updateQuestion(index, { description })}
                              placeholder="Enter question description..."
                              multiline
                              maxLength={400}
                            />
                          </div>
                        )}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                            {question.type.replace("_", " ")}
                          </span>
                          {"options" in question && (
                            <span className="text-xs text-muted-foreground">
                              {question.options.length} options
                            </span>
                          )}
                          {"allowMultiple" in question && (
                            <span className="text-xs text-muted-foreground">
                              {question.allowMultiple ? "Multi-select" : "Single-select"}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => moveQuestion(index, -1)}
                          disabled={index === 0}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
                          title="Move up"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => moveQuestion(index, 1)}
                          disabled={index === generatedSpec.quiz.questions.length - 1}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
                          title="Move down"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => removeQuestion(index)}
                          className="rounded-md p-1.5 text-destructive hover:bg-destructive/10"
                          title="Remove question"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Options section */}
                    {"options" in question && (
                      <div className="space-y-3 border-t border-border pt-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                            Answer Options
                          </p>
                          <button
                            onClick={() => regenerateOptions(index)}
                            disabled={regeneratingQuestionIndex === index}
                            className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition disabled:opacity-50"
                          >
                            {regeneratingQuestionIndex === index ? (
                              <>
                                <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Regenerating...
                              </>
                            ) : (
                              <>
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Regenerate Answers
                              </>
                            )}
                          </button>
                        </div>
                        
                        <div className="space-y-2">
                          {question.options.map((option, optionIndex) => (
                            <div
                              key={option.id}
                              className="rounded-xl border border-border/50 bg-muted/30 p-3 space-y-2"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <EditableField
                                    value={option.label}
                                    onChange={(label) => updateOption(index, optionIndex, { label })}
                                    placeholder="Option text..."
                                    maxLength={140}
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <ScoreInput
                                    value={option.scoreDelta}
                                    onChange={(scoreDelta) => updateOption(index, optionIndex, { scoreDelta })}
                                  />
                                  <button
                                    onClick={() => removeOption(index, optionIndex)}
                                    disabled={question.options.length <= 2}
                                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
                                    title="Remove option"
                                  >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                              {option.helperText && (
                                <div className="pl-2 border-l-2 border-border">
                                  <EditableField
                                    value={option.helperText}
                                    onChange={(helperText) => updateOption(index, optionIndex, { helperText })}
                                    placeholder="Helper text (optional)..."
                                    className="text-xs text-muted-foreground"
                                    maxLength={240}
                                  />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Yes/No specific editing */}
                    {question.type === "yes_no" && (
                      <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground mb-1">
                            Yes label
                          </p>
                          <EditableField
                            value={question.yesLabel}
                            onChange={(yesLabel) => updateQuestion(index, { yesLabel })}
                            placeholder="Yes"
                            maxLength={40}
                          />
                        </div>
                        <div>
                          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground mb-1">
                            No label
                          </p>
                          <EditableField
                            value={question.noLabel}
                            onChange={(noLabel) => updateQuestion(index, { noLabel })}
                            placeholder="No"
                            maxLength={40}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Results */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  Result bands ({generatedSpec.quiz.resultsScreen.bands.length})
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {generatedSpec.quiz.resultsScreen.bands.map((band, index) => (
                    <div
                      className="rounded-2xl border border-border p-4 space-y-3"
                      key={band.id}
                    >
                      <div>
                        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground mb-1">
                          {band.minPercent}%–{band.maxPercent}%
                        </p>
                        <EditableField
                          value={band.title}
                          onChange={(title) => updateResultBand(index, { title })}
                          placeholder="Enter band title..."
                          className="font-medium"
                          maxLength={120}
                        />
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground mb-1">
                          Description
                        </p>
                        <EditableField
                          value={band.description}
                          onChange={(description) => updateResultBand(index, { description })}
                          placeholder="Enter band description..."
                          multiline
                          maxLength={400}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-12 text-center">
              <p className="text-sm text-muted-foreground mb-2">
                No quiz generated yet.
              </p>
              <p className="text-xs text-muted-foreground">
                Enter a prompt above and click "Generate Quiz" to get started.
              </p>
            </div>
          )}

          {issues.length > 0 ? (
            <div className="mt-6 rounded-2xl bg-destructive/10 p-4 text-sm text-destructive">
              <p className="font-medium">Validation issues</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
