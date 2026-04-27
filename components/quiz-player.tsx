"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type QuizQuestion, type QuizSpec } from "@/lib/quiz-spec";

type AnswerValue = boolean | number | string | string[] | null;
type AnswerMap = Record<string, AnswerValue>;

type QuizPlayerProps = {
  spec: QuizSpec;
};

/* ------------------------------------------------------------------ */
/*  Logic helpers (unchanged semantics)                                 */
/* ------------------------------------------------------------------ */

function getInitialAnswer(question: QuizQuestion): AnswerValue {
  switch (question.type) {
    case "multiple_choice":
    case "image_choice":
      return [];
    case "yes_no":
      return null;
    case "slider":
      return question.min;
    case "free_text":
      return "";
  }
}

function buildInitialAnswers(spec: QuizSpec) {
  return Object.fromEntries(
    spec.quiz.questions.map((q) => [q.id, getInitialAnswer(q)]),
  );
}

function isQuestionAnswered(question: QuizQuestion, answer: AnswerValue) {
  if (!question.required) return true;
  switch (question.type) {
    case "multiple_choice":
    case "image_choice":
      return Array.isArray(answer) && answer.length > 0;
    case "yes_no":
      return typeof answer === "boolean";
    case "slider":
      return typeof answer === "number";
    case "free_text":
      return typeof answer === "string" && answer.trim().length > 0;
  }
}

function getQuestionScore(question: QuizQuestion, answer: AnswerValue) {
  switch (question.type) {
    case "multiple_choice":
    case "image_choice": {
      if (!Array.isArray(answer)) return 0;
      return question.options.reduce(
        (total, o) => total + (answer.includes(o.id) ? o.scoreDelta : 0),
        0,
      );
    }
    case "yes_no":
      return typeof answer === "boolean"
        ? answer
          ? question.scoreDelta.yes
          : question.scoreDelta.no
        : 0;
    case "slider": {
      if (typeof answer !== "number") return 0;
      return (
        question.scoreBands.find(
          (b) => answer >= b.minValue && answer <= b.maxValue,
        )?.scoreDelta ?? 0
      );
    }
    case "free_text": {
      if (typeof answer !== "string" || answer.trim().length === 0) return 0;
      if (question.evaluation.mode === "manual_review") {
        return question.evaluation.defaultScoreDelta;
      }
      const normalized = answer.toLowerCase();
      const bucket = question.evaluation.keywordBuckets.find((b) =>
        b.keywords.some((k) => normalized.includes(k.toLowerCase())),
      );
      return bucket?.scoreDelta ?? question.evaluation.fallbackScoreDelta;
    }
  }
}

function matchesBranchCondition(
  question: QuizQuestion,
  answer: AnswerValue,
  rule: NonNullable<QuizQuestion["branching"]>["rules"][number],
) {
  const c = rule.condition;
  if (
    c.selectedOptionId &&
    (!Array.isArray(answer) || !answer.includes(c.selectedOptionId))
  )
    return false;
  if (
    c.selectedOptionIdsAll &&
    (!Array.isArray(answer) ||
      !c.selectedOptionIdsAll.every((id) => answer.includes(id)))
  )
    return false;
  if (
    c.equalsBoolean !== undefined &&
    (typeof answer !== "boolean" || answer !== c.equalsBoolean)
  )
    return false;
  if (
    c.minValue !== undefined &&
    (typeof answer !== "number" || answer < c.minValue)
  )
    return false;
  if (
    c.maxValue !== undefined &&
    (typeof answer !== "number" || answer > c.maxValue)
  )
    return false;
  if (
    c.textIncludesAny &&
    (typeof answer !== "string" ||
      !c.textIncludesAny.some((v) =>
        answer.toLowerCase().includes(v.toLowerCase()),
      ))
  )
    return false;
  return true;
}

function resolveNextStep(
  spec: QuizSpec,
  currentIndex: number,
  answer: AnswerValue,
) {
  const q = spec.quiz.questions[currentIndex];
  const branching = q.branching;
  if (branching) {
    const matched = branching.rules.find((r) =>
      matchesBranchCondition(q, answer, r),
    );
    const dest = matched?.destination ?? branching.defaultDestination;
    if (dest?.kind === "question" && dest.targetId) {
      const next = spec.quiz.questions.findIndex((c) => c.id === dest.targetId);
      if (next >= 0) return { nextIndex: next, forcedResultId: null };
    }
    if (dest?.kind === "result")
      return { nextIndex: null, forcedResultId: dest.targetId ?? null };
    if (dest?.kind === "end")
      return { nextIndex: null, forcedResultId: null };
  }
  const next = currentIndex + 1;
  return {
    nextIndex: next < spec.quiz.questions.length ? next : null,
    forcedResultId: null,
  };
}

