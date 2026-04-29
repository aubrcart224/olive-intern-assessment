"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Trash2,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { QuizAnalytics } from "@/components/quiz-analytics";
import { createBrowserClient, type QuizRow, type QuizSessionRow } from "@/lib/supabase";

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
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function computeQuizStats(quizId: string, sessions: QuizSessionRow[]) {
  const quizSessions = sessions.filter((s) => s.quiz_id === quizId);
  const starts = quizSessions.length;
  const completions = quizSessions.filter((s) => s.is_complete).length;
  const rate = starts > 0 ? Math.round((completions / starts) * 100) : 0;

  const bandCounts: Record<string, number> = {};
  quizSessions
    .filter((s) => s.is_complete && s.final_band_id)
    .forEach((s) => {
      bandCounts[s.final_band_id!] = (bandCounts[s.final_band_id!] ?? 0) + 1;
    });

  const totalBandResponses = Object.values(bandCounts).reduce((a, b) => a + b, 0);

  const distribution = Object.entries(bandCounts).map(([bandId, count]) => ({
    bandId,
    count,
    percent: totalBandResponses > 0 ? Math.round((count / totalBandResponses) * 100) : 0,
  }));

  const scoredSessions = quizSessions.filter(
    (s) => s.is_complete && s.final_score !== null,
  );
  const avgScore =
    scoredSessions.length > 0
      ? Math.round(
          scoredSessions.reduce((sum, s) => sum + (s.final_score ?? 0), 0) /
            scoredSessions.length,
        )
      : 0;

  return { starts, completions, rate, distribution, avgScore };
}

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function DashboardPage() {
  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [sessions, setSessions] = useState<QuizSessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const supabase = createBrowserClient();

    async function load() {
      setLoading(true);

      const { data: quizData } = await supabase
        .from("quizzes")
        .select("id, title, description, share_token, is_published, created_at, spec_json")
        .order("created_at", { ascending: false });

      const { data: sessionData } = await supabase
        .from("quiz_sessions")
        .select("id, quiz_id, is_complete, final_score, final_band_id, created_at, completed_at, answers_json")
        .order("created_at", { ascending: false });

      const quizzesArr = (quizData ?? []) as QuizRow[];
      const sessionsArr = (sessionData ?? []) as QuizSessionRow[];

      setQuizzes(quizzesArr);
      setSessions(sessionsArr);
      if (quizzesArr.length > 0) {
        setSelectedQuizId(quizzesArr[0].id);
      }
      setLoading(false);
    }

    load();
  }, []);

  const selectedQuiz = useMemo(
    () => quizzes.find((q) => q.id === selectedQuizId),
    [quizzes, selectedQuizId],
  );

  const quizStats = useMemo(() => {
    if (!selectedQuizId) return null;
    return computeQuizStats(selectedQuizId, sessions);
  }, [selectedQuizId, sessions]);

  const recentCompletions = useMemo(() => {
    if (!selectedQuizId) return [];
    return sessions
      .filter((s) => s.quiz_id === selectedQuizId && s.is_complete)
      .sort(
        (a, b) =>
          new Date(b.completed_at ?? b.created_at).getTime() -
          new Date(a.completed_at ?? a.created_at).getTime(),
      )
      .slice(0, 10);
  }, [selectedQuizId, sessions]);

  const quizIndex = quizzes.findIndex((q) => q.id === selectedQuizId);

  const goNextQuiz = () => {
    if (quizIndex < quizzes.length - 1) {
      setSelectedQuizId(quizzes[quizIndex + 1].id);
    }
  };

  const goPrevQuiz = () => {
    if (quizIndex > 0) {
      setSelectedQuizId(quizzes[quizIndex - 1].id);
    }
  };

  const handleDeleteQuiz = async () => {
    if (!selectedQuizId) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this quiz? This will also delete all associated responses. This action cannot be undone."
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/quiz/delete?id=${selectedQuizId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Failed to delete quiz");
      }

      // Remove deleted quiz from state
      setQuizzes((prev) => prev.filter((q) => q.id !== selectedQuizId));
      setSessions((prev) => prev.filter((s) => s.quiz_id !== selectedQuizId));

      // Select another quiz if available
      const remainingQuizzes = quizzes.filter((q) => q.id !== selectedQuizId);
      if (remainingQuizzes.length > 0) {
        setSelectedQuizId(remainingQuizzes[0].id);
      } else {
        setSelectedQuizId(null);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to delete quiz");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-cream px-6 py-10">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3 text-olive-600">
              <OliveLeafIcon className="h-5 w-5 animate-pulse" />
              <span className="text-lg font-medium">Loading dashboard...</span>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream px-6 py-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col gap-4 rounded-3xl border-2 border-olive-200 bg-white p-8 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-olive-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-olive-700">
                <OliveLeafIcon className="h-3 w-3" />
                Live data
              </span>
              <span className="inline-flex items-center rounded-full border border-olive-200 bg-white px-3 py-1 text-xs font-semibold text-olive-600">
                Supabase
              </span>
            </div>
            <div className="space-y-2">
              <h1 className="text-4xl font-extrabold tracking-tight text-charcoal">
                Quiz funnel dashboard
              </h1>
              <p className="max-w-2xl text-olive-600">
                Select a quiz below to see its performance, responses, and insights.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/">
              <Button
                size="lg"
                variant="outline"
                className="rounded-xl border-olive-200 text-olive-700 hover:bg-olive-50 hover:text-olive-800"
              >
                Back to builder
              </Button>
            </Link>
          </div>
        </div>

        {/* Quiz Selector */}
        <div className="rounded-3xl border-2 border-olive-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={goPrevQuiz}
              disabled={quizIndex <= 0}
              className="shrink-0 self-center rounded-xl bg-olive-50 p-2 text-olive-600 transition hover:bg-olive-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="size-5" />
            </button>

            <div className="flex-1 min-w-0">
              {quizzes.length === 0 ? (
                <p className="text-sm text-olive-500 text-center">
                  No quizzes yet. Create one from the builder.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider text-olive-500">
                      Quiz {quizIndex + 1} of {quizzes.length}
                    </span>
                    {selectedQuiz && (
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                          selectedQuiz.is_published
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-olive-100 text-olive-700"
                        }`}
                      >
                        {selectedQuiz.is_published ? "Live" : "Draft"}
                      </span>
                    )}
                  </div>
                  <select
                    value={selectedQuizId ?? ""}
                    onChange={(e) => setSelectedQuizId(e.target.value)}
                    className="w-full rounded-xl border-2 border-olive-200 bg-white px-4 py-3 text-base font-medium text-charcoal outline-none transition focus:border-olive-400 focus:ring-4 focus:ring-olive-500/10"
                  >
                    {quizzes.map((quiz) => (
                      <option key={quiz.id} value={quiz.id}>
                        {quiz.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <button
              onClick={goNextQuiz}
              disabled={quizIndex >= quizzes.length - 1}
              className="shrink-0 self-center rounded-xl bg-olive-50 p-2 text-olive-600 transition hover:bg-olive-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>

        {selectedQuiz && quizStats && (
          <>
            {/* Quiz Header & Quick Actions */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-charcoal">{selectedQuiz.title}</h2>
                <p className="text-sm text-olive-600">
                  Created {new Date(selectedQuiz.created_at).toLocaleDateString()} · Share token:{" "}
                  <code className="rounded-lg bg-olive-50 px-2 py-0.5 text-xs font-mono text-olive-700">
                    {selectedQuiz.share_token}
                  </code>
                </p>
              </div>
              <div className="flex gap-3">
                <Link href={`/quiz?id=${selectedQuiz.id}`} target="_blank">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl border-olive-200 text-olive-700 hover:bg-olive-50"
                  >
                    <ExternalLink className="mr-2 size-4" />
                    Open quiz
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                  onClick={handleDeleteQuiz}
                  disabled={deleting}
                >
                  <Trash2 className="mr-2 size-4" />
                  {deleting ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </div>

            {/* Stats Grid */}
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="flex flex-col rounded-3xl border-2 border-olive-200 bg-white p-6 shadow-sm transition hover:border-olive-300 h-full">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-olive-500">Starts</p>
                    <p className="text-3xl font-bold text-charcoal">{quizStats.starts}</p>
                  </div>
                  <div className="rounded-2xl bg-olive-50 p-3">
                    <Users className="size-5 text-olive-600" />
                  </div>
                </div>
                <p className="mt-auto pt-4 text-sm text-olive-500">
                  People who opened this quiz
                </p>
              </div>

              <div className="flex flex-col rounded-3xl border-2 border-olive-200 bg-white p-6 shadow-sm transition hover:border-olive-300 h-full">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-olive-500">Completions</p>
                    <p className="text-3xl font-bold text-charcoal">{quizStats.completions}</p>
                  </div>
                  <div className="rounded-2xl bg-olive-50 p-3">
                    <CheckCircle2 className="size-5 text-olive-600" />
                  </div>
                </div>
                <p className="mt-auto pt-4 text-sm text-olive-500">
                  Finished this quiz
                </p>
              </div>

              <div className="flex flex-col rounded-3xl border-2 border-olive-200 bg-white p-6 shadow-sm transition hover:border-olive-300 h-full">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-olive-500">Completion rate</p>
                    <p className="text-3xl font-bold text-charcoal">{quizStats.rate}%</p>
                  </div>
                  <div className="rounded-2xl bg-olive-50 p-3">
                    <Activity className="size-5 text-olive-600" />
                  </div>
                </div>
                <p className="mt-auto pt-4 text-sm text-olive-500">
                  Start to finish conversion
                </p>
              </div>

              <div className="flex flex-col rounded-3xl border-2 border-olive-200 bg-white p-6 shadow-sm transition hover:border-olive-300 h-full">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-olive-500">Avg score</p>
                    <p className="text-3xl font-bold text-charcoal">
                      {quizStats.avgScore > 0 ? `${quizStats.avgScore}%` : "—"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-olive-50 p-3">
                    <BarChart3 className="size-5 text-olive-600" />
                  </div>
                </div>
                <p className="mt-auto pt-4 text-sm text-olive-500">
                  Average across completions
                </p>
              </div>
            </section>

            {/* Per-question responses */}
            <QuizAnalytics
              quizzes={selectedQuiz ? [selectedQuiz] : []}
              sessions={sessions}
            />

            {/* Recent activity for this quiz */}
            <div className="rounded-3xl border-2 border-olive-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-charcoal">Recent activity</h3>
                  <p className="text-sm text-olive-500">
                    Latest completions for this quiz
                  </p>
                </div>
                <span className="inline-flex items-center rounded-full border border-olive-200 bg-white px-3 py-1 text-xs font-semibold text-olive-600">
                  {recentCompletions.length} shown
                </span>
              </div>
              <div className="space-y-3">
                {recentCompletions.length === 0 ? (
                  <div className="rounded-2xl border-2 border-dashed border-olive-200 bg-olive-50/30 p-6 text-sm text-olive-500 text-center">
                    No responses yet. Share the quiz link to start collecting data.
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {recentCompletions.map((session) => (
                      <div
                        className="rounded-2xl border-2 border-olive-200 bg-white p-4 transition hover:border-olive-300 hover:shadow-sm"
                        key={session.id}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-olive-500">
                            {session.final_band_id ?? "No result"}
                          </span>
                          <span className="text-lg font-bold text-olive-700">
                            {session.final_score !== null
                              ? `${session.final_score}%`
                              : "—"}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-olive-400">
                          {session.completed_at
                            ? new Date(session.completed_at).toLocaleString()
                            : new Date(session.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
