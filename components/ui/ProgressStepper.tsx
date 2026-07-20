interface Step {
  label: string;
  icon: string;
}

interface ProgressStepperProps {
  steps: Step[];
  current: number;
}

export default function ProgressStepper({ steps, current }: ProgressStepperProps) {
  return (
    <ol className="mb-6 flex items-center">
      {steps.map((step, i) => {
        const stepNumber = i + 1;
        const done = stepNumber < current;
        const active = stepNumber === current;
        return (
          <li key={step.label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full text-base transition ${
                  active
                    ? "bg-brand-600 text-white shadow-pop"
                    : done
                      ? "bg-lagoon-500 text-white"
                      : "bg-gray-100 text-gray-400"
                }`}
              >
                {done ? "✓" : step.icon}
              </div>
              <span
                className={`text-[10px] font-bold ${active ? "text-brand-700" : "text-gray-400"}`}
              >
                {step.label}
              </span>
            </div>
            {stepNumber < steps.length && (
              <div className={`mx-1 h-1 flex-1 rounded-full ${done ? "bg-lagoon-400" : "bg-gray-100"}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