function getResultBand(
  spec: QuizSpec,
  answers: AnswerMap,
  forcedResultId: string | null,
) {
  if (forcedResultId) {
    const forced = spec.quiz.resultsScreen.bands.find(
      (b) => b.id === forcedResultId,
    );
    if (forced) {
      return {
        score: spec.quiz.questions.reduce(
          (t, q) => t + getQuestionScore(q, answers[q.id]),
          0,
        ),
        band: forced,
      };
    }
  }
  const score = spec.quiz.questions.reduce(
    (t, q) => t + getQuestionScore(q, answers[q.id]),
    0,
  );
  const band =
    spec.quiz.resultsScreen.bands.find(
      (c) => score >= c.minScore && score <= c.maxScore,
    ) ?? spec.quiz.resultsScreen.bands[0];
  return { score, band };
}

/* ------------------------------------------------------------------ */
/*  UI Components — Typeform × Olive style                             */
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

function AnswerCard({
  children,
  isSelected,
  onClick,
  index,
}: {
  children: ReactNode;
  isSelected: boolean;
  onClick: () => void;
  index: number;
}) {
  return (
    <button
      onClick={onClick}
      type="button"
      className={cn(
        "group relative flex w-full items-start gap-4 rounded-2xl border-2 px-5 py-5 text-left transition-all duration-200 ease-out",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-olive-400 focus-visible:ring-offset-2",
        isSelected
          ? "border-olive-500 bg-olive-500 text-white shadow-md shadow-olive-500/20"
          : "border-olive-100 bg-white text-charcoal hover:border-olive-300 hover:bg-olive-50 hover:shadow-sm",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-colors",
          isSelected
            ? "bg-white/20 text-white"
            : "bg-olive-100 text-olive-700 group-hover:bg-olive-200",
        )}
      >
        {index + 1}
      </span>
      <div className="flex-1">{children}</div>
    </button>
  );
}

function ImageAnswerCard({
  children,
  imageUrl,
  imagePrompt,
  imageAlt,
  isSelected,
  onClick,
  index,
}: {
  children: ReactNode;
  imageUrl?: string;
  imagePrompt?: string;
  imageAlt: string;
  isSelected: boolean;
  onClick: () => void;
  index: number;
}) {
  return (
    <button
      onClick={onClick}
      type="button"
      className={cn(
        "group relative w-full overflow-hidden rounded-2xl border-2 text-left transition-all duration-200 ease-out",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-olive-400 focus-visible:ring-offset-2",
        isSelected
          ? "border-olive-500 shadow-lg shadow-olive-500/15"
          : "border-olive-100 bg-white hover:border-olive-300 hover:shadow-md",
      )}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-olive-50">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={imageAlt}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            src={imageUrl}
          />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-olive-400">
            {imagePrompt}
          </div>
        )}
        <div
          className={cn(
            "absolute left-3 top-3 flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold transition-colors",
            isSelected
              ? "bg-olive-500 text-white"
              : "bg-white/90 text-olive-700 backdrop-blur-sm",
          )}
        >
          {index + 1}
        </div>
      </div>
      <div
        className={cn(
          "px-5 py-4",
          isSelected ? "bg-olive-500 text-white" : "bg-white text-charcoal",
        )}
      >
        {children}
      </div>
    </button>
  );
}

