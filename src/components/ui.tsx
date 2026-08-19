import Link from "next/link";
import { logoutAction } from "@/lib/actions";

export function Nav({ active }: { active: string }) {
  const links = [
    { href: "/", label: "داشبورد" },
    { href: "/invoices", label: "فاکتورها" },
    { href: "/shipments", label: "پارت‌های ارسال" },
  ];
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center gap-1 px-4 py-3">
        <span className="ml-4 font-bold">پیگیری فاکتور و ارسال</span>
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              active === l.href
                ? "bg-gray-900 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {l.label}
          </Link>
        ))}
        <form action={logoutAction} className="mr-auto">
          <button className="text-xs text-gray-400 hover:text-gray-700">خروج</button>
        </form>
      </div>
    </header>
  );
}

export function Page({
  active,
  title,
  action,
  children,
}: {
  active: string;
  title: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <>
      <Nav active={active} />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold">{title}</h1>
          {action}
        </div>
        {children}
      </main>
    </>
  );
}

export function Card({
  title,
  children,
  className = "",
}: {
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-gray-200 bg-white ${className}`}>
      {title && (
        <h2 className="border-b border-gray-200 px-4 py-3 text-sm font-semibold">{title}</h2>
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
    default: "text-gray-900",
    warn: "text-red-600",
    good: "text-emerald-600",
  };
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`num mt-1 text-2xl font-bold ${tones[tone]}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-gray-400">{hint}</div>}
    </div>
  );
}

const badgeTones: Record<string, string> = {
  "تسویه‌شده": "bg-emerald-50 text-emerald-700 ring-emerald-200",
  "بخشی پرداخت‌شده": "bg-amber-50 text-amber-700 ring-amber-200",
  "سررسید گذشته": "bg-red-50 text-red-700 ring-red-200",
  "پرداخت‌نشده": "bg-gray-100 text-gray-600 ring-gray-200",
  "باز": "bg-blue-50 text-blue-700 ring-blue-200",
  "بسته": "bg-gray-100 text-gray-600 ring-gray-200",
  "تحویل‌شده": "bg-emerald-50 text-emerald-700 ring-emerald-200",
  "در مسیر": "bg-blue-50 text-blue-700 ring-blue-200",
  "تحویل به کارگو": "bg-indigo-50 text-indigo-700 ring-indigo-200",
  "در انتظار تحویل به کارگو": "bg-gray-100 text-gray-600 ring-gray-200",
  "کاملاً دریافت‌شده": "bg-emerald-50 text-emerald-700 ring-emerald-200",
  "کامل ارسال‌شده": "bg-blue-50 text-blue-700 ring-blue-200",
  "بخشی ارسال‌شده": "bg-amber-50 text-amber-700 ring-amber-200",
  "ارسال‌نشده": "bg-gray-100 text-gray-600 ring-gray-200",
};

export function Badge({ children }: { children: string }) {
  const tone = badgeTones[children] ?? "bg-gray-100 text-gray-600 ring-gray-200";
  return (
    <span className={`inline-block rounded-md px-2 py-0.5 text-xs ring-1 ${tone}`}>
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
    primary: "bg-gray-900 text-white hover:bg-gray-700",
    ghost: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
    danger: "text-red-500 hover:text-red-700 text-xs",
  };
  return (
    <button
      {...rest}
      className={`rounded-lg px-3 py-2 text-sm font-medium transition ${styles[variant]} ${rest.className ?? ""}`}
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
  return <div className="px-4 py-8 text-center text-sm text-gray-400">{children}</div>;
}
