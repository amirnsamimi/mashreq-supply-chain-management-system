"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { GuideStep } from "@/lib/guide";
import { guideFinishAction, guideStartedAction, guideStepAction } from "@/lib/actions";
import { Button } from "@/components/geist";

/**
 * راهنمای گام‌به‌گام تعاملی.
 * با هر گام، خودِ راهنما مسیر صفحه را عوض می‌کند تا کاربر همان بخشی را ببیند
 * که درباره‌اش توضیح داده می‌شود. پیشرفت روی دیتابیس ذخیره می‌شود.
 */
export function GuideTour({
  steps,
  open,
  onClose,
  startAt = 0,
  onStep,
}: {
  steps: GuideStep[];
  open: boolean;
  onClose: () => void;
  startAt?: number;
  /** تا صفحه‌ای که راهنما را نگه داشته بداند کاربر کجاست */
  onStep?: (step: number) => void;
}) {
  const total = steps.length;
  const router = useRouter();
  const pathname = usePathname();
  const [i, setI] = useState(() => Math.min(Math.max(startAt, 0), Math.max(total - 1, 0)));
  const [minimized, setMinimized] = useState(false);

  // هر بار که راهنما باز می‌شود از همان گام ذخیره‌شده شروع کن
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) {
      setI(Math.min(Math.max(startAt, 0), Math.max(total - 1, 0)));
      setMinimized(false);
      guideStartedAction().catch(() => null);
    }
    wasOpen.current = open;
  }, [open, startAt, total]);

  const step = open && total > 0 ? steps[i] : null;
  const target = step?.href;

  /*
   * قلب کار: رساندن کاربر به صفحه‌ای که گام درباره‌اش حرف می‌زند.
   * فقط با عوض شدن گام جابه‌جا می‌کند، نه با عوض شدن مسیر —
   * وگرنه اگر کاربر خودش جایی برود، راهنما او را به زور برمی‌گرداند.
   */
  const navigatedFor = useRef<number | null>(null);
  useEffect(() => {
    if (!open) {
      navigatedFor.current = null;
      return;
    }
    if (!target || navigatedFor.current === i) return;
    navigatedFor.current = i;
    if (pathname !== target) router.push(target);
    // pathname عمداً در وابستگی‌ها نیست
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, i, target, router]);

  const finish = useCallback(
    (skipped: boolean) => {
      guideFinishAction(skipped).catch(() => null);
      onClose();
    },
    [onClose]
  );

  const go = useCallback(
    (next: number) => {
      const clamped = Math.min(Math.max(next, 0), total - 1);
      setI(clamped);
      onStep?.(clamped);
      guideStepAction(clamped).catch(() => null);
    },
    [total, onStep]
  );

  // در صفحه راست‌به‌چپ، کلید چپ یعنی جلو
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      const typing =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement;
      if (e.key === "Escape") finish(true);
      else if (!typing && e.key === "ArrowLeft") go(i + 1);
      else if (!typing && e.key === "ArrowRight") go(i - 1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, i, go, finish]);

  if (!step) return null;

  const last = i === total - 1;
  const percent = Math.round(((i + 1) / total) * 100);

  // حالت جمع‌شده: یک دکمه کوچک تا کاربر بتواند آزادانه با صفحه کار کند
  if (minimized) {
    return (
      <div className="fixed bottom-4 left-4 z-[60] print:hidden">
        <button
          type="button"
          onClick={() => setMinimized(false)}
          className="num flex items-center gap-2 rounded-full border border-[var(--geist-border)] bg-[var(--geist-background)] px-3.5 py-2 text-xs shadow-[var(--geist-shadow)] transition hover:border-[var(--geist-foreground)]"
        >
          راهنما · گام {i + 1} از {total}
        </button>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-label="راهنمای گام‌به‌گام"
      // پنجره شناور است نه پوشش تمام‌صفحه، تا صفحه‌ای که توضیح داده می‌شود دیده شود
      className="fixed inset-x-3 bottom-3 z-[60] print:hidden sm:inset-x-auto sm:bottom-5 sm:left-5 sm:w-[420px]"
    >
      <div
        style={{ animation: "geist-fade-in 0.15s ease-out" }}
        className="max-h-[70dvh] overflow-y-auto rounded-[var(--geist-radius-lg)] border border-[var(--geist-border)] bg-[var(--geist-background)] shadow-[var(--geist-shadow)]"
      >
        <div className="h-1 w-full bg-[var(--geist-gray-100)]">
          <div
            className="h-1 bg-[var(--geist-foreground)] transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>

        <div className="flex items-start justify-between gap-3 border-b border-[var(--geist-border)] px-4 py-3">
          <div className="min-w-0">
            <div className="num flex items-center gap-2 text-xs text-[var(--geist-tertiary)]">
              <span>
                گام {i + 1} از {total}
              </span>
              {step.pageLabel && (
                <>
                  <span aria-hidden>·</span>
                  <span className="truncate">صفحه {step.pageLabel}</span>
                </>
              )}
            </div>
            <h2 className="mt-1 text-sm font-semibold tracking-tight">{step.title}</h2>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setMinimized(true)}
              aria-label="جمع کردن راهنما"
              title="جمع کردن"
              className="rounded-[var(--geist-radius)] px-2 py-1 text-xs text-[var(--geist-tertiary)] transition hover:bg-[var(--geist-gray-100)] hover:text-[var(--geist-foreground)]"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => finish(true)}
              aria-label="بستن راهنما"
              title="بستن"
              className="rounded-[var(--geist-radius)] px-2 py-1 text-xs text-[var(--geist-tertiary)] transition hover:bg-[var(--geist-gray-100)] hover:text-[var(--geist-foreground)]"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="px-4 py-3">
          <ul className="space-y-2">
            {step.body.map((line, k) => (
              <li key={k} className="flex gap-2 text-sm leading-7 text-[var(--geist-secondary)]">
                <span
                  aria-hidden
                  className="mt-3 h-1 w-1 shrink-0 rounded-full bg-[var(--geist-tertiary)]"
                />
                <span>{line}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {steps.map((s, k) => (
              <button
                key={s.key}
                type="button"
                title={s.title}
                aria-label={`گام ${k + 1}: ${s.title}`}
                aria-current={k === i}
                onClick={() => go(k)}
                className={`h-1.5 rounded-full transition-all ${
                  k === i
                    ? "w-6 bg-[var(--geist-foreground)]"
                    : k < i
                      ? "w-1.5 bg-[var(--geist-secondary)]"
                      : "w-1.5 bg-[var(--geist-gray-100)]"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-[var(--geist-border)] bg-[var(--geist-background-subtle)] px-4 py-2.5">
          <button
            type="button"
            onClick={() => finish(true)}
            className="text-xs text-[var(--geist-tertiary)] transition hover:text-[var(--geist-foreground)]"
          >
            رد کردن
          </button>
          <div className="flex items-center gap-2">
            <Button size="small" disabled={i === 0} onClick={() => go(i - 1)}>
              قبلی
            </Button>
            {last ? (
              <Button size="small" variant="primary" onClick={() => finish(false)}>
                پایان
              </Button>
            ) : (
              <Button size="small" variant="primary" onClick={() => go(i + 1)}>
                بعدی
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
