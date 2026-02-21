"use client";

import type { ProgressStepId } from "@/lib/sse";

export interface ProgressStep {
  id: ProgressStepId;
  label: string;
  status: "pending" | "active" | "completed" | "error";
  detail?: string;
}

const STEP_WEIGHTS: Record<ProgressStepId, number> = {
  keywords: 10,
  github: 30,
  tavily: 30,
  ranking: 15,
  report: 15,
};

function calcPercent(steps: ProgressStep[]): number {
  let total = 0;
  for (const step of steps) {
    const w = STEP_WEIGHTS[step.id] ?? 0;
    if (step.status === "completed" || step.status === "error") {
      total += w;
    } else if (step.status === "active") {
      total += w * 0.5;
    }
  }
  return Math.round(total);
}

export function AnalysisProgress({ steps }: { steps: ProgressStep[] }) {
  const percent = calcPercent(steps);

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-strong/85">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="text-xs tabular-nums text-muted">{percent}%</span>
      </div>

      {/* Step list */}
      {steps.map((step) => (
        <div key={step.id} className="flex items-start gap-3">
          <div className="mt-0.5 flex-shrink-0">
            {step.status === "completed" && (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-success-20 text-success">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            )}
            {step.status === "active" && (
              <div className="flex h-5 w-5 items-center justify-center">
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-outline/50 border-t-primary" />
              </div>
            )}
            {step.status === "pending" && (
              <div className="flex h-5 w-5 items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-outline/70" />
              </div>
            )}
            {step.status === "error" && (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-danger-20 text-danger">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className={`text-sm ${
                step.status === "active"
                  ? "text-foreground font-medium"
                  : step.status === "completed"
                    ? "text-muted"
                    : step.status === "error"
                      ? "text-danger"
                      : "text-outline"
              }`}
            >
              {step.label}
            </p>
            {step.detail && (
              <p className="mt-0.5 text-xs text-muted">{step.detail}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
