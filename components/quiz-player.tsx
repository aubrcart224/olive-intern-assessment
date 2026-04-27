"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type QuizQuestion, type QuizSpec } from "@/lib/quiz-spec";

type AnswerValue = boolean | number | string | string[] | null;
type AnswerMap = Record<string, AnswerValue>;

type QuizPlayerProps = {
  spec: QuizSpec;
};

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
    spec.quiz.questions.map((question) => [question.id, getInitialAnswer(question)]),
  );
}

function isQuestionAnswered(question: QuizQuestion, answer: AnswerValue) {
  if (!question.required) {
    return true;
  }

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
      if (!Array.isArray(answer)) {
        return 0;
      }

      return question.options.reduce((total, option) => {
        return total + (answer.includes(option.id) ? option.scoreDelta : 0);
      }, 0);
    }
    case "yes_no":
      return typeof answer === "boolean"
        ? answer
          ? question.scoreDelta.yes
          : question.scoreDelta.no
        : 0;
    case "slider":
      if (typeof answer !== "number") {
        return 0;
      }

      return (
        question.scoreBands.find(
          (band) => answer >= band.minValue && answer <= band.maxValue,
        )?.scoreDelta ?? 0
      );
    case "free_text": {
      if (typeof answer !== "string" || answer.trim().length === 0) {
        return 0;
      }

      if (question.evaluation.mode === "manual_review") {
        return question.evaluation.defaultScoreDelta;
      }

      const normalized = answer.toLowerCase();
      const matchingBucket = question.evaluation.keywordBuckets.find((bucket) =>
        bucket.keywords.some((keyword) => normalized.includes(keyword.toLowerCase())),
      );

      return matchingBucket?.scoreDelta ?? question.evaluation.fallbackScoreDelta;
    }
  }
}

function matchesBranchCondition(question: QuizQuestion, answer: AnswerValue, rule: NonNullable<QuizQuestion["branching"]>["rules"][number]) {
  const condition = rule.condition;

  if (
    condition.selectedOptionId &&
    (!Array.isArray(answer) || !answer.includes(condition.selectedOptionId))
  ) {
    return false;
  }

  if (
    condition.selectedOptionIdsAll &&
    (!Array.isArray(answer) ||
      !condition.selectedOptionIdsAll.every((optionId) => answer.includes(optionId)))
  ) {
    return false;
  }

  if (
    condition.equalsBoolean !== undefined &&
    (typeof answer !== "boolean" || answer !== condition.equalsBoolean)
  ) {
    return false;
  }

  if (condition.minValue !== undefined && (typeof answer !== "number" || answer < condition.minValue)) {
    return false;
  }

  if (condition.maxValue !== undefined && (typeof answer !== "number" || answer > condition.maxValue)) {
    return false;
  }

  if (
    condition.textIncludesAny &&
    (typeof answer !== "string" ||
      !condition.textIncludesAny.some((value) =>
        answer.toLowerCase().includes(value.toLowerCase()),
      ))
  ) {
    return false;
  }

  return true;
}

function resolveNextStep(spec: QuizSpec, currentIndex: number, answer: AnswerValue) {
  const question = spec.quiz.questions[currentIndex];
  const branching = question.branching;

  if (branching) {
    const matchedRule = branching.rules.find((rule) =>
      matchesBranchCondition(question, answer, rule),
    );
    const destination = matchedRule?.destination ?? branching.defaultDestination;

    if (destination?.kind === "question" && destination.targetId) {
      const nextIndex = spec.quiz.questions.findIndex(
        (candidate) => candidate.id === destination.targetId,
      );

      if (nextIndex >= 0) {
        return { nextIndex, forcedResultId: null };
      }
    }

    if (destination?.kind === "result") {
      return { nextIndex: null, forcedResultId: destination.targetId ?? null };
    }

    if (destination?.kind === "end") {
      return { nextIndex: null, forcedResultId: null };
    }
  }

  const nextIndex = currentIndex + 1;
  return {
    nextIndex: nextIndex < spec.quiz.questions.length ? nextIndex : null,
    forcedResultId: null,
  };
}

