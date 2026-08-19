"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { Notification, Severity } from "@/lib/notification-types";
import {
  dismissAll,
  dismissNotification,
  markAllRead,
  markRead,
  runRulesNow,
} from "@/lib/actions";
import { Badge, Button, Card, Empty, Note } from "@/components/geist";
import type { BadgeTone } from "@/components/geist/Feedback";

const severityTone: Record<Severity, BadgeTone> = {
  info: "blue",
  warning: "amber",
  critical: "red",
};
const severityLabel: Record<Severity, string> = {
  info: "اطلاع",
  warning: "هشدار",
  critical: "بحرانی",
};

function when(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "همین حالا";
  if (mins < 60) return `${mins} دقیقه پیش`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ساعت پیش`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} روز پیش`;
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "short" }).format(new Date(iso));
}

export function RunNowButton() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <span className="flex items-center gap-2">
      {msg && <span className="text-xs text-[var(--geist-secondary)]">{msg}</span>}
      <Button
        loading={pending}
        onClick={() =>
          start(async () => {
            const r = await runRulesNow();
            setMsg(r?.ok ?? r?.error ?? null);
          })
        }
      >
        بررسی الان
      </Button>
    </span>
  );
}

export function NotificationList({ notifications }: { notifications: Notification[] }) {
  const [filter, setFilter] = useState<"all" | "unread" | Severity>("unread");

  const counts = {
    all: notifications.length,
    unread: notifications.filter((n) => !n.read_at).length,
    critical: notifications.filter((n) => n.severity === "critical").length,
    warning: notifications.filter((n) => n.severity === "warning").length,
    info: notifications.filter((n) => n.severity === "info").length,
  };

  const shown = notifications.filter((n) => {
    if (filter === "all") return true;
    if (filter === "unread") return !n.read_at;
    return n.severity === filter;
  });

  const tabs: { key: typeof filter; label: string; count: number }[] = [
    { key: "unread", label: "خوانده‌نشده", count: counts.unread },
    { key: "all", label: "همه", count: counts.all },
    { key: "critical", label: "بحرانی", count: counts.critical },
    { key: "warning", label: "هشدار", count: counts.warning },
    { key: "info", label: "اطلاع", count: counts.info },
  ];

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-1 border-b border-[var(--geist-border)] p-3">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`rounded-[var(--geist-radius)] px-3 py-1.5 text-sm transition ${
              filter === t.key
                ? "bg-[var(--geist-gray-100)] font-medium"
                : "text-[var(--geist-secondary)] hover:text-[var(--geist-foreground)]"
            }`}
          >
            {t.label} <span className="num text-xs">({t.count})</span>
          </button>
        ))}
        <div className="mr-auto flex gap-2">
          <form action={markAllRead}>
            <Button htmlType="submit" size="small" variant="tertiary" disabled={counts.unread === 0}>
              همه را خواندم
            </Button>
          </form>
          <form action={dismissAll}>
            <Button
              htmlType="submit"
              size="small"
              variant="tertiary"
              disabled={counts.all === 0}
              confirm="همه اعلان‌ها بایگانی شوند؟"
            >
              بایگانی همه
            </Button>
          </form>
        </div>
      </div>

      {shown.length === 0 ? (
        <Empty title={filter === "unread" ? "اعلان خوانده‌نشده‌ای ندارید" : "اعلانی نیست"}>
          {filter === "unread" && counts.all > 0 ? "با تب «همه» بقیه را ببینید" : undefined}
        </Empty>
      ) : (
        <ul className="divide-y divide-[var(--geist-border)]">
          {shown.map((n) => {
            const href =
              n.target_id === null
                ? null
                : n.target === "invoice"
                  ? `/invoices/${n.target_id}`
                  : `/shipments/${n.target_id}`;
            return (
              <li
                key={n.id}
                className={`flex flex-wrap items-start gap-3 px-4 py-3 ${
                  n.read_at ? "" : "bg-[var(--geist-background-subtle)]"
                }`}
              >
                <span className="mt-0.5 shrink-0">
                  <Badge tone={severityTone[n.severity]} dot>
                    {severityLabel[n.severity]}
                  </Badge>
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {!n.read_at && (
                      <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[var(--geist-blue)] align-middle" />
                    )}
                    {href ? (
                      <Link href={href} className="hover:underline">
                        {n.title}
                      </Link>
                    ) : (
                      n.title
                    )}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[var(--geist-secondary)]">{n.body}</p>
                  <p className="mt-1 text-xs text-[var(--geist-tertiary)]">
                    {n.rule_name} — {when(n.created_at)}
                  </p>
                </div>

                <div className="flex shrink-0 gap-1">
                  {!n.read_at && (
                    <form action={markRead}>
                      <input type="hidden" name="id" value={n.id} />
                      <Button htmlType="submit" size="tiny" variant="tertiary">
                        خواندم
                      </Button>
                    </form>
                  )}
                  <form action={dismissNotification}>
                    <input type="hidden" name="id" value={n.id} />
                    <Button htmlType="submit" size="tiny" variant="tertiary">
                      بایگانی
                    </Button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

export function RulesHelp() {
  return (
    <Note>
      اعلان‌ها فقط داخل برنامه نمایش داده می‌شوند (ایمیل و پیامک ندارد). موتور اعلان هنگام کار با
      برنامه هر ۱۰ دقیقه یک‌بار اجرا می‌شود؛ با دکمه «بررسی الان» هم می‌توانید دستی اجرایش کنید.
    </Note>
  );
}
