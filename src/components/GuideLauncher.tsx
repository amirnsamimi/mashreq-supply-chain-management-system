"use client";

import { useCallback, useEffect, useState } from "react";
import type { GuideStep } from "@/lib/guide";
import { Button, type ButtonProps } from "@/components/geist";
import { GuideTour } from "./GuideTour";

/** رویدادی که هر جای برنامه می‌تواند راهنما را باز کند */
export const GUIDE_EVENT = "khanum:guide-open";

export function openGuide(startAt = 0) {
  window.dispatchEvent(new CustomEvent(GUIDE_EVENT, { detail: { startAt } }));
}

/**
 * نگه‌دارندهٔ راهنما — در چیدمان اصلی سوار می‌شود تا با عوض شدن مسیر از بین نرود.
 * همین است که اجازه می‌دهد راهنما کاربر را بین صفحه‌ها بگرداند.
 */
export function GuideProvider({
  steps,
  autoStart = false,
  startAt = 0,
}: {
  steps: GuideStep[];
  autoStart?: boolean;
  startAt?: number;
}) {
  const [open, setOpen] = useState(false);
  const [resumeAt, setResumeAt] = useState(startAt);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const at = (e as CustomEvent<{ startAt?: number }>).detail?.startAt;
      if (typeof at === "number") setResumeAt(at);
      setOpen(true);
    };
    window.addEventListener(GUIDE_EVENT, onOpen);
    return () => window.removeEventListener(GUIDE_EVENT, onOpen);
  }, []);

  // ورود اول: راهنما با کمی تأخیر خودش باز می‌شود تا صفحه جا بیفتد
  useEffect(() => {
    if (!autoStart) return;
    const t = setTimeout(() => setOpen(true), 500);
    return () => clearTimeout(t);
  }, [autoStart]);

  const onStep = useCallback((s: number) => setResumeAt(s), []);

  if (!steps.length) return null;

  return (
    <GuideTour
      steps={steps}
      open={open}
      onClose={() => setOpen(false)}
      startAt={resumeAt}
      onStep={onStep}
    />
  );
}

/** دکمه‌ای که هر وقت کاربر خواست راهنما را باز می‌کند */
export function GuideStartButton({
  startAt = 0,
  label = "شروع راهنما",
  variant = "primary",
  size = "medium",
}: {
  startAt?: number;
  label?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
}) {
  return (
    <Button variant={variant} size={size} onClick={() => openGuide(startAt)}>
      {label}
    </Button>
  );
}
