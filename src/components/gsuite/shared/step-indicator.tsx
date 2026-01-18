type Step = string;

export function StepIndicator<T extends Step>({
  steps,
  currentStep,
}: {
  steps: T[];
  currentStep: T;
}) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((step, i) => (
        <div key={String(step)} className="flex items-center gap-2">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
              currentStep === step
                ? "bg-primary text-primary-foreground"
                : i < steps.indexOf(currentStep)
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {i + 1}
          </div>
          <span
            className={`text-sm capitalize ${currentStep === step ? "font-medium" : "text-muted-foreground"}`}
          >
            {String(step)}
          </span>
          {i < steps.length - 1 && <div className="h-px w-8 bg-border" />}
        </div>
      ))}
    </div>
  );
}
