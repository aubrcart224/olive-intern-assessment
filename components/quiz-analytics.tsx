"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { type QuizQuestion, type QuizSpec } from "@/lib/quiz-spec";
import { type QuizRow, type QuizSessionRow } from "@/lib/supabase";

type AnswerValue = boolean | number | string | string[] | null;

function parseQuizSpecSafe(specJson: Record<string, unknown>): QuizSpec | null {
  try {
    // spec_json was validated before storage, so we can safely cast after a shallow check
    const hasVersion = specJson.version === "1.0";
    const hasQuiz =
      typeof specJson.quiz === "object" &&
      specJson.quiz !== null &&
      Array.isArray((specJson.quiz as Record<string, unknown>).questions);
    if (hasVersion && hasQuiz) {
      return specJson as unknown as QuizSpec;
    }
    return null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Aggregate answers for a single question                            */
/* ------------------------------------------------------------------ */

function aggregateQuestionAnswers(
  question: QuizQuestion,
  sessions: QuizSessionRow[],
) {
  switch (question.type) {
    case "multiple_choice": {
      const counts: Record<string, number> = {};
      question.options.forEach((o) => (counts[o.id] = 0));
      sessions.forEach((s) => {
        const ans = s.answers_json[question.id];
        if (Array.isArray(ans)) {
          ans.forEach((id: string) => {
            if (counts[id] !== undefined) counts[id]++;
          });
        }
      });
      return question.options.map((o) => ({
        label: o.label,
        count: counts[o.id] ?? 0,
      }));
    }
    case "yes_no": {
      let yes = 0;
      let no = 0;
      sessions.forEach((s) => {
        const ans = s.answers_json[question.id];
        if (ans === true) yes++;
        else if (ans === false) no++;
      });
      return [
        { label: question.yesLabel, count: yes },
        { label: question.noLabel, count: no },
      ];
    }
    case "slider": {
      // Group into 5 bins for a clean histogram
      const bins = 5;
      const range = question.max - question.min;
      const step = range / bins;
      const bucketCounts = Array.from({ length: bins }, () => 0);
      const bucketLabels = Array.from({ length: bins }, (_, i) => {
        const lo = Math.round(question.min + i * step);
        const hi = Math.round(question.min + (i + 1) * step);
        return `${lo}-${hi}`;
      });
      sessions.forEach((s) => {
        const ans = s.answers_json[question.id];
        if (typeof ans === "number") {
          const idx = Math.min(
            bins - 1,
            Math.floor(((ans - question.min) / range) * bins),
          );
          bucketCounts[idx]++;
        }
      });
      return bucketLabels.map((label, i) => ({ label, count: bucketCounts[i] }));
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Chart colors                                                       */
/* ------------------------------------------------------------------ */

const CHART_COLORS = ["#5f8537", "#7da353", "#a3bf83", "#c9d8b5", "#4a6a2a", "#314221"];

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function QuestionChart({
  question,
  sessions,
}: {
  question: QuizQuestion;
  sessions: QuizSessionRow[];
}) {
  const data = useMemo(
    () => aggregateQuestionAnswers(question, sessions),
    [question, sessions],
  );

  const chartData = data as { label: string; count: number }[];
  const total = chartData.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-olive-500">
          {total} response{total !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e3ebd9" />
            <XAxis
              dataKey="label"
              tick={{ fill: "#6b7b5e", fontSize: 12 }}
              axisLine={{ stroke: "#c9d8b5" }}
              tickLine={false}
              interval={0}
              angle={chartData.length > 4 ? -30 : 0}
              textAnchor={chartData.length > 4 ? "end" : "middle"}
              height={chartData.length > 4 ? 60 : 30}
            />
            <YAxis
              tick={{ fill: "#6b7b5e", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ fill: "#f4f7f0" }}
              contentStyle={{
                borderRadius: "12px",
                border: "1px solid #e3ebd9",
                background: "#fff",
                color: "#2d2d2d",
                fontSize: "13px",
              }}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {chartData.map((_, i) => (
                <Cell key={`cell-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Analytics Component                                           */
/* ------------------------------------------------------------------ */

export function QuizAnalytics({
  quizzes,
  sessions,
}: {
  quizzes: QuizRow[];
  sessions: QuizSessionRow[];
}) {
  const [activeQuizId, setActiveQuizId] = useState<string | null>(
    quizzes[0]?.id ?? null,
  );
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Derive effective selected quiz id:
  // - If only 1 quiz passed, always use it (parent controls selection)
  // - Otherwise use internal state, synced to first quiz on mount / when current becomes invalid
  const selectedQuizId = useMemo(() => {
    if (quizzes.length === 1) return quizzes[0]!.id;
    if (quizzes.length === 0) return null;
    // Multiple quizzes: ensure active id is still valid
    const valid = quizzes.some((q) => q.id === activeQuizId);
    return valid ? activeQuizId : quizzes[0]!.id;
  }, [quizzes, activeQuizId]);

  const selectedQuiz = useMemo(
    () => quizzes.find((q) => q.id === selectedQuizId),
    [quizzes, selectedQuizId],
  );

  const spec = useMemo(() => {
    if (!selectedQuiz) return null;
    return parseQuizSpecSafe(selectedQuiz.spec_json);
  }, [selectedQuiz]);

  const quizSessions = useMemo(() => {
    if (!selectedQuizId) return [];
    return sessions.filter(
      (s) => s.quiz_id === selectedQuizId && s.is_complete,
    );
  }, [sessions, selectedQuizId]);

  const questions = spec?.quiz.questions ?? [];
  const currentQuestion = questions[currentQuestionIndex];

  // Reset question index when quiz changes
  useEffect(() => {
    setCurrentQuestionIndex(0);
  }, [selectedQuizId]);

  const goToPrevious = () => {
    setCurrentQuestionIndex((prev) => Math.max(0, prev - 1));
  };

  const goToNext = () => {
    setCurrentQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1));
  };

  const goToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
  };

  if (quizzes.length === 0) {
    return (
      <div className="rounded-3xl border-2 border-olive-200 bg-white p-6 shadow-sm">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-charcoal">Per-question responses</h3>
          <p className="text-sm text-olive-500">
            Create a quiz to see answer breakdowns.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {quizzes.length > 1 && (
        <div className="rounded-3xl border-2 border-olive-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-bold text-charcoal">Per-question responses</h3>
              <p className="text-sm text-olive-500">
                Select a quiz to see how people answered each question.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {quizzes.map((quiz) => (
                <button
                  key={quiz.id}
                  onClick={() => {
                    setActiveQuizId(quiz.id);
                    setCurrentQuestionIndex(0);
                  }}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                    selectedQuizId === quiz.id
                      ? "bg-olive-500 text-white shadow-sm"
                      : "bg-olive-50 text-olive-700 hover:bg-olive-100"
                  }`}
                >
                  {quiz.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {spec && questions.length > 0 && (
        <div className="space-y-4">
          {/* Question Navigation */}
          <div className="rounded-3xl border-2 border-olive-200 bg-white p-4 shadow-sm">
            <div className="grid grid-cols-3 items-center gap-4">
              <div className="flex justify-start">
                <button
                  onClick={goToPrevious}
                  disabled={currentQuestionIndex === 0}
                  className="rounded-lg bg-olive-100 px-4 py-2 text-sm font-medium text-olive-700 transition hover:bg-olive-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ← Previous
                </button>
              </div>

              <div className="flex flex-col items-center gap-2">
                <span className="text-sm text-olive-500">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </span>
                {/* Question dots */}
                <div className="flex gap-1.5">
                  {questions.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => goToQuestion(idx)}
                      className={`h-2 rounded-full transition-all ${
                        idx === currentQuestionIndex
                          ? "w-6 bg-olive-500"
                          : "w-2 bg-olive-200 hover:bg-olive-300"
                      }`}
                      aria-label={`Go to question ${idx + 1}`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={goToNext}
                  disabled={currentQuestionIndex === questions.length - 1}
                  className="rounded-lg bg-olive-100 px-4 py-2 text-sm font-medium text-olive-700 transition hover:bg-olive-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next →
                </button>
              </div>
            </div>
          </div>

          {/* Single Question Display */}
          <div className="flex flex-col rounded-3xl border-2 border-olive-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <div className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-olive-100 text-sm font-bold text-olive-700">
                  {currentQuestionIndex + 1}
                </span>
                <div className="flex-1">
                  <h3 className="text-lg font-bold leading-relaxed text-charcoal">
                    {currentQuestion.title}
                  </h3>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full border border-olive-200 bg-white px-2.5 py-0.5 text-xs font-medium capitalize text-olive-700">
                      {currentQuestion.type.replace("_", " ")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex-1">
              <QuestionChart question={currentQuestion} sessions={quizSessions} />
            </div>
          </div>
        </div>
      )}

      {!spec && selectedQuiz && (
        <div className="rounded-3xl border-2 border-olive-200 bg-white p-6 shadow-sm">
          <div className="py-8 text-center text-sm text-olive-500">
            Could not load quiz spec for analysis.
          </div>
        </div>
      )}
    </div>
  );
}
