import { cn } from "@/lib/utils";

interface MuvloMarkProps {
  className?: string;
}

export function MuvloMark({ className }: MuvloMarkProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex aspect-square items-center justify-center rounded-xl border bg-muted/40 text-accent",
        className,
      )}
    >
      <svg viewBox="0 0 64 64" className="h-[72%] w-[72%]" fill="none">
        <path
          d="M17 36C17 24.402 26.402 15 38 15H47"
          stroke="currentColor"
          opacity="0.95"
          strokeLinecap="round"
          strokeWidth="6"
        />
        <path
          d="M47 49H38C29.716 49 23 42.284 23 34"
          stroke="currentColor"
          opacity="0.95"
          strokeLinecap="round"
          strokeWidth="6"
        />
        <path
          d="M21 21L32.4 32L21 43"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="6"
        />
        <circle cx="47" cy="15" r="4" fill="currentColor" opacity="0.95" />
        <circle cx="47" cy="49" r="4" fill="currentColor" opacity="0.75" />
      </svg>
    </div>
  );
}