function getResultBand(spec: QuizSpec, answers: AnswerMap, forcedResultId: string | null) {
  if (forcedResultId) {
    const forcedBand = spec.quiz.resultsScreen.bands.find(
      (band) => band.id === forcedResultId,
    );

    if (forcedBand) {
      return {
        score: spec.quiz.questions.reduce((total, question) => {
          return total + getQuestionScore(question, answers[question.id]);
        }, 0),
        band: forcedBand,
      };
    }
  }

  const score = spec.quiz.questions.reduce((total, question) => {
    return total + getQuestionScore(question, answers[question.id]);
  }, 0);

  const band =
    spec.quiz.resultsScreen.bands.find(
      (candidate) => score >= candidate.minScore && score <= candidate.maxScore,
    ) ?? spec.quiz.resultsScreen.bands[0];

  return { score, band };
}

function ChoiceCard({
  children,
  isSelected,
  onClick,
}: {
  children: ReactNode;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "w-full rounded-2xl border p-4 text-left transition",
        isSelected
          ? "border-primary bg-primary/10"
          : "border-border bg-background hover:bg-muted/60",
      )}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function QuestionContent({
  answer,
  onAnswerChange,
  question,
}: {
  answer: AnswerValue;
  onAnswerChange: (nextValue: AnswerValue) => void;
  question: QuizQuestion;
}) {
  switch (question.type) {
    case "multiple_choice":
    case "image_choice": {
      const selectedIds = Array.isArray(answer) ? answer : [];

      return (
        <div className="grid gap-3 sm:grid-cols-2">
          {question.options.map((option) => {
            const isSelected = selectedIds.includes(option.id);

            return (
              <ChoiceCard
                isSelected={isSelected}
                key={option.id}
                onClick={() => {
                  if (question.allowMultiple) {
                    onAnswerChange(
                      isSelected
                        ? selectedIds.filter((id) => id !== option.id)
                        : [...selectedIds, option.id],
                    );
                    return;
                  }

                  onAnswerChange([option.id]);
                }}
              >
                {"image" in option && option.image ? (
                  <div className="mb-3 overflow-hidden rounded-xl border border-border bg-muted/40">
                    {option.image.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt={option.image.alt}
                        className="h-40 w-full object-cover"
                        src={option.image.imageUrl}
                      />
                    ) : (
                      <div className="flex h-40 items-center justify-center px-4 text-center text-sm text-muted-foreground">
                        {option.image.imagePrompt}
                      </div>
                    )}
                  </div>
                ) : null}
                <p className="font-medium">{option.label}</p>
                {option.helperText ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {option.helperText}
                  </p>
                ) : null}
              </ChoiceCard>
            );
          })}
        </div>
      );
    }
    case "yes_no":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { value: true, label: question.yesLabel },
            { value: false, label: question.noLabel },
          ].map((option) => (
            <ChoiceCard
              isSelected={answer === option.value}
              key={String(option.value)}
              onClick={() => onAnswerChange(option.value)}
            >
              <p className="font-medium">{option.label}</p>
            </ChoiceCard>
          ))}
        </div>
      );
    case "slider":
      return (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-background p-6">
            <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>{question.minLabel}</span>
              <span>{question.maxLabel}</span>
            </div>
            <input
              className="w-full accent-foreground"
              max={question.max}
              min={question.min}
              onChange={(event) => onAnswerChange(Number(event.target.value))}
              step={question.step}
              type="range"
              value={typeof answer === "number" ? answer : question.min}
            />
            <div className="mt-4 text-center text-3xl font-semibold">
              {typeof answer === "number" ? answer : question.min}
            </div>
          </div>
        </div>
      );
    case "free_text":
      return (
        <textarea
          className="min-h-48 w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          maxLength={question.maxLength}
          onChange={(event) => onAnswerChange(event.target.value)}
          placeholder={question.placeholder ?? "Type your answer here..."}
          value={typeof answer === "string" ? answer : ""}
        />
      );
  }
}

