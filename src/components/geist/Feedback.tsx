/* اجزای بازخورد Geist: Badge، Status، Note، Skeleton، Empty */

export type BadgeTone = "gray" | "blue" | "green" | "amber" | "red" | "purple";

const toneStyles: Record<BadgeTone, { bg: string; fg: string }> = {
  gray: { bg: "var(--geist-gray-100)", fg: "var(--geist-secondary)" },
  blue: { bg: "var(--geist-blue-lighter)", fg: "var(--geist-blue-text)" },
  green: { bg: "var(--geist-green-lighter)", fg: "var(--geist-green-text)" },
  amber: { bg: "var(--geist-amber-lighter)", fg: "var(--geist-amber-text)" },
  red: { bg: "var(--geist-red-lighter)", fg: "var(--geist-red-text)" },
  purple: { bg: "var(--geist-purple-lighter)", fg: "var(--geist-purple-text)" },
};

export function Badge({
  tone = "gray",
  dot = false,
  children,
}: {
  tone?: BadgeTone;
  dot?: boolean;
  children: React.ReactNode;
}) {
  const t = toneStyles[tone];
  return (
    <span
      style={{ background: t.bg, color: t.fg }}
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-[0.6875rem] font-medium leading-none"
    >
      {dot && <span style={{ background: t.fg }} className="h-1.5 w-1.5 rounded-full" />}
      {children}
    </span>
  );
}

export function Note({
  type = "default",
  title,
  children,
}: {
  type?: "default" | "success" | "warning" | "error";
  title?: string;
  children: React.ReactNode;
}) {
  const map = {
    default: toneStyles.blue,
    success: toneStyles.green,
    warning: toneStyles.amber,
    error: toneStyles.red,
  } as const;
  const t = map[type];
  return (
    <div
      style={{ background: t.bg, color: t.fg }}
      className="rounded-[var(--geist-radius)] px-3.5 py-2.5 text-sm leading-6"
    >
      {title && <b className="ml-1.5 font-semibold">{title}:</b>}
      {children}
    </div>
  );
}

export function Skeleton({
  width = "100%",
  height = 20,
  rounded = "var(--geist-radius)",
}: {
  width?: number | string;
  height?: number | string;
  rounded?: string;
}) {
  return (
    <span
      style={{
        width,
        height,
        borderRadius: rounded,
        backgroundImage:
          "linear-gradient(270deg, var(--geist-gray-100), var(--geist-gray-200), var(--geist-gray-200), var(--geist-gray-100))",
        backgroundSize: "400% 100%",
        animation: "geist-shimmer 8s ease-in-out infinite",
      }}
      className="block"
    />
  );
}

export function Empty({
  title,
  children,
  action,
}: {
  title?: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
      {title && <p className="text-sm font-medium">{title}</p>}
      {children && <p className="text-sm text-[var(--geist-tertiary)]">{children}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Card({
  title,
  action,
  footer,
  children,
  className = "",
}: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`overflow-hidden rounded-[var(--geist-radius-lg)] border border-[var(--geist-border)] bg-[var(--geist-background)] ${className}`}
    >
      {title && (
        <div className="flex items-center justify-between gap-3 border-b border-[var(--geist-border)] px-4 py-3">
          <h2 className="text-sm font-medium">{title}</h2>
          {action}
        </div>
      )}
      {children}
      {footer && (
        <div className="border-t border-[var(--geist-border)] bg-[var(--geist-background-subtle)] px-4 py-2.5 text-xs text-[var(--geist-secondary)]">
          {footer}
        </div>
      )}
    </section>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "default" | "warn" | "good";
}) {
  const tones = {
    default: "",
    warn: "text-[var(--geist-red-text)]",
    good: "text-[var(--geist-green-text)]",
  };
  return (
    <div className="rounded-[var(--geist-radius-lg)] border border-[var(--geist-border)] bg-[var(--geist-background)] p-4">
      <div className="text-xs text-[var(--geist-secondary)]">{label}</div>
      <div className={`num mt-1.5 text-2xl font-semibold tracking-tight sm:text-[1.65rem] ${tones[tone]}`}>
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-[var(--geist-tertiary)]">{hint}</div>}
    </div>
  );
}
