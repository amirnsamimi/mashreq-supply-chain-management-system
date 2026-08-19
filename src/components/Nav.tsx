import Link from "next/link";
import { logoutAction } from "@/lib/actions";
import { runRulesThrottled, unreadCount } from "@/lib/notifications";
import { CalendarToggle } from "./CalendarToggle";
import { NavHeight } from "./NavHeight";
import { ThemeToggle } from "./ThemeToggle";

import { PERMISSIONS, type PermissionKey } from "@/lib/permissions";

/** منو از روی همان فهرست دسترسی‌ها ساخته می‌شود تا از هم جدا نیفتند */
const links = PERMISSIONS.filter((p) => p.key !== "notifications").map((p) => ({
  href: p.path,
  label: p.label,
  key: p.key as PermissionKey,
}));

export async function Nav({
  active,
  user,
  permissions = [],
}: {
  active: string;
  user?: string;
  permissions?: PermissionKey[];
}) {
  // موتور اعلان حداکثر هر 10 دقیقه یک‌بار، همراه با بارگذاری صفحه اجرا می‌شود
  await runRulesThrottled().catch(() => null);
  const unread = await unreadCount().catch(() => 0);

  return (
    <header className="app-nav border-b border-[var(--geist-border)] bg-[var(--geist-background)]/90 backdrop-blur">
      <NavHeight />
      <div className="mx-auto max-w-[1400px] px-4 sm:px-5">
        <div className="flex items-center gap-3 py-2.5">
          <span className="truncate text-sm font-semibold tracking-tight">
            پیگیری فاکتور و ارسال
          </span>
          <div className="mr-auto flex shrink-0 items-center gap-2 sm:gap-3">
            {user && (
              <span className="hidden text-xs text-[var(--geist-secondary)] sm:inline">{user}</span>
            )}
            <Link
              href="/notifications"
              aria-label={unread > 0 ? `${unread} اعلان خوانده‌نشده` : "اعلان‌ها"}
              className="relative flex h-7 w-7 items-center justify-center rounded-full text-[var(--geist-secondary)] transition hover:bg-[var(--geist-gray-100)] hover:text-[var(--geist-foreground)]"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
                <path d="M13.7 21a2 2 0 0 1-3.4 0" />
              </svg>
              {unread > 0 && (
                <span className="num absolute -top-0.5 -left-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--geist-red)] px-1 text-[0.6rem] font-medium leading-none text-white">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Link>
            <CalendarToggle />
            <ThemeToggle />
            <form action={logoutAction}>
              <button className="text-xs text-[var(--geist-tertiary)] transition hover:text-[var(--geist-foreground)]">
                خروج
              </button>
            </form>
          </div>
        </div>

        <nav className="scroll-hidden -mx-4 flex items-center gap-1 px-4 pb-2 sm:mx-0 sm:px-0">
          {links
            .filter((l) => permissions.includes(l.key))
            .map((l) => (
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

export async function Page({
  active,
  title,
  action,
  user,
  permissions,
  children,
}: {
  active: string;
  title: React.ReactNode;
  action?: React.ReactNode;
  user?: string;
  permissions?: PermissionKey[];
  children: React.ReactNode;
}) {
  return (
    <>
      {await Nav({ active, user, permissions })}
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
