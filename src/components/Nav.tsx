import Link from "next/link";
import { logoutAction } from "@/lib/actions";
import { ThemeToggle } from "./ThemeToggle";

const links = [
  { href: "/", label: "داشبورد" },
  { href: "/products", label: "کالاها" },
  { href: "/invoices", label: "فاکتورها" },
  { href: "/payments", label: "پرداخت‌ها" },
  { href: "/shipments", label: "پارت‌های ارسال" },
  { href: "/import", label: "ورود داده" },
  { href: "/history", label: "تاریخچه" },
  { href: "/users", label: "کاربران" },
];

export function Nav({ active, user }: { active: string; user?: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--geist-border)] bg-[var(--geist-background)]/85 backdrop-blur">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-5">
        <div className="flex items-center gap-3 py-2.5">
          <span className="truncate text-sm font-semibold tracking-tight">
            پیگیری فاکتور و ارسال
          </span>
          <div className="mr-auto flex shrink-0 items-center gap-2 sm:gap-3">
            {user && (
              <span className="hidden text-xs text-[var(--geist-secondary)] sm:inline">{user}</span>
            )}
            <ThemeToggle />
            <form action={logoutAction}>
              <button className="text-xs text-[var(--geist-tertiary)] transition hover:text-[var(--geist-foreground)]">
                خروج
              </button>
            </form>
          </div>
        </div>

        <nav className="scroll-x -mx-4 flex items-center gap-1 px-4 pb-2 sm:mx-0 sm:px-0">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`shrink-0 rounded-[var(--geist-radius)] px-3 py-1.5 text-sm transition ${
                active === l.href
                  ? "bg-[var(--geist-gray-100)] font-medium text-[var(--geist-foreground)]"
                  : "text-[var(--geist-secondary)] hover:text-[var(--geist-foreground)]"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
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
      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-5 sm:py-7">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 sm:mb-6">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
          <div className="flex items-center gap-2">{action}</div>
        </div>
        {children}
      </main>
    </>
  );
}
