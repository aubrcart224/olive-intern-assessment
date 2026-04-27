import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
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
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const overviewCards = [
  {
    title: "Quiz starts",
    value: "1,248",
    change: "+12.4%",
    description: "People who opened a live quiz this week",
    icon: Users,
  },
  {
    title: "Completions",
    value: "842",
    change: "+8.1%",
    description: "Finished quiz sessions across all links",
    icon: CheckCircle2,
  },
  {
    title: "Completion rate",
    value: "67.4%",
    change: "+4.3%",
    description: "Average completion from start to result screen",
    icon: Activity,
  },
  {
    title: "Active quizzes",
    value: "14",
    change: "+3",
    description: "Published quiz funnels available to share",
    icon: FileText,
  },
];

const recentQuizzes = [
  {
    name: "What Kind of Grocery Shopper Are You?",
    status: "Live",
    responses: 342,
    completionRate: 72,
    updated: "5 min ago",
  },
  {
    name: "Ultra-Processed Food Checkup",
    status: "Draft",
    responses: 0,
    completionRate: 0,
    updated: "18 min ago",
  },
  {
    name: "New Olive User Onboarding",
    status: "Live",
    responses: 197,
    completionRate: 64,
    updated: "1 hour ago",
  },
  {
    name: "Family Meal Planning Quiz",
    status: "Live",
    responses: 121,
    completionRate: 59,
    updated: "3 hours ago",
  },
];

const resultBreakdown = [
  { label: "Label Detective", value: 48 },
  { label: "Trying to Improve", value: 31 },
  { label: "Needs a Reset", value: 21 },
];

const activityFeed = [
  "A new quiz was generated from a plain-English prompt",
  "Three live quiz links were shared in the last hour",
  "Completion rate increased after shortening question flow",
  "Most recent result distribution skewed toward mid-tier outcomes",
];

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <div className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Dashboard scaffold</Badge>
              <Badge variant="outline">shadcn-style UI</Badge>
            </div>
            <div className="space-y-2">
              <h1 className="text-4xl font-semibold tracking-tight">
                Quiz funnel dashboard
              </h1>
              <p className="max-w-2xl text-muted-foreground">
                Placeholder analytics surface for generated quizzes, completions,
                and response insights. Wire this up to real Supabase data next.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link href="/">
              <Button size="lg" variant="outline">
                Back to builder
              </Button>
            </Link>
            <Button size="lg">
              Create dashboard filters
            </Button>
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
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-emerald-700">{card.change}</span>
                    <span className="text-muted-foreground">{card.description}</span>
                  </div>
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
                    Scaffolded list of live and draft quiz funnels.
                  </CardDescription>
                </div>
                <Button variant="secondary">View all quizzes</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentQuizzes.map((quiz) => (
                <div
                  className="grid gap-4 rounded-2xl border border-border p-4 lg:grid-cols-[minmax(0,1.5fr)_120px_120px_120px]"
                  key={quiz.name}
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{quiz.name}</p>
                      <Badge
                        variant={quiz.status === "Live" ? "success" : "outline"}
                      >
                        {quiz.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Updated {quiz.updated}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Responses
                    </p>
                    <p className="mt-2 text-lg font-semibold">{quiz.responses}</p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Completion
                    </p>
                    <p className="mt-2 text-lg font-semibold">
                      {quiz.completionRate}%
                    </p>
                  </div>

                  <div className="flex items-center lg:justify-end">
                    <Button variant="outline">
                      Open
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Results distribution</CardTitle>
                <CardDescription>
                  Placeholder outcome split for a selected quiz.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {resultBreakdown.map((item) => (
                  <div className="space-y-2" key={item.label}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium">{item.label}</span>
                      <span className="text-muted-foreground">{item.value}%</span>
                    </div>
                    <Progress value={item.value} />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Completion funnel</CardTitle>
                <CardDescription>
                  Stage-by-stage scaffold for the live quiz journey.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: "Visited quiz", value: 100 },
                  { label: "Started question 1", value: 82 },
                  { label: "Reached final question", value: 69 },
                  { label: "Viewed result", value: 67 },
                ].map((step) => (
                  <div className="space-y-2" key={step.label}>
                    <div className="flex items-center justify-between text-sm">
                      <span>{step.label}</span>
                      <span className="text-muted-foreground">{step.value}%</span>
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
                  <CardTitle>Dashboard modules</CardTitle>
                  <CardDescription>
                    Suggested tiles to flesh out next.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li>Creator-level quiz summaries</li>
                <li>Individual response explorer</li>
                <li>Sharable links and attribution</li>
                <li>Daily completion trends</li>
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
                  <CardTitle>Quick insights</CardTitle>
                  <CardDescription>
                    Placeholder cards for generated analytics callouts.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl bg-muted/50 p-4">
                <p className="text-sm font-medium">
                  Most users drop off on question 3
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Consider shortening the copy or changing the answer layout.
                </p>
              </div>
              <div className="rounded-2xl bg-muted/50 p-4">
                <p className="text-sm font-medium">
                  Personality-style results convert best
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Fun labels appear to increase completion and sharing.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-muted p-3">
                  <Clock3 className="size-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle>Activity feed</CardTitle>
                  <CardDescription>
                    System events and recent creator actions.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {activityFeed.map((item) => (
                <div
                  className="flex items-start gap-3 rounded-2xl border border-border p-3"
                  key={item}
                >
                  <Sparkles className="mt-0.5 size-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">{item}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Next scaffolding steps</CardTitle>
                <CardDescription>
                  Suggested places to connect this page to real product data.
                </CardDescription>
              </div>
              <Badge variant="outline">Ready for Supabase wiring</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Hook in live metrics",
                body: "Replace placeholders with counts for starts, completions, and response distribution.",
                icon: Activity,
              },
              {
                title: "Add filters",
                body: "Support filtering by quiz, date range, and published status.",
                icon: ArrowUpRight,
              },
              {
                title: "Store responses",
                body: "Connect question answers and final outcomes to a real response explorer.",
                icon: FileText,
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <div
                  className="rounded-2xl border border-border bg-muted/30 p-5"
                  key={item.title}
                >
                  <Icon className="size-5 text-muted-foreground" />
                  <h3 className="mt-4 font-medium">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
                </div>
              );
            })}
          </CardContent>
          <CardFooter className="justify-between border-t border-border pt-6 text-sm text-muted-foreground">
            <span>Scaffold only — no live data connected yet.</span>
            <span>Route: `/dashboard`</span>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
