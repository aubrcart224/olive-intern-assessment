import Link from "next/link";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Clock3,
  FileText,
  LayoutDashboard,
  Sparkles,
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
import { createServerClient, type QuizRow, type QuizSessionRow } from "@/lib/supabase";

async function fetchDashboardData() {
  const supabase = createServerClient();

  // Fetch all quizzes
  const { data: quizzes } = await supabase
    .from("quizzes")
    .select("id, title, description, share_token, is_published, created_at, spec_json")
    .order("created_at", { ascending: false });

  // Fetch all sessions
  const { data: sessions } = await supabase
    .from("quiz_sessions")
    .select("id, quiz_id, is_complete, final_score, final_band_id, created_at, completed_at")
    .order("created_at", { ascending: false });

  // Fetch recent completed sessions with band info
  const { data: recentCompletions } = await supabase
    .from("quiz_sessions")
    .select("id, quiz_id, final_score, final_band_id, created_at, completed_at")
    .eq("is_complete", true)
    .order("completed_at", { ascending: false })
    .limit(10);

  return {
    quizzes: (quizzes ?? []) as QuizRow[],
    sessions: (sessions ?? []) as QuizSessionRow[],
    recentCompletions: (recentCompletions ?? []) as QuizSessionRow[],
  };
}

function computeGlobalStats(quizzes: QuizRow[], sessions: QuizSessionRow[]) {
  const totalStarts = sessions.length;
  const totalCompletions = sessions.filter((s) => s.is_complete).length;
  const completionRate =
    totalStarts > 0 ? Math.round((totalCompletions / totalStarts) * 100) : 0;
  const activeQuizzes = quizzes.filter((q) => q.is_published).length;

  return {
    totalStarts,
    totalCompletions,
    completionRate,
    activeQuizzes,
  };
}

function computeQuizStats(quizId: string, sessions: QuizSessionRow[]) {
  const quizSessions = sessions.filter((s) => s.quiz_id === quizId);
  const starts = quizSessions.length;
  const completions = quizSessions.filter((s) => s.is_complete).length;
  const rate = starts > 0 ? Math.round((completions / starts) * 100) : 0;

  // Result distribution
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

  return { starts, completions, rate, distribution };
}

