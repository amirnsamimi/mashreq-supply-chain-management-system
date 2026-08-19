import Link from "next/link";
import { logoutAction } from "@/lib/actions";

export function Nav({ active, user }: { active: string; user?: string }) {
  const links = [
    { href: "/", label: "داشبورد" },
    { href: "/invoices", label: "فاکتورها" },
    { href: "/shipments", label: "پارت‌های ارسال" },
    { href: "/users", label: "کاربران" },
  ];
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--geist-border)] bg-[var(--geist-background)]/85 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] items-center gap-1 px-5 py-3">
        <span className="ml-5 text-sm font-semibold tracking-tight">پیگیری فاکتور و ارسال</span>
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-[var(--geist-radius)] px-3 py-1.5 text-sm transition ${
              active === l.href
                ? "bg-[var(--geist-gray-100)] font-medium text-[var(--geist-foreground)]"
                : "text-[var(--geist-secondary)] hover:text-[var(--geist-foreground)]"
            }`}
          >
            {l.label}
          </Link>
        ))}
        <div className="mr-auto flex items-center gap-3">
          {user && <span className="text-xs text-[var(--geist-secondary)]">{user}</span>}
          <form action={logoutAction}>
            <button className="text-xs text-[var(--geist-tertiary)] transition hover:text-[var(--geist-foreground)]">
              خروج
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

export function Page({
  active,
  title,
  action,
  user,
  children,
}: {
  active: string;
  title: React.ReactNode;
  action?: React.ReactNode;
  user?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <Nav active={active} user={user} />
      <main className="mx-auto max-w-[1400px] px-5 py-7">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <div className="flex items-center gap-2">{action}</div>
        </div>
        {children}
      </main>
    </>
  );
}

export function Card({
  title,
  action,
  children,
  className = "",
}: {
  title?: React.ReactNode;
  action?: React.ReactNode;
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
      <div className={`num mt-1.5 text-[1.65rem] font-semibold tracking-tight ${tones[tone]}`}>
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-[var(--geist-tertiary)]">{hint}</div>}
    </div>
  );
}

const badgeTones: Record<string, string> = {
  "تسویه‌شده": "green",
  "بخشی پرداخت‌شده": "amber",
  "سررسید گذشته": "red",
  "پرداخت‌نشده": "gray",
  "باز": "blue",
  "بسته": "gray",
  "تحویل‌شده": "green",
  "در مسیر": "blue",
  "تحویل به کارگو": "purple",
  "در انتظار تحویل به کارگو": "gray",
  "کاملاً دریافت‌شده": "green",
  "کامل ارسال‌شده": "blue",
  "بخشی ارسال‌شده": "amber",
  "ارسال‌نشده": "gray",
  "فعال": "green",
  "غیرفعال": "gray",
};

export function Badge({ children }: { children: string }) {
  const tone = badgeTones[children] ?? "gray";
  const style =
    tone === "gray"
      ? { background: "var(--geist-gray-100)", color: "var(--geist-secondary)" }
      : {
          background: `var(--geist-${tone}-lighter)`,
          color: `var(--geist-${tone}-text)`,
        };
  return (
    <span
      style={style}
      className="inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[0.6875rem] font-medium leading-none"
    >
      {children}
    </span>
  );
}

export function Btn({
  children,
  variant = "primary",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
}) {
  const styles = {
    primary:
      "bg-[var(--geist-foreground)] text-[var(--geist-background)] hover:opacity-85 px-3.5 py-2 text-sm font-medium",
    ghost:
      "border border-[var(--geist-border)] hover:border-[var(--geist-foreground)] px-3.5 py-2 text-sm font-medium",
    danger:
      "text-[var(--geist-red-text)] hover:bg-[var(--geist-red-lighter)] px-2 py-1 text-xs font-medium",
  };
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-1.5 rounded-[var(--geist-radius)] transition disabled:opacity-50 ${styles[variant]} ${rest.className ?? ""}`}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label>{label}</label>
      {children}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 py-12 text-center text-sm text-[var(--geist-tertiary)]">{children}</div>
  );
}