export function QuizPlayer({ spec }: QuizPlayerProps) {
  const [answers, setAnswers] = useState<AnswerMap>(() => buildInitialAnswers(spec));
  const [history, setHistory] = useState<number[]>([0]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [forcedResultId, setForcedResultId] = useState<string | null>(null);

  const currentQuestionIndex = history[historyIndex] ?? 0;
  const currentQuestion = spec.quiz.questions[currentQuestionIndex];
  const currentAnswer = answers[currentQuestion.id];
  const totalQuestions = spec.quiz.questions.length;
  const currentStep = showResults ? totalQuestions : historyIndex + 1;
  const remainingQuestions = Math.max(totalQuestions - currentStep, 0);
  const progress = totalQuestions <= 1 ? 1 : currentStep / totalQuestions;

  const result = useMemo(
    () => getResultBand(spec, answers, forcedResultId),
    [answers, forcedResultId, spec],
  );

  const goToPrevious = () => {
    if (showResults) {
      setShowResults(false);
      setForcedResultId(null);
      return;
    }

    if (historyIndex > 0) {
      setHistoryIndex((current) => current - 1);
    }
  };

  const goToNext = () => {
    const nextStep = resolveNextStep(spec, currentQuestionIndex, currentAnswer);

    if (nextStep.nextIndex === null) {
      setForcedResultId(nextStep.forcedResultId);
      setShowResults(true);
      return;
    }

    const nextQuestionIndex = nextStep.nextIndex;

    setHistory((currentHistory) => {
      const truncated = currentHistory.slice(0, historyIndex + 1);
      return [...truncated, nextQuestionIndex];
    });
    setHistoryIndex((current) => current + 1);
    setShowResults(false);
  };

  const handleRestart = () => {
    setAnswers(buildInitialAnswers(spec));
    setHistory([0]);
    setHistoryIndex(0);
    setShowResults(false);
    setForcedResultId(null);
  };

  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="mx-auto mb-6 flex w-full max-w-4xl justify-start">
        <Link
          className="inline-flex items-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium transition hover:bg-muted"
          href="/"
        >
          Back to quiz generator
        </Link>
      </div>
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-4xl items-center justify-center pb-36">
        {showResults ? (
          <section className="w-full rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-muted-foreground">
              Results
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight">
              {result.band.title}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground">
              {result.band.description}
            </p>
            {spec.quiz.resultsScreen.showScore ? (
              <p className="mt-6 text-lg font-medium">
                {spec.quiz.resultsScreen.scoreLabel ?? spec.quiz.scoring.scoreLabel}:{" "}
                {result.score}
              </p>
            ) : null}
            <div className="mt-8 flex items-center justify-center gap-3">
              <Button onClick={goToPrevious} type="button" variant="outline">
                Back
              </Button>
              <Button onClick={handleRestart} type="button">
                Restart quiz
              </Button>
            </div>
          </section>
        ) : (
          <section className="w-full rounded-3xl border border-border bg-card p-8 shadow-sm">
            <div className="space-y-6">
              <div className="space-y-3 text-center">
                <p className="text-sm font-medium uppercase tracking-[0.25em] text-muted-foreground">
                  Question {currentStep}
                </p>
                <h1 className="text-3xl font-semibold tracking-tight">
                  {currentQuestion.title}
                </h1>
                {currentQuestion.description ? (
                  <p className="mx-auto max-w-2xl text-muted-foreground">
                    {currentQuestion.description}
                  </p>
                ) : null}
              </div>

              <QuestionContent
                answer={currentAnswer}
                onAnswerChange={(nextValue) =>
                  setAnswers((current) => ({
                    ...current,
                    [currentQuestion.id]: nextValue,
                  }))
                }
                question={currentQuestion}
              />
            </div>
          </section>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-6 flex justify-center px-6">
        <div className="w-full max-w-2xl rounded-3xl border border-border bg-card/95 p-4 shadow-lg backdrop-blur">
          <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {showResults ? "Quiz complete" : `Question ${currentStep} of ${totalQuestions}`}
            </span>
            <span>{remainingQuestions} left</span>
          </div>
          <div className="mb-4 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-foreground transition-[width]"
              style={{ width: `${Math.min(progress * 100, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <Button
              disabled={!showResults && historyIndex === 0}
              onClick={goToPrevious}
              type="button"
              variant="outline"
            >
              Previous question
            </Button>
            <Button
              disabled={!showResults && !isQuestionAnswered(currentQuestion, currentAnswer)}
              onClick={showResults ? handleRestart : goToNext}
              type="button"
            >
              {showResults
                ? "Retake quiz"
                : historyIndex === totalQuestions - 1
                  ? "Finish quiz"
                  : "Next question"}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
