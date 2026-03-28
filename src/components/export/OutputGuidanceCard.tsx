import { Card, CardContent } from "@/components/ui/card";
import type { ExportGuidance } from "@/lib/output-guidance";
import { cn } from "@/lib/utils";

interface OutputGuidanceCardProps {
  guidance: ExportGuidance;
}

export function OutputGuidanceCard({ guidance }: OutputGuidanceCardProps) {
  return (
    <Card className="overflow-hidden bg-card/40">
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.95fr)_minmax(0,0.8fr)] md:items-start">
          <div className="space-y-6 md:min-w-0">
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Estimated result</p>
              <div className="flex items-baseline gap-2.5">
                <span className="text-3xl font-bold tracking-tight">{guidance.estimatedSizeLabel}</span>
                <span className="text-xs font-medium text-muted-foreground/70">from {guidance.sourceSizeLabel}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-8">
              <Stat label="Resolution" value={guidance.resolutionLabel} />
              <Stat label="Length" value={guidance.durationLabel} />
            </div>
          </div>

          <div className="space-y-6 md:min-w-0 md:border-l md:border-border/20 md:pl-8">
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Target format</p>
              <div className="inline-flex max-w-full rounded-lg border border-border/40 bg-muted/30 px-2.5 py-1.5 text-xs font-semibold text-foreground/80">
                {guidance.codecLabel}
              </div>
            </div>
          </div>

          <div className="space-y-6 md:min-w-0 md:border-l md:border-border/20 md:pl-8">
            <div className="flex flex-wrap gap-8 sm:gap-10">
              <SupportItem label="iPhone" value={guidance.compatibility.iphone} />
              <SupportItem label="Web" value={guidance.compatibility.web} />
              <SupportItem label="TV" value={guidance.compatibility.tv} />
            </div>
          </div>
        </div>


      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

function SupportItem({ label, value }: { label: string; value: "Yes" | "Maybe" | "No" }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{label}</span>
      <span
        className={cn(
          "text-xs font-bold transition-colors",
          value === "Yes" && "text-success",
          value === "Maybe" && "text-warning",
          value === "No" && "text-destructive",
        )}
      >
        {value}
      </span>
    </div>
  );
}