function QuestionRenderer({
  question,
  answer,
  onAnswerChange,
  onAutoAdvance,
}: {
  question: QuizQuestion;
  answer: AnswerValue;
  onAnswerChange: (v: AnswerValue) => void;
  onAutoAdvance: () => void;
}) {
  const handleChoice = useCallback(
    (value: AnswerValue, shouldAutoAdvance: boolean) => {
      onAnswerChange(value);
      if (shouldAutoAdvance) {
        setTimeout(onAutoAdvance, 280);
      }
    },
    [onAnswerChange, onAutoAdvance],
  );

  switch (question.type) {
    case "multiple_choice": {
      const selected = Array.isArray(answer) ? answer : [];
      return (
        <div className="flex flex-col gap-3">
          {question.options.map((opt, i) => {
            const isSelected = selected.includes(opt.id);
            return (
              <AnswerCard
                key={opt.id}
                index={i}
                isSelected={isSelected}
                onClick={() => {
                  if (question.allowMultiple) {
                    onAnswerChange(
                      isSelected
                        ? selected.filter((id) => id !== opt.id)
                        : [...selected, opt.id],
                    );
                  } else {
                    handleChoice([opt.id], true);
                  }
                }}
              >
                <div>
                  <p className="text-base font-semibold leading-snug">
                    {opt.label}
                  </p>
                  {opt.helperText ? (
                    <p
                      className={cn(
                        "mt-1 text-sm leading-relaxed",
                        isSelected
                          ? "text-white/80"
                          : "text-muted-foreground",
                      )}
                    >
                      {opt.helperText}
                    </p>
                  ) : null}
                </div>
              </AnswerCard>
            );
          })}
        </div>
      );
    }

    case "image_choice": {
      const selected = Array.isArray(answer) ? answer : [];
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          {question.options.map((opt, i) => {
            const isSelected = selected.includes(opt.id);
            return (
              <ImageAnswerCard
                key={opt.id}
                index={i}
                isSelected={isSelected}
                imageUrl={opt.image.imageUrl}
                imagePrompt={opt.image.imagePrompt}
                imageAlt={opt.image.alt}
                onClick={() => {
                  if (question.allowMultiple) {
                    onAnswerChange(
                      isSelected
                        ? selected.filter((id) => id !== opt.id)
                        : [...selected, opt.id],
                    );
                  } else {
                    handleChoice([opt.id], true);
                  }
                }}
              >
                <p className="text-sm font-semibold">{opt.label}</p>
                {opt.helperText ? (
                  <p
                    className={cn(
                      "mt-1 text-xs leading-relaxed",
                      isSelected
                        ? "text-white/80"
                        : "text-muted-foreground",
                    )}
                  >
                    {opt.helperText}
                  </p>
                ) : null}
              </ImageAnswerCard>
            );
          })}
        </div>
      );
    }

    case "yes_no": {
      const options = [
        { value: true, label: question.yesLabel },
        { value: false, label: question.noLabel },
      ];
      return (
        <div className="flex flex-col gap-3 sm:flex-row">
          {options.map((opt, i) => (
            <AnswerCard
              key={String(opt.value)}
              index={i}
              isSelected={answer === opt.value}
              onClick={() => handleChoice(opt.value, true)}
            >
              <p className="text-base font-semibold">{opt.label}</p>
            </AnswerCard>
          ))}
        </div>
      );
    }

    case "slider": {
      const val = typeof answer === "number" ? answer : question.min;
      return (
        <div className="mx-auto w-full max-w-xl">
          <div className="mb-8 text-center">
            <span className="inline-block rounded-2xl bg-olive-50 px-6 py-3 text-5xl font-bold tracking-tight text-olive-700">
              {val}
            </span>
          </div>
          <div className="relative px-1">
            <input
              type="range"
              min={question.min}
              max={question.max}
              step={question.step}
              value={val}
              onChange={(e) => onAnswerChange(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-olive-100 accent-olive-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-olive-400"
              style={{
                background: `linear-gradient(to right, #5f8537 0%, #5f8537 ${
                  ((val - question.min) / (question.max - question.min)) * 100
                }%, #e3ebd9 ${
                  ((val - question.min) / (question.max - question.min)) * 100
                }%, #e3ebd9 100%)`,
              }}
            />
          </div>
          <div className="mt-6 flex items-center justify-between text-sm font-medium text-olive-600">
            <span>{question.minLabel}</span>
            <span>{question.maxLabel}</span>
          </div>
        </div>
      );
    }

    case "free_text": {
      const text = typeof answer === "string" ? answer : "";
      return (
        <div className="mx-auto w-full max-w-xl">
          <textarea
            value={text}
            onChange={(e) => onAnswerChange(e.target.value)}
            placeholder={question.placeholder ?? "Type your answer here..."}
            maxLength={question.maxLength}
            rows={6}
            className={cn(
              "w-full resize-none rounded-2xl border-2 border-olive-100 bg-white px-5 py-4 text-lg leading-relaxed",
              "text-charcoal placeholder:text-olive-300",
              "transition-all duration-200",
              "focus:border-olive-400 focus:outline-none focus:ring-2 focus:ring-olive-400/20",
            )}
          />
          <div className="mt-3 flex justify-end">
            <span className="text-xs font-medium text-olive-400">
              {text.length}/{question.maxLength}
            </span>
          </div>
        </div>
      );
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Main QuizPlayer                                                    */
/* ------------------------------------------------------------------ */

export function QuizPlayer({ spec }: QuizPlayerProps) {
  const [answers, setAnswers] = useState<AnswerMap>(() =>
    buildInitialAnswers(spec),
  );
  const [history, setHistory] = useState<number[]>([0]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [forcedResultId, setForcedResultId] = useState<string | null>(null);
  const [direction, setDirection] = useState<"forward" | "back">("forward");

  const currentQuestionIndex = history[historyIndex] ?? 0;
  const currentQuestion = spec.quiz.questions[currentQuestionIndex];
  const currentAnswer = answers[currentQuestion.id];
  const totalQuestions = spec.quiz.questions.length;
  const currentStep = showResults ? totalQuestions : historyIndex + 1;
  const progress = totalQuestions <= 1 ? 1 : currentStep / totalQuestions;

  const result = useMemo(
    () => getResultBand(spec, answers, forcedResultId),
    [answers, forcedResultId, spec],
  );

  const goToNext = useCallback(() => {
    const next = resolveNextStep(spec, currentQuestionIndex, currentAnswer);
    if (next.nextIndex === null) {
      setForcedResultId(next.forcedResultId);
      setDirection("forward");
      setShowResults(true);
      return;
    }
    setHistory((h) => {
      const truncated = h.slice(0, historyIndex + 1);
      return [...truncated, next.nextIndex!];
    });
    setHistoryIndex((i) => i + 1);
    setDirection("forward");
    setShowResults(false);
  }, [spec, currentQuestionIndex, currentAnswer, historyIndex]);

  const goToPrevious = useCallback(() => {
    if (showResults) {
      setShowResults(false);
      setForcedResultId(null);
      setDirection("back");
      return;
    }
    if (historyIndex > 0) {
      setHistoryIndex((i) => i - 1);
      setDirection("back");
    }
  }, [showResults, historyIndex]);

  const handleRestart = useCallback(() => {
    setAnswers(buildInitialAnswers(spec));
    setHistory([0]);
    setHistoryIndex(0);
    setShowResults(false);
    setForcedResultId(null);
    setDirection("forward");
  }, [spec]);

  /* Keyboard navigation */
  useEffect(() => {
    if (showResults) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (isQuestionAnswered(currentQuestion, currentAnswer)) {
          goToNext();
        }
      }
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        goToPrevious();
      }
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        if (isQuestionAnswered(currentQuestion, currentAnswer)) {
          goToNext();
        }
      }
      if (
        currentQuestion.type === "multiple_choice" ||
        currentQuestion.type === "image_choice"
      ) {
        const num = parseInt(e.key, 10);
        if (!isNaN(num) && num >= 1 && num <= currentQuestion.options.length) {
          e.preventDefault();
          const opt = currentQuestion.options[num - 1];
          const selected = Array.isArray(currentAnswer) ? currentAnswer : [];
          if (currentQuestion.allowMultiple) {
            setAnswers((a) => ({
              ...a,
              [currentQuestion.id]: selected.includes(opt.id)
                ? selected.filter((id) => id !== opt.id)
                : [...selected, opt.id],
            }));
          } else {
            setAnswers((a) => ({ ...a, [currentQuestion.id]: [opt.id] }));
            setTimeout(goToNext, 280);
          }
        }
      }
      if (currentQuestion.type === "yes_no") {
        if (e.key === "1") {
          e.preventDefault();
          setAnswers((a) => ({ ...a, [currentQuestion.id]: true }));
          setTimeout(goToNext, 280);
        }
        if (e.key === "2") {
          e.preventDefault();
          setAnswers((a) => ({ ...a, [currentQuestion.id]: false }));
          setTimeout(goToNext, 280);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentQuestion, currentAnswer, goToNext, goToPrevious, showResults]);

  /* Fade animation key */
  const animKey = showResults
    ? "results"
    : `${direction}-${currentQuestionIndex}`;

  return (
    <div className="relative flex min-h-screen flex-col bg-cream">
      {/* Top progress bar */}
      <div className="fixed left-0 right-0 top-0 z-50 h-1.5 bg-olive-100">
        <div
          className="h-full bg-olive-500 transition-[width] duration-500 ease-out"
          style={{ width: `${Math.min(progress * 100, 100)}%` }}
        />
      </div>

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-olive-700 transition hover:bg-olive-100"
        >
          <OliveLeafIcon className="h-4 w-4" />
          <span className="hidden sm:inline">{spec.quiz.title}</span>
        </Link>
        {!showResults && (
          <span className="text-sm font-semibold text-olive-400">
            {currentStep} / {totalQuestions}
          </span>
        )}
      </header>

      {/* Main content */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-28 pt-4 sm:px-10">
        <div className="w-full max-w-3xl">
          {showResults ? (
            <div
              key={animKey}
              className="animate-scale-in text-center"
            >
              {/* Result badge */}
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-olive-100 px-4 py-2 text-sm font-semibold text-olive-700">
                <OliveLeafIcon className="h-4 w-4" />
                Your result
              </div>

              <h1 className="text-4xl font-extrabold tracking-tight text-charcoal sm:text-5xl">
                {result.band.title}
              </h1>

              <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
                {result.band.description}
              </p>

              {spec.quiz.resultsScreen.showScore && (
                <div className="mt-8 inline-flex items-center gap-3 rounded-2xl bg-olive-50 px-8 py-4">
                  <span className="text-sm font-medium text-olive-600">
                    {spec.quiz.resultsScreen.scoreLabel ??
                      spec.quiz.scoring.scoreLabel}
                  </span>
                  <span className="text-3xl font-bold text-olive-700">
                    {result.score}
                  </span>
                </div>
              )}

              {result.band.ctaLabel && result.band.ctaHref && (
                <div className="mt-8">
                  <a
                    href={result.band.ctaHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-2xl bg-olive-500 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-olive-500/20 transition hover:bg-olive-600 hover:shadow-xl"
                  >
                    {result.band.ctaLabel}
                  </a>
                </div>
              )}

              <div className="mt-10 flex items-center justify-center gap-3">
                <Button
                  onClick={goToPrevious}
                  variant="outline"
                  className="rounded-xl border-olive-200 text-olive-700 hover:bg-olive-50"
                >
                  Back
                </Button>
                <Button
                  onClick={handleRestart}
                  className="rounded-xl bg-olive-500 text-white hover:bg-olive-600"
                >
                  Retake quiz
                </Button>
              </div>
            </div>
          ) : (
            <div key={animKey} className="animate-slide-in">
              {/* Question header */}
              <div className="mb-10 sm:mb-14">
                <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-olive-400">
                  Question {currentStep}
                </p>
                <h1 className="text-3xl font-bold leading-tight tracking-tight text-charcoal sm:text-4xl">
                  {currentQuestion.title}
                </h1>
                {currentQuestion.description ? (
                  <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                    {currentQuestion.description}
                  </p>
                ) : null}
              </div>

              {/* Question body */}
              <QuestionRenderer
                question={currentQuestion}
                answer={currentAnswer}
                onAnswerChange={(v) =>
                  setAnswers((a) => ({ ...a, [currentQuestion.id]: v }))
                }
                onAutoAdvance={goToNext}
              />
            </div>
          )}
        </div>
      </main>

      {/* Bottom nav bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-olive-100 bg-white/90 px-6 py-5 backdrop-blur-md sm:px-10">
        <div className="mx-auto max-w-3xl">
          {/* Progress bar */}
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between text-sm font-medium text-olive-600">
              <span>
                {showResults
                  ? "Quiz complete"
                  : `Question ${currentStep} of ${totalQuestions}`}
              </span>
              {!showResults && (
                <span className="text-olive-400">
                  {Math.max(totalQuestions - currentStep, 0)} left
                </span>
              )}
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-olive-100">
              <div
                className="h-full rounded-full bg-olive-500 transition-[width] duration-500 ease-out"
                style={{ width: `${Math.min(progress * 100, 100)}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={goToPrevious}
              disabled={!showResults && historyIndex === 0}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition",
                !showResults && historyIndex === 0
                  ? "cursor-not-allowed text-olive-200"
                  : "text-olive-600 hover:bg-olive-50",
              )}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back
            </button>

            {!showResults && (
              <div className="hidden items-center gap-2 text-xs font-medium text-olive-300 sm:flex">
                <span className="rounded-md bg-olive-50 px-1.5 py-0.5">
                  Enter
                </span>
                <span>to continue</span>
              </div>
            )}

            {showResults ? (
              <Button
                onClick={handleRestart}
                className="rounded-xl bg-olive-500 px-6 text-white hover:bg-olive-600"
              >
                Retake quiz
              </Button>
            ) : (
              <Button
                onClick={goToNext}
                disabled={!isQuestionAnswered(currentQuestion, currentAnswer)}
                className={cn(
                  "rounded-xl px-6 font-semibold transition",
                  isQuestionAnswered(currentQuestion, currentAnswer)
                    ? "bg-olive-500 text-white hover:bg-olive-600 shadow-md shadow-olive-500/15"
                    : "cursor-not-allowed bg-olive-100 text-olive-300",
                )}
              >
                {historyIndex === totalQuestions - 1
                  ? "Finish"
                  : "Continue"}
                <svg
                  className="ml-2 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
