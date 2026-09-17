"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Note } from "@/components/geist";
import { SubmitButton } from "@/components/geist/Button";
import { wipeAllData, type WipeResult } from "@/lib/backupAction";
import { WIPE_PHRASE } from "@/lib/wipe";
import type { BackupStatus } from "@/lib/backup";

export function DataSafety({
  status,
  lastBackupLabel,
  isAdmin,
}: {
  status: BackupStatus;
  lastBackupLabel: string | null;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [phrase, setPhrase] = useState("");
  const [result, wipe] = useActionState<WipeResult, FormData>(wipeAllData, null);

  async function backup() {
    setDownloading(true);
    setDownloadError(null);
    try {
      const res = await fetch("/api/backup", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const name =
        decodeURIComponent(res.headers.get("Content-Disposition")?.match(/filename\*=UTF-8''([^;]+)/)?.[1] ?? "") ||
        "پشتیبان-مشرقی.xlsx";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
      router.refresh();
    } catch {
      setDownloadError("ساخت فایل پشتیبان ناموفق بود. دوباره تلاش کنید.");
    } finally {
      setDownloading(false);
    }
  }

  const canWipe = isAdmin && status.upToDate && status.totalRows > 0;

  return (
    <div className="grid gap-5 p-4">
      <section className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">۱. پشتیبان کامل در اکسل</h3>
            <p className="text-xs text-[var(--geist-secondary)]">
              هر جدول در یک شیت، با همه ستون‌ها — به‌همراه کاربران (بدون رمز)، تاریخچه و قالب‌های اعلان.
            </p>
          </div>
          <Button variant="primary" size="small" loading={downloading} onClick={backup}>
            دانلود پشتیبان
          </Button>
        </div>
        {downloadError && <Note type="error">{downloadError}</Note>}
        {lastBackupLabel ? (
          <Note type={status.upToDate ? "success" : "warning"}>
            آخرین پشتیبان: {lastBackupLabel}
            {status.lastBackupBy ? ` توسط ${status.lastBackupBy}` : ""}
            {status.upToDate ? " — با داده فعلی یکی است." : " — داده‌ها بعد از آن تغییر کرده‌اند."}
          </Note>
        ) : (
          <Note>هنوز پشتیبانی گرفته نشده است.</Note>
        )}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
          {status.counts.map((c) => (
            <div key={c.table} className="flex justify-between gap-2 text-[var(--geist-secondary)]">
              <span>{c.label}</span>
              <span className="num text-[var(--geist-foreground)]">{c.rows}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-3 border-t border-[var(--geist-border)] pt-5">
        <div>
          <h3 className="text-sm font-semibold text-[var(--geist-red-text)]">۲. حذف همه داده‌ها</h3>
          <p className="text-xs text-[var(--geist-secondary)]">
            همه تأمین‌کنندگان، کالاها، فاکتورها، پارت‌ها، پرداخت‌ها، کیف‌پول‌ها و اعلان‌ها پاک می‌شوند.
            کاربران، تاریخچه و قالب‌های اعلان می‌مانند. برگشت‌پذیر نیست.
          </p>
        </div>

        {!isAdmin ? (
          <Note>فقط ادمین می‌تواند داده‌ها را حذف کند.</Note>
        ) : status.totalRows === 0 ? (
          <Note>داده‌ای برای حذف وجود ندارد.</Note>
        ) : !status.upToDate ? (
          <Note type="warning">
            این دکمه فقط بعد از یک پشتیبان تازه فعال می‌شود؛ پشتیبانی که بعد از آخرین تغییر داده گرفته شده باشد.
          </Note>
        ) : null}

        <form action={wipe} className="grid gap-3">
          <Input
            name="phrase"
            label={`برای تأیید بنویسید: ${WIPE_PHRASE}`}
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            disabled={!canWipe}
            autoComplete="off"
          />
          <div>
            <SubmitButton
              variant="error"
              disabled={!canWipe || phrase.trim() === ""}
              confirm="همه داده‌ها برای همیشه حذف می‌شوند. ادامه می‌دهید؟"
            >
              حذف همه داده‌ها
            </SubmitButton>
          </div>
          {result && <Note type={result.ok ? "success" : "error"}>{result.message}</Note>}
        </form>
      </section>
    </div>
  );
}
