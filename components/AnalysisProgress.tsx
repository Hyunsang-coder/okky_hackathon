"use client";

import type { ProgressStepId } from "@/lib/sse";

export interface ProgressStep {
  id: ProgressStepId;
  label: string;
  status: "pending" | "active" | "completed" | "error";
  detail?: string;
}

export function AnalysisProgress({ steps }: { steps: ProgressStep[] }) {
  return (
    <div className="space-y-3">
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
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground/80" />
              </div>
            )}
            {step.status === "pending" && (
              <div className="flex h-5 w-5 items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-foreground/20" />
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
                    ? "text-foreground/60"
                    : step.status === "error"
                      ? "text-danger"
                      : "text-foreground/30"
              }`}
            >
              {step.label}
            </p>
            {step.detail && (
              <p className="mt-0.5 text-xs text-foreground/40">{step.detail}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
