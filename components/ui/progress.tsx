import { cn } from "@/lib/utils";

function Progress({
  className,
  value,
}: {
  className?: string;
  value: number;
}) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div
        className="h-full rounded-full bg-foreground transition-[width]"
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}

export { Progress };
