import { cn } from "@/lib/utils";

interface MuvloMarkProps {
  className?: string;
}

export function MuvloMark({ className }: MuvloMarkProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-foreground", className)}
      aria-hidden="true"
    >
      <path
        d="M 18,82 L 34,22 L 50,56 L 66,22 L 82,82"
        stroke="currentColor"
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="50" cy="82" r="7" fill="currentColor" />
    </svg>
  );
}
