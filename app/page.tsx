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

/* ------------------------------------------------------------------ */
/*  Olive Leaf Icon                                                    */
/* ------------------------------------------------------------------ */
function OliveLeafIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.5 0 1-.05 1.5-.15" />
      <path d="M12 22c5.5 0 10-4.5 10-10S17.5 2 12 2" />
      <path d="M12 22V12" />
      <path d="M12 12c3-2 5-5 5-8" />
      <path d="M12 12c-3-1-5-4-5-7" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Editable Field Component                                           */
/* ------------------------------------------------------------------ */
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
    const inputClasses = `w-full rounded-xl border-2 border-olive-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-olive-500 focus:ring-4 focus:ring-olive-500/10 ${className}`;
    return (
      <div className="space-y-3">
        {multiline ? (
          <textarea
            className={`${inputClasses} min-h-[100px] resize-y`}
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
            className="rounded-lg bg-olive-500 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-olive-500/20 transition hover:bg-olive-600"
          >
            Save
          </button>
          <button
            onClick={handleCancel}
            className="rounded-lg bg-olive-100 px-4 py-2 text-xs font-semibold text-olive-700 transition hover:bg-olive-200"
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
      className={`group cursor-pointer rounded-xl border-2 border-transparent px-3 py-2 -mx-3 transition hover:border-olive-200 hover:bg-olive-50/50 ${className}`}
    >
      <span className={value ? "" : "text-olive-400 italic"}>
        {value || placeholder}
      </span>
      <span className="ml-2 opacity-0 group-hover:opacity-100 text-xs text-olive-400 transition-opacity">
        Click to edit
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Score Input Component                                              */
/* ------------------------------------------------------------------ */
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
          className="w-20 rounded-lg border-2 border-olive-300 bg-white px-2 py-1.5 text-sm text-center font-semibold outline-none transition focus:border-olive-500 focus:ring-4 focus:ring-olive-500/10"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          min={min}
          max={max}
          autoFocus
        />
        <button
          onClick={handleSave}
          className="rounded-md bg-olive-500 px-2 py-1 text-xs font-bold text-white hover:bg-olive-600"
        >
          ✓
        </button>
        <button
          onClick={handleCancel}
          className="rounded-md bg-olive-100 px-2 py-1 text-xs font-bold text-olive-700 hover:bg-olive-200"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition hover:shadow-sm ${
        value > 0 
          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" 
          : value < 0 
            ? "bg-red-100 text-red-700 hover:bg-red-200" 
            : "bg-olive-100 text-olive-700 hover:bg-olive-200"
      }`}
      title="Click to edit score"
    >
      {value > 0 ? "+" : ""}{value}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Number Input Component                                             */
/* ------------------------------------------------------------------ */
function NumberInput({
  value,
  onChange,
  min = -999,
  max = 999,
  label,
  width = "w-20",
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
  width?: string;
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
        {label && <span className="text-xs text-gray-500">{label}</span>}
        <input
          type="number"
          className={`${width} rounded-lg border-2 border-olive-300 bg-white px-2 py-1.5 text-sm text-center font-semibold outline-none transition focus:border-olive-500 focus:ring-4 focus:ring-olive-500/10`}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          min={min}
          max={max}
          autoFocus
        />
        <button
          onClick={handleSave}
          className="rounded-md bg-olive-500 px-2 py-1 text-xs font-bold text-white hover:bg-olive-600"
        >
          ✓
        </button>
        <button
          onClick={handleCancel}
          className="rounded-md bg-olive-100 px-2 py-1 text-xs font-bold text-olive-700 hover:bg-olive-200"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-700 transition hover:bg-gray-200"
    >
      {label && <span className="text-gray-500 font-normal">{label}</span>}
      {value}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page Component                                                */
/* ------------------------------------------------------------------ */
export default function Home() {
  const [sourceText, setSourceText] = useState("");
  const [submittedText, setSubmittedText] = useState("");
  const [generatedSpec, setGeneratedSpec] = useState<QuizSpec | null>(null);
  const [savedQuizId, setSavedQuizId] = useState<string | null>(null);
  const [issues, setIssues] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [, setIsSaving] = useState(false);
  const [generationState, setGenerationState] = useState<GenerationState>({
    message: "Describe the quiz you want in plain text. The AI will turn it into an interactive quiz.",
    tone: "idle",
  });
  const [questionsCollapsed, setQuestionsCollapsed] = useState(false);

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
    if (!prompt) return;

    setIsGenerating(true);
    setSubmittedText(prompt);
    setIssues([]);
    setGenerationState({
      message: "AI is crafting your quiz...",
      tone: "info",
    });

    try {
      const response = await fetch("/api/quiz-spec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const payload = (await response.json()) as GenerateQuizApiResponse;

      if (!payload.ok) {
        setGeneratedSpec(null);
        setIssues(payload.issues ?? []);
        setGenerationState({
          message: payload.errorMessage ?? "Quiz generation failed. Try a different prompt.",
          tone: "error",
        });
        return;
      }

      setGeneratedSpec(payload.spec);
      setSavedQuizId(null);
      setIssues([]);
      setGenerationState({
        message: payload.repaired
          ? "Quiz generated with automatic fixes applied."
          : "Your quiz is ready! Preview and edit below.",
        tone: "success",
      });

      await saveQuiz(payload.spec);
    } catch (error) {
      setGeneratedSpec(null);
      setGenerationState({
        message: error instanceof Error ? error.message : "Unexpected error while generating the quiz.",
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
      }
    } catch {
      // Silently fail - quiz is still usable
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveEdited = async () => {
    if (!generatedSpec) return;
    setSavedQuizId(null);
    await saveQuiz(generatedSpec);
    setGenerationState({
      message: "Changes saved to database.",
      tone: "success",
    });
  };

  const handleCopyShareLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setGenerationState({
        message: "Share link copied to clipboard!",
        tone: "success",
      });
    } catch {
      setGenerationState({
        message: "Could not copy link. You can still open it manually.",
        tone: "error",
      });
    }
  };

  /* Update functions */
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

  const updateQuestion = (index: number, updates: Partial<QuizQuestion>) => {
    if (!generatedSpec) return;
    const newQuestions = [...generatedSpec.quiz.questions];
    newQuestions[index] = { ...newQuestions[index], ...updates } as QuizQuestion;
    setGeneratedSpec({
      ...generatedSpec,
      quiz: { ...generatedSpec.quiz, questions: newQuestions },
    });
  };

  const updateOption = (questionIndex: number, optionIndex: number, updates: Partial<ChoiceOption>) => {
    if (!generatedSpec) return;
    const question = generatedSpec.quiz.questions[questionIndex];
    if (!("options" in question)) return;
    const newOptions = [...question.options];
    newOptions[optionIndex] = { ...newOptions[optionIndex], ...updates };
    updateQuestion(questionIndex, { options: newOptions } as Partial<QuizQuestion>);
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    if (!generatedSpec) return;
    const question = generatedSpec.quiz.questions[questionIndex];
    if (!("options" in question)) return;
    if (question.options.length <= 2) return;
    const newOptions = question.options.filter((_, i) => i !== optionIndex);
    updateQuestion(questionIndex, { options: newOptions } as Partial<QuizQuestion>);
  };

  const [regeneratingQuestionIndex, setRegeneratingQuestionIndex] = useState<number | null>(null);

  const regenerateOptions = async (questionIndex: number) => {
    if (!generatedSpec) return;
    const question = generatedSpec.quiz.questions[questionIndex];
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

  const removeQuestion = (index: number) => {
    if (!generatedSpec) return;
    const newQuestions = generatedSpec.quiz.questions.filter((_, i) => i !== index);
    setGeneratedSpec({
      ...generatedSpec,
      quiz: { ...generatedSpec.quiz, questions: newQuestions },
    });
  };

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

  const generateUniqueId = (prefix: string, existingIds: string[]): string => {
    let counter = 1;
    let id = `${prefix}-${counter}`;
    while (existingIds.includes(id)) {
      counter++;
      id = `${prefix}-${counter}`;
    }
    return id;
  };

  const addQuestion = (type: "multiple_choice" | "yes_no" | "slider") => {
    if (!generatedSpec) return;
    const allIds = generatedSpec.quiz.questions.map((q) => q.id);
    const newId = generateUniqueId("q", allIds);

    let newQuestion: QuizQuestion;
    if (type === "multiple_choice") {
      newQuestion = {
        id: newId,
        type: "multiple_choice",
        title: "New multiple choice question",
        required: true,
        allowMultiple: false,
        options: [
          { id: `${newId}-opt-1`, label: "Option A", scoreDelta: 0 },
          { id: `${newId}-opt-2`, label: "Option B", scoreDelta: 0 },
        ],
      } as QuizQuestion;
    } else if (type === "yes_no") {
      newQuestion = {
        id: newId,
        type: "yes_no",
        title: "New yes/no question",
        required: true,
        yesLabel: "Yes",
        noLabel: "No",
        scoreDelta: { yes: 5, no: -5 },
      } as QuizQuestion;
    } else {
      newQuestion = {
        id: newId,
        type: "slider",
        title: "New slider question",
        required: true,
        min: 0,
        max: 10,
        step: 1,
        minLabel: "Low",
        maxLabel: "High",
        scoreBands: [
          { minValue: 0, maxValue: 10, scoreDelta: 0, label: "Neutral" },
        ],
      } as QuizQuestion;
    }

    setGeneratedSpec({
      ...generatedSpec,
      quiz: {
        ...generatedSpec.quiz,
        questions: [...generatedSpec.quiz.questions, newQuestion],
      },
    });
  };

  const addOption = (questionIndex: number) => {
    if (!generatedSpec) return;
    const question = generatedSpec.quiz.questions[questionIndex];
    if (!("options" in question)) return;
    if (question.options.length >= 8) return;

    const allOptionIds = question.options.map((o) => o.id);
    const newId = generateUniqueId(`${question.id}-opt`, allOptionIds);
    const newOption: ChoiceOption = {
      id: newId,
      label: `Option ${String.fromCharCode(65 + question.options.length)}`,
      scoreDelta: 0,
    };

    updateQuestion(questionIndex, {
      options: [...question.options, newOption],
    } as Partial<QuizQuestion>);
  };

  const removeScoreBand = (questionIndex: number, bandIndex: number) => {
    if (!generatedSpec) return;
    const question = generatedSpec.quiz.questions[questionIndex];
    if (question.type !== "slider") return;
    if (question.scoreBands.length <= 1) return;
    const newBands = question.scoreBands.filter((_, i) => i !== bandIndex);
    updateQuestion(questionIndex, { scoreBands: newBands } as Partial<QuizQuestion>);
  };

  const addScoreBand = (questionIndex: number) => {
    if (!generatedSpec) return;
    const question = generatedSpec.quiz.questions[questionIndex];
    if (question.type !== "slider") return;
    if (question.scoreBands.length >= 8) return;
    const lastBand = question.scoreBands[question.scoreBands.length - 1];
    const newBand = {
      minValue: lastBand ? lastBand.maxValue + 1 : question.min,
      maxValue: lastBand ? lastBand.maxValue + 2 : question.max,
      scoreDelta: 0,
      label: "New band",
    };
    updateQuestion(questionIndex, {
      scoreBands: [...question.scoreBands, newBand],
    } as Partial<QuizQuestion>);
  };

  const toggleQuestionsCollapsed = () => {
    setQuestionsCollapsed((prev) => !prev);
  };

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */
  return (
    <div className="min-h-screen bg-[#faf9f6]">
      {/* Top Progress Bar - shown when generating */}
      {isGenerating && (
        <div className="fixed left-0 right-0 top-0 z-50 h-1.5 bg-olive-200">
          <div className="h-full animate-pulse bg-olive-500" style={{ width: "60%" }} />
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-5 sm:px-10 border-b border-olive-200">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-olive-700 transition hover:bg-olive-50"
        >
          <OliveLeafIcon className="h-5 w-5" />
          <span className="hidden sm:inline">Olive Text-to-Quiz</span>
        </Link>
        <Link href="/dashboard">
          <Button 
            variant="outline" 
            className="rounded-xl border-olive-200 text-olive-700 hover:bg-olive-50 hover:text-olive-800"
          >
            Dashboard
          </Button>
        </Link>
      </header>

      <main className="px-6 py-12 sm:px-10">
        <div className="mx-auto max-w-4xl">
          {/* Hero Section */}
          <div className="mb-16 text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-olive-100 px-4 py-2">
              <OliveLeafIcon className="h-4 w-4 text-olive-600" />
              <span className="text-xs font-semibold uppercase tracking-wider text-olive-700">
                Olive Text-to-Quiz
              </span>
            </div>
            <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
              Create a quiz from
              <br />
              <span className="text-olive-600">just a description</span>
            </h1>
            <p className="mx-auto max-w-xl text-lg text-gray-600">
              Describe what you want in plain English. Our AI will generate a beautiful, 
              interactive quiz you can share instantly.
            </p>
          </div>

          {/* Prompt Input Section */}
          <section className="mb-12">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <textarea
                  id="source-text"
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                  placeholder="Example: Create a 5-question quiz to help someone figure out if they're eating too much ultra-processed food. Ask about breakfast habits, how often they read ingredient labels, whether they cook at home, and how often they eat fast food. At the end, give them a score and recommend whether they should try Olive."
                  className="min-h-[200px] w-full resize-y rounded-3xl border-2 border-olive-100 bg-white p-6 text-lg leading-relaxed text-gray-800 placeholder:text-olive-300 outline-none transition focus:border-olive-400 focus:ring-4 focus:ring-olive-500/10"
                />
                <div className="absolute bottom-4 right-4">
                  <span className="text-xs font-medium text-olive-400">
                    {sourceText.length} chars
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-gray-500">
                  Be specific about topics, question types, and what result you want.
                </p>
                <Button
                  disabled={!sourceText.trim() || isGenerating}
                  size="lg"
                  type="submit"
                  className="rounded-2xl bg-olive-500 px-8 py-6 text-base font-semibold text-white shadow-lg shadow-olive-500/20 transition hover:bg-olive-600 hover:shadow-xl hover:shadow-olive-500/30 disabled:opacity-50 disabled:shadow-none"
                >
                  {isGenerating ? (
                    <span className="flex items-center gap-2">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Generating...
                    </span>
                  ) : (
                    "Generate Quiz"
                  )}
                </Button>
              </div>
            </form>
          </section>

          {/* Status Message */}
          {generationState.tone !== "idle" && (
            <div
              className={`mb-8 rounded-2xl px-6 py-4 text-sm font-medium transition-all ${
                generationState.tone === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : generationState.tone === "error"
                    ? "bg-red-50 text-red-800 border border-red-200"
                    : "bg-olive-50 text-olive-800 border border-olive-200"
              }`}
            >
              <div className="flex items-center gap-3">
                {generationState.tone === "success" && (
                  <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {generationState.tone === "error" && (
                  <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                {generationState.tone === "info" && (
                  <svg className="h-5 w-5 text-olive-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                {generationState.message}
              </div>
            </div>
          )}

          {/* Share Section - Only when quiz exists */}
          {shareUrl && (
            <section className="mb-12 rounded-3xl border-2 border-olive-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1 min-w-0">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-olive-500">
                    Shareable Quiz Link
                  </p>
                  <a
                    href={shareUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate text-sm font-medium text-olive-600 underline-offset-4 hover:underline"
                  >
                    {shareUrl}
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleCopyShareLink}
                    variant="outline"
                    className="rounded-xl border-olive-200 text-olive-700 hover:bg-olive-50"
                  >
                    <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy link
                  </Button>
                  <a
                    href={sharePath}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-olive-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-olive-500/20 transition hover:bg-olive-600"
                  >
                    Take quiz
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            </section>
          )}

          {/* Quiz Editor Preview */}
          {generatedSpec && (
            <section className="space-y-8">
              {/* Editor Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-gray-900">
                    Quiz Preview
                  </h2>
                  <p className="text-sm text-gray-500">
                    Click any text to edit. Changes save automatically.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {submittedText && (
                    <Button
                      disabled={isGenerating}
                      onClick={generateQuiz}
                      variant="outline"
                      className="rounded-xl border-olive-200 text-olive-700 hover:bg-olive-50"
                    >
                      <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Regenerate
                    </Button>
                  )}
                  <Button
                    onClick={handleSaveEdited}
                    className="rounded-xl bg-olive-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-olive-500/20 transition hover:bg-olive-600"
                  >
                    <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    Save changes
                  </Button>
                </div>
              </div>

              {/* Quiz Overview Card */}
              <div className="rounded-3xl border-2 border-olive-200 bg-white p-8 shadow-sm">
                <div className="mb-6 flex items-center gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full bg-olive-100 px-3 py-1 text-xs font-semibold text-olive-700">
                    <OliveLeafIcon className="h-3 w-3" />
                    Quiz Overview
                  </span>
                  <span className="text-xs text-gray-400">
                    {generatedSpec.quiz.questions.length} questions ·{" "}
                    {generatedSpec.quiz.resultsScreen.bands.length} result bands
                  </span>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-olive-500">
                      Quiz Title
                    </label>
                    <EditableField
                      value={generatedSpec.quiz.title}
                      onChange={updateQuizTitle}
                      placeholder="Enter quiz title..."
                      className="text-2xl font-bold text-gray-900"
                      maxLength={120}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-olive-500">
                      Description
                    </label>
                    <EditableField
                      value={generatedSpec.quiz.description}
                      onChange={updateQuizDescription}
                      placeholder="Enter quiz description..."
                      multiline
                      maxLength={400}
                    />
                  </div>

                  <div className="flex items-center gap-4 pt-4 border-t border-olive-200">
                    <div className="flex-1">
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-olive-500">
                        Score Label
                      </label>
                      <EditableField
                        value={generatedSpec.quiz.scoring.scoreLabel}
                        onChange={updateQuizScoreLabel}
                        placeholder="Enter score label..."
                        maxLength={40}
                      />
                    </div>
                    <div className="rounded-2xl bg-olive-50 px-6 py-4 text-center">
                      <span className="text-xs font-semibold uppercase tracking-wider text-olive-500">
                        Scoring
                      </span>
                      <p className="mt-1 text-lg font-bold text-olive-700">0-100</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Questions */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold tracking-tight text-gray-900">
                    Questions
                  </h3>
                  <button
                    onClick={toggleQuestionsCollapsed}
                    className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-olive-600 transition hover:bg-olive-50"
                    title={questionsCollapsed ? "Expand all" : "Collapse all"}
                  >
                    <svg
                      className={`h-4 w-4 transition-transform ${questionsCollapsed ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    {questionsCollapsed ? "Expand" : "Collapse"}
                  </button>
                </div>

                {!questionsCollapsed && (
                <>
                {generatedSpec.quiz.questions.map((question, index) => (
                  <div
                    key={question.id}
                    className="rounded-3xl border-2 border-olive-200 bg-white p-6 shadow-sm transition hover:border-olive-300"
                  >
                    <div className="mb-6 flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-olive-100 text-sm font-bold text-olive-700">
                          {index + 1}
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium capitalize text-gray-600">
                            {question.type.replace("_", " ")}
                          </span>
                          {"allowMultiple" in question && (
                            <button
                              onClick={() => updateQuestion(index, { allowMultiple: !question.allowMultiple } as Partial<QuizQuestion>)}
                              className={`rounded-full px-3 py-1 text-xs font-medium transition ${question.allowMultiple ? "bg-amber-50 text-amber-700 hover:bg-amber-100" : "bg-gray-50 text-gray-500 hover:bg-gray-100"}`}
                              title={question.allowMultiple ? "Click to make single-select" : "Click to make multi-select"}
                            >
                              {question.allowMultiple ? "Multi-select" : "Single-select"}
                            </button>
                          )}
                          {"options" in question && (
                            <span className="text-xs text-gray-400">
                              {question.options.length} options
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => moveQuestion(index, -1)}
                          disabled={index === 0}
                          className="rounded-lg p-2 text-gray-400 transition hover:bg-olive-50 hover:text-olive-600 disabled:opacity-30"
                          title="Move up"
                        >
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => moveQuestion(index, 1)}
                          disabled={index === generatedSpec.quiz.questions.length - 1}
                          className="rounded-lg p-2 text-gray-400 transition hover:bg-olive-50 hover:text-olive-600 disabled:opacity-30"
                          title="Move down"
                        >
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => removeQuestion(index)}
                          className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                          title="Remove question"
                        >
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-olive-500">
                          Question Text
                        </label>
                        <EditableField
                          value={question.title}
                          onChange={(title) => updateQuestion(index, { title })}
                          placeholder="Enter question..."
                          className="text-lg font-semibold text-gray-900"
                          maxLength={180}
                        />
                      </div>

                      {"description" in question && (
                        <div>
                          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-olive-500">
                            Description (optional)
                          </label>
                          <EditableField
                            value={question.description || ""}
                            onChange={(description) => updateQuestion(index, { description })}
                            placeholder="Enter description..."
                            multiline
                            maxLength={400}
                          />
                        </div>
                      )}

                      {/* Options Section */}
                      {"options" in question && (
                        <div className="mt-6 border-t-2 border-olive-200 pt-6">
                          <div className="mb-4 flex items-center justify-between">
                            <label className="text-xs font-semibold uppercase tracking-wider text-olive-500">
                              Answer Options
                            </label>
                            <button
                              onClick={() => regenerateOptions(index)}
                              disabled={regeneratingQuestionIndex === index}
                              className="inline-flex items-center gap-2 rounded-lg bg-olive-50 px-3 py-2 text-xs font-semibold text-olive-700 transition hover:bg-olive-100 disabled:opacity-50"
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
                                  Regenerate with AI
                                </>
                              )}
                            </button>
                          </div>

                          <div className="grid gap-3">
                            {question.options.map((option, optionIndex) => (
                              <div
                                key={option.id}
                                className="group flex items-start gap-4 rounded-2xl border border-olive-200 bg-olive-50/30 p-4 transition hover:border-olive-300 hover:bg-olive-50/50"
                              >
                                <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-olive-200 text-xs font-bold text-olive-700">
                                  {String.fromCharCode(65 + optionIndex)}
                                </span>
                                <div className="flex-1 space-y-2">
                                  <EditableField
                                    value={option.label}
                                    onChange={(label) => updateOption(index, optionIndex, { label })}
                                    placeholder="Option text..."
                                    className="font-medium text-gray-900"
                                    maxLength={140}
                                  />
                                  {option.helperText && (
                                    <EditableField
                                      value={option.helperText}
                                      onChange={(helperText) => updateOption(index, optionIndex, { helperText })}
                                      placeholder="Helper text..."
                                      className="text-xs text-gray-500"
                                      maxLength={240}
                                    />
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <ScoreInput
                                    value={option.scoreDelta}
                                    onChange={(scoreDelta) => updateOption(index, optionIndex, { scoreDelta })}
                                  />
                                  <button
                                    onClick={() => removeOption(index, optionIndex)}
                                    disabled={question.options.length <= 2}
                                    className="rounded-lg p-2 text-gray-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 disabled:opacity-0"
                                    title="Remove option"
                                  >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                          {"options" in question && question.options.length < 8 && (
                            <button
                              onClick={() => addOption(index)}
                              className="mt-3 inline-flex items-center gap-2 rounded-xl border-2 border-dashed border-olive-200 px-4 py-3 text-sm font-medium text-olive-600 transition hover:border-olive-400 hover:bg-olive-50 w-full justify-center"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              Add option
                            </button>
                          )}
                        </div>
                      )}

                      {/* Yes/No Section */}
                      {question.type === "yes_no" && (
                        <div className="mt-6 space-y-4 border-t-2 border-olive-200 pt-6">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-olive-500">
                                "Yes" Label
                              </label>
                              <EditableField
                                value={question.yesLabel}
                                onChange={(yesLabel) => updateQuestion(index, { yesLabel })}
                                placeholder="Yes"
                                maxLength={40}
                              />
                            </div>
                            <div>
                              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-olive-500">
                                "No" Label
                              </label>
                              <EditableField
                                value={question.noLabel}
                                onChange={(noLabel) => updateQuestion(index, { noLabel })}
                                placeholder="No"
                                maxLength={40}
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-6 pt-2">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-semibold uppercase tracking-wider text-olive-500">Yes score</span>
                              <ScoreInput
                                value={question.scoreDelta.yes}
                                onChange={(yes) => updateQuestion(index, { scoreDelta: { ...question.scoreDelta, yes } } as Partial<QuizQuestion>)}
                              />
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-semibold uppercase tracking-wider text-olive-500">No score</span>
                              <ScoreInput
                                value={question.scoreDelta.no}
                                onChange={(no) => updateQuestion(index, { scoreDelta: { ...question.scoreDelta, no } } as Partial<QuizQuestion>)}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Slider Section */}
                      {question.type === "slider" && (
                        <div className="mt-6 space-y-6 border-t-2 border-olive-200 pt-6">
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-olive-500">Min Value</label>
                              <NumberInput
                                value={question.min}
                                onChange={(min) => updateQuestion(index, { min } as Partial<QuizQuestion>)}
                                max={question.max - 1}
                              />
                            </div>
                            <div>
                              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-olive-500">Max Value</label>
                              <NumberInput
                                value={question.max}
                                onChange={(max) => updateQuestion(index, { max } as Partial<QuizQuestion>)}
                                min={question.min + 1}
                              />
                            </div>
                            <div>
                              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-olive-500">Step</label>
                              <NumberInput
                                value={question.step}
                                onChange={(step) => updateQuestion(index, { step: Math.max(1, step) } as Partial<QuizQuestion>)}
                                min={1}
                                max={question.max - question.min}
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-olive-500">Min Label</label>
                              <EditableField
                                value={question.minLabel}
                                onChange={(minLabel) => updateQuestion(index, { minLabel })}
                                placeholder="Low"
                                maxLength={40}
                              />
                            </div>
                            <div>
                              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-olive-500">Max Label</label>
                              <EditableField
                                value={question.maxLabel}
                                onChange={(maxLabel) => updateQuestion(index, { maxLabel })}
                                placeholder="High"
                                maxLength={40}
                              />
                            </div>
                          </div>
                          <div>
                            <div className="mb-3 flex items-center justify-between">
                              <label className="text-xs font-semibold uppercase tracking-wider text-olive-500">Score Bands</label>
                            </div>
                            <div className="space-y-3">
                              {question.scoreBands.map((band, bandIndex) => (
                                <div
                                  key={bandIndex}
                                  className="group flex items-center gap-3 rounded-2xl border border-olive-200 bg-olive-50/30 p-4"
                                >
                                  <div className="flex items-center gap-2">
                                    <NumberInput
                                      value={band.minValue}
                                      onChange={(minValue) => {
                                        const newBands = [...question.scoreBands];
                                        newBands[bandIndex] = { ...band, minValue };
                                        updateQuestion(index, { scoreBands: newBands } as Partial<QuizQuestion>);
                                      }}
                                      max={band.maxValue}
                                      label="From"
                                      width="w-16"
                                    />
                                    <span className="text-xs text-gray-400">-</span>
                                    <NumberInput
                                      value={band.maxValue}
                                      onChange={(maxValue) => {
                                        const newBands = [...question.scoreBands];
                                        newBands[bandIndex] = { ...band, maxValue };
                                        updateQuestion(index, { scoreBands: newBands } as Partial<QuizQuestion>);
                                      }}
                                      min={band.minValue}
                                      label="To"
                                      width="w-16"
                                    />
                                  </div>
                                  <div className="flex-1">
                                    <EditableField
                                      value={band.label || ""}
                                      onChange={(label) => {
                                        const newBands = [...question.scoreBands];
                                        newBands[bandIndex] = { ...band, label: label || undefined };
                                        updateQuestion(index, { scoreBands: newBands } as Partial<QuizQuestion>);
                                      }}
                                      placeholder="Band label..."
                                      maxLength={80}
                                      className="text-sm font-medium text-gray-900"
                                    />
                                  </div>
                                  <ScoreInput
                                    value={band.scoreDelta}
                                    onChange={(scoreDelta) => {
                                      const newBands = [...question.scoreBands];
                                      newBands[bandIndex] = { ...band, scoreDelta };
                                      updateQuestion(index, { scoreBands: newBands } as Partial<QuizQuestion>);
                                    }}
                                  />
                                  <button
                                    onClick={() => removeScoreBand(index, bandIndex)}
                                    disabled={question.scoreBands.length <= 1}
                                    className="rounded-lg p-2 text-gray-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 disabled:opacity-0"
                                    title="Remove band"
                                  >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                              ))}
                            </div>
                            {question.scoreBands.length < 8 && (
                              <button
                                onClick={() => addScoreBand(index)}
                                className="mt-3 inline-flex items-center gap-2 rounded-xl border-2 border-dashed border-olive-200 px-4 py-3 text-sm font-medium text-olive-600 transition hover:border-olive-400 hover:bg-olive-50 w-full justify-center"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Add score band
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                </>
                )}
                {generatedSpec.quiz.questions.length < 12 && (
                  <div className="flex flex-wrap items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-olive-200 bg-olive-50/30 p-6">
                    <button
                      onClick={() => addQuestion("multiple_choice")}
                      className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-olive-700 shadow-sm border border-olive-200 transition hover:bg-olive-50 hover:border-olive-300"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Multiple Choice
                    </button>
                    <button
                      onClick={() => addQuestion("yes_no")}
                      className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-olive-700 shadow-sm border border-olive-200 transition hover:bg-olive-50 hover:border-olive-300"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Yes / No
                    </button>
                    <button
                      onClick={() => addQuestion("slider")}
                      className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-olive-700 shadow-sm border border-olive-200 transition hover:bg-olive-50 hover:border-olive-300"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                      Slider
                    </button>
                  </div>
                )}
              </div>

              {/* Results */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold tracking-tight text-gray-900">
                  Result Bands
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {generatedSpec.quiz.resultsScreen.bands.map((band, index) => (
                    <div
                      key={band.id}
                      className="rounded-3xl border-2 border-olive-200 bg-white p-6 shadow-sm transition hover:border-olive-300"
                    >
                      <div className="mb-4 flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                            index === 0
                              ? "bg-emerald-100 text-emerald-700"
                              : index === generatedSpec.quiz.resultsScreen.bands.length - 1
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {band.minPercent}%–{band.maxPercent}%
                        </span>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-olive-500">
                            Title
                          </label>
                          <EditableField
                            value={band.title}
                            onChange={(title) => updateResultBand(index, { title })}
                            placeholder="Enter band title..."
                            className="font-semibold text-gray-900"
                            maxLength={120}
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-olive-500">
                            Description
                          </label>
                          <EditableField
                            value={band.description}
                            onChange={(description) => updateResultBand(index, { description })}
                            placeholder="Enter band description..."
                            multiline
                            maxLength={400}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Empty State */}
          {!generatedSpec && !isGenerating && (
            <div className="rounded-3xl border-2 border-dashed border-olive-300 bg-olive-50/30 p-16 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-olive-100">
                <OliveLeafIcon className="h-8 w-8 text-olive-500" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">
                Ready to create your quiz?
              </h3>
              <p className="mx-auto max-w-sm text-sm text-gray-500">
                Describe what you want above and click "Generate Quiz" to see the magic happen.
              </p>
            </div>
          )}

          {/* Issues Display */}
          {issues.length > 0 && (
            <div className="mt-8 rounded-2xl bg-red-50 p-6 text-sm text-red-800 border border-red-200">
              <p className="mb-3 flex items-center gap-2 font-semibold">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Validation Issues
              </p>
              <ul className="space-y-2">
                {issues.map((issue, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
