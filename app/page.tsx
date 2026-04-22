import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="max-w-xl w-full space-y-8 text-center">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Olive Interview
          </p>
          <h1 className="text-4xl font-semibold tracking-tight">Text-to-Quiz</h1>
          <p className="text-lg text-muted-foreground">
            Scaffold ready. Read the assessment brief, then start building.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 pt-4">
          <Button disabled variant="secondary">
            Your UI goes here
          </Button>
          <p className="text-sm text-muted-foreground">
            See <code className="font-mono">README.md</code> for setup and
            <code className="font-mono"> DECISIONS.md</code> for what to document.
          </p>
        </div>
      </div>
    </main>
  );
}
