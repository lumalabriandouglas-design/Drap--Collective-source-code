import { cn } from "@/lib/utils";

/** One stitch. The house seal. */
export function Mark({
  className,
  light = false,
}: {
  className?: string;
  light?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden
      className={cn("shrink-0", className)}
    >
      <circle
        cx="16"
        cy="16"
        r="14.25"
        fill="none"
        stroke={light ? "rgba(246,241,234,0.55)" : "#C4A574"}
        strokeWidth="0.9"
      />
      <path
        d="M11.2 22 V10.2 h6.1 c2.7 0 4.4 1.55 4.4 3.85 0 2.2-1.55 3.7-4.15 3.7 H13.4"
        fill="none"
        stroke={light ? "#F6F1EA" : "#1C1917"}
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11.2 22 h9.6"
        fill="none"
        stroke={light ? "#C4A574" : "#C4A574"}
        strokeWidth="1.15"
        strokeLinecap="round"
      />
    </svg>
  );
}
