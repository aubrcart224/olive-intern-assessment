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

  if (loading) {
    return (
      <main className="min-h-screen bg-background px-6 py-10">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-center py-20">
            <div className="text-muted-foreground">Loading dashboard...</div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Live data</Badge>
              <Badge variant="outline">Supabase</Badge>
            </div>
            <div className="space-y-2">
              <h1 className="text-4xl font-semibold tracking-tight">
                Quiz funnel dashboard
              </h1>
              <p className="max-w-2xl text-muted-foreground">
                Select a quiz below to see its performance, responses, and insights.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/">
              <Button size="lg" variant="outline">
                Back to builder
              </Button>
            </Link>
          </div>
        </div>

        {/* Quiz Selector */}
        <Card>
          <CardContent className="py-6">
            <div className="flex items-center gap-4">
              <button
                onClick={goPrevQuiz}
                disabled={quizIndex <= 0}
                className="rounded-xl bg-muted p-2 text-muted-foreground transition hover:bg-muted/80 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="size-5" />
              </button>

              <div className="flex-1">
                {quizzes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center">
                    No quizzes yet. Create one from the builder.
                  </p>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase tracking-wider text-muted-foreground">
                        Quiz {quizIndex + 1} of {quizzes.length}
                      </span>
                      {selectedQuiz && (
                        <Badge variant={selectedQuiz.is_published ? "success" : "outline"}>
                          {selectedQuiz.is_published ? "Live" : "Draft"}
                        </Badge>
                      )}
                    </div>
                    <select
                      value={selectedQuizId ?? ""}
                      onChange={(e) => setSelectedQuizId(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base font-medium text-foreground outline-none ring-offset-background focus:ring-2 focus:ring-olive-300"
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
                className="rounded-xl bg-muted p-2 text-muted-foreground transition hover:bg-muted/80 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight className="size-5" />
              </button>
            </div>
          </CardContent>
        </Card>

        {selectedQuiz && quizStats && (
          <>
            {/* Quiz Header & Quick Actions */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold">{selectedQuiz.title}</h2>
                <p className="text-sm text-muted-foreground">
                  Created {new Date(selectedQuiz.created_at).toLocaleDateString()} · Share token: {" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                    {selectedQuiz.share_token}
                  </code>
                </p>
              </div>
              <div className="flex gap-3">
                <Link href={`/quiz?id=${selectedQuiz.id}`} target="_blank">
                  <Button variant="outline" size="sm">
                    <ExternalLink className="mr-2 size-4" />
                    Open quiz
                  </Button>
                </Link>
              </div>
            </div>

            {/* Stats Grid */}
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <div className="space-y-1">
                    <CardDescription>Starts</CardDescription>
                    <CardTitle className="text-3xl">{quizStats.starts}</CardTitle>
                  </div>
                  <div className="rounded-2xl bg-muted p-3">
                    <Users className="size-5 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    People who opened this quiz
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <div className="space-y-1">
                    <CardDescription>Completions</CardDescription>
                    <CardTitle className="text-3xl">{quizStats.completions}</CardTitle>
                  </div>
                  <div className="rounded-2xl bg-muted p-3">
                    <CheckCircle2 className="size-5 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Finished this quiz
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <div className="space-y-1">
                    <CardDescription>Completion rate</CardDescription>
                    <CardTitle className="text-3xl">{quizStats.rate}%</CardTitle>
                  </div>
                  <div className="rounded-2xl bg-muted p-3">
                    <Activity className="size-5 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Start to finish conversion
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <div className="space-y-1">
                    <CardDescription>Avg score</CardDescription>
                    <CardTitle className="text-3xl">
                      {quizStats.avgScore > 0 ? `${quizStats.avgScore}%` : "—"}
                    </CardTitle>
                  </div>
                  <div className="rounded-2xl bg-muted p-3">
                    <BarChart3 className="size-5 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Average across completions
                  </p>
                </CardContent>
              </Card>
            </section>

            {/* Two column: Results Distribution + Completion Funnel */}
            <section className="grid gap-6 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Results distribution</CardTitle>
                  <CardDescription>
                    How people scored on this quiz
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {quizStats.distribution.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground text-center">
                      No completed responses yet.
                    </div>
                  ) : (
                    quizStats.distribution.map((item) => (
                      <div className="space-y-2" key={item.bandId}>
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="font-medium">{item.bandId}</span>
                          <span className="text-muted-foreground">
                            {item.count} ({item.percent}%)
                          </span>
                        </div>
                        <Progress value={item.percent} />
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Completion funnel</CardTitle>
                  <CardDescription>
                    Stage-by-stage for this quiz
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    {
                      label: "Visited quiz",
                      value: 100,
                      count: quizStats.starts,
                    },
                    {
                      label: "Completed quiz",
                      value: quizStats.rate,
                      count: quizStats.completions,
                    },
                  ].map((step) => (
                    <div className="space-y-2" key={step.label}>
                      <div className="flex items-center justify-between text-sm">
                        <span>{step.label}</span>
                        <span className="text-muted-foreground">
                          {step.count} ({step.value}%)
                        </span>
                      </div>
                      <Progress value={step.value} />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>

            {/* Per-question responses */}
            <QuizAnalytics
              quizzes={selectedQuiz ? [selectedQuiz] : []}
              sessions={sessions}
            />

            {/* Recent activity for this quiz */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>Recent activity</CardTitle>
                    <CardDescription>
                      Latest completions for this quiz
                    </CardDescription>
                  </div>
                  <Badge variant="outline">{recentCompletions.length} shown</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentCompletions.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground text-center">
                    No responses yet. Share the quiz link to start collecting data.
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {recentCompletions.map((session) => (
                      <div
                        className="rounded-2xl border border-border p-4"
                        key={session.id}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {session.final_band_id ?? "No result"}
                          </span>
                          <span className="text-lg font-bold text-olive-700">
                            {session.final_score !== null
                              ? `${session.final_score}%`
                              : "—"}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {session.completed_at
                            ? new Date(session.completed_at).toLocaleString()
                            : new Date(session.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </main>
  );
}
