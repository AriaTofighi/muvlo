import type { ExportGuidance } from "@/lib/output-guidance";
import { cn } from "@/lib/utils";

interface OutputGuidanceContentProps {
  guidance: ExportGuidance;
  className?: string;
}

export function OutputGuidanceContent({ guidance, className }: OutputGuidanceContentProps) {
  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-8 gap-y-3 px-1.5 py-2", className)}>
      <div className="flex items-baseline gap-2">
        <span className="text-[11.5px] font-semibold text-muted-foreground/90 lowercase leading-none">estimated output</span>
        <span className="text-sm font-bold text-foreground tracking-tight leading-none">{guidance.estimatedSizeLabel}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-[11.5px] font-semibold text-muted-foreground/90 lowercase leading-none">source size</span>
        <span className="text-sm font-bold text-foreground tracking-tight leading-none">{guidance.sourceSizeLabel}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-[11.5px] font-semibold text-muted-foreground/90 lowercase leading-none">resolution</span>
        <span className="text-sm font-bold text-foreground tracking-tight leading-none">{guidance.resolutionLabel}</span>
      </div>
    </div>
  );
}