export default async function DashboardPage() {
  const { quizzes, sessions, recentCompletions } = await fetchDashboardData();
  const stats = computeGlobalStats(quizzes, sessions);

  const overviewCards = [
    {
      title: "Quiz starts",
      value: stats.totalStarts.toLocaleString(),
      description: "People who opened a live quiz",
      icon: Users,
    },
    {
      title: "Completions",
      value: stats.totalCompletions.toLocaleString(),
      description: "Finished quiz sessions across all links",
      icon: CheckCircle2,
    },
    {
      title: "Completion rate",
      value: `${stats.completionRate}%`,
      description: "Average completion from start to result screen",
      icon: Activity,
    },
    {
      title: "Active quizzes",
      value: stats.activeQuizzes.toString(),
      description: "Published quiz funnels available to share",
      icon: FileText,
    },
  ];

  // Pick the most popular quiz for result distribution
  const quizStatsMap = new Map(
    quizzes.map((q) => [q.id, computeQuizStats(q.id, sessions)]),
  );

  const mostPopularQuiz = quizzes.reduce((best, current) => {
    const bestStats = quizStatsMap.get(best?.id ?? "");
    const currentStats = quizStatsMap.get(current.id);
    return (currentStats?.starts ?? 0) > (bestStats?.starts ?? 0) ? current : best;
  }, quizzes[0]);

  const popularDistribution = mostPopularQuiz
    ? quizStatsMap.get(mostPopularQuiz.id)?.distribution ?? []
    : [];

  const activityFeed = recentCompletions.map((c) => {
    const quiz = quizzes.find((q) => q.id === c.quiz_id);
    const scoreText = c.final_score !== null ? `${c.final_score}%` : "";
    const bandText = c.final_band_id ? ` — ${c.final_band_id}` : "";
    return `Completed "${quiz?.title ?? "Unknown quiz"}"${bandText} ${scoreText}`;
  });

  return (
    <main className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
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
                Real-time analytics for generated quizzes, completions,
                and response insights.
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

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {overviewCards.map((card) => {
            const Icon = card.icon;

            return (
              <Card key={card.title}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <div className="space-y-1">
                    <CardDescription>{card.title}</CardDescription>
                    <CardTitle className="text-3xl">{card.value}</CardTitle>
                  </div>
                  <div className="rounded-2xl bg-muted p-3">
                    <Icon className="size-5 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {card.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>Recent quizzes</CardTitle>
                  <CardDescription>
                    Live and draft quiz funnels with response counts.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {quizzes.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground">
                  No quizzes created yet. Generate one from the builder page.
                </div>
              ) : (
                quizzes.map((quiz) => {
                  const qs = quizStatsMap.get(quiz.id) ?? {
                    starts: 0,
                    completions: 0,
                    rate: 0,
                  };

                  return (
                    <div
                      className="grid gap-4 rounded-2xl border border-border p-4 lg:grid-cols-[minmax(0,1.5fr)_120px_120px_120px]"
                      key={quiz.id}
                    >
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{quiz.title}</p>
                          <Badge
                            variant={quiz.is_published ? "success" : "outline"}
                          >
                            {quiz.is_published ? "Live" : "Draft"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(quiz.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                          Starts
                        </p>
                        <p className="mt-2 text-lg font-semibold">{qs.starts}</p>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                          Completion
                        </p>
                        <p className="mt-2 text-lg font-semibold">
                          {qs.rate}%
                        </p>
                      </div>

                      <div className="flex items-center lg:justify-end">
                        <Link href={`/quiz?id=${quiz.id}`}>
                          <Button variant="outline" size="sm">
                            Open
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Results distribution</CardTitle>
                <CardDescription>
                  {mostPopularQuiz
                    ? `Outcome split for "${mostPopularQuiz.title}"`
                    : "Outcome split for the most active quiz."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {popularDistribution.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No completed responses yet.
                  </p>
                ) : (
                  popularDistribution.map((item) => (
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
                  Stage-by-stage for all quizzes combined.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  {
                    label: "Visited quiz",
                    value: 100,
                    count: stats.totalStarts,
                  },
                  {
                    label: "Completed quiz",
                    value: stats.completionRate,
                    count: stats.totalCompletions,
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
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-muted p-3">
                  <LayoutDashboard className="size-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle>Per-quiz breakdown</CardTitle>
                  <CardDescription>
                    Starts and completions by quiz.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-muted-foreground">
                {quizzes.slice(0, 5).map((quiz) => {
                  const qs = quizStatsMap.get(quiz.id) ?? {
                    starts: 0,
                    completions: 0,
                  };
                  return (
                    <li
                      key={quiz.id}
                      className="flex items-center justify-between gap-3"
                    >
                      <span className="font-medium text-foreground">
                        {quiz.title}
                      </span>
                      <span>
                        {qs.completions}/{qs.starts}
                      </span>
                    </li>
                  );
                })}
                {quizzes.length === 0 && (
                  <li>No quizzes to display.</li>
                )}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-muted p-3">
                  <BarChart3 className="size-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle>Score insights</CardTitle>
                  <CardDescription>
                    Average scores across completed quizzes.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {quizzes.length > 0 ? (
                quizzes.slice(0, 3).map((quiz) => {
                  const quizSessions = sessions.filter(
                    (s) => s.quiz_id === quiz.id && s.is_complete && s.final_score !== null,
                  );
                  const avgScore =
                    quizSessions.length > 0
                      ? Math.round(
                          quizSessions.reduce((sum, s) => sum + (s.final_score ?? 0), 0) /
                            quizSessions.length,
                        )
                      : 0;

                  return (
                    <div
                      className="rounded-2xl bg-muted/50 p-4"
                      key={quiz.id}
                    >
                      <p className="text-sm font-medium">{quiz.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Avg score: {avgScore}%
                        {" "}
                        ({quizSessions.length} completions)
                      </p>
                      <Progress className="mt-2" value={avgScore} />
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">
                  No data yet. Create and share a quiz to collect responses.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-muted p-3">
                  <Clock3 className="size-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle>Recent activity</CardTitle>
                  <CardDescription>
                    Latest completions and results.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {activityFeed.length > 0 ? (
                activityFeed.map((item, index) => (
                  <div
                    className="flex items-start gap-3 rounded-2xl border border-border p-3"
                    key={index}
                  >
                    <Sparkles className="mt-0.5 size-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{item}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No recent activity. Share a quiz to get responses.
                </p>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>Individual responses</CardTitle>
                  <CardDescription>
                    Latest completed quiz sessions with scores and outcomes.
                  </CardDescription>
                </div>
                <Badge variant="outline">{recentCompletions.length} total</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentCompletions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground">
                  No responses yet. Share a quiz link to start collecting data.
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {recentCompletions.map((session) => {
                    const quiz = quizzes.find((q) => q.id === session.quiz_id);
                    return (
                      <div
                        className="rounded-2xl border border-border p-4"
                        key={session.id}
                      >
                        <p className="text-sm font-medium">
                          {quiz?.title ?? "Unknown quiz"}
                        </p>
                        <div className="mt-3 flex items-center justify-between">
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
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
