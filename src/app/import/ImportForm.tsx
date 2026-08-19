"use client";

import { useActionState, useState } from "react";
import { importAction } from "@/lib/importAction";
import type { ImportReport } from "@/lib/import";
import { Button, Note } from "@/components/geist";
import { SubmitButton } from "@/components/geist/Button";

export function ImportForm() {
  const [report, action] = useActionState<ImportReport | null, FormData>(importAction, null);
  const [fileName, setFileName] = useState("");

  return (
    <form action={action} className="grid gap-4">
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--geist-radius-lg)] border border-dashed border-[var(--geist-border-strong)] px-4 py-10 text-center transition hover:border-[var(--geist-foreground)]">
        <svg viewBox="0 0 24 24" className="h-7 w-7 text-[var(--geist-tertiary)]" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 16V4M12 4 8 8M12 4l4 4" />
          <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
        </svg>
        <span className="text-sm font-medium">
          {fileName || "فایل اکسل را انتخاب کنید"}
        </span>
        <span className="text-xs text-[var(--geist-tertiary)]">فقط xlsx. — حداکثر 15 مگابایت</span>
        <input
          type="file"
          name="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          required
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
          className="sr-only"
        />
      </label>

      <div className="flex items-center gap-2">
        <SubmitButton variant="primary" disabled={!fileName}>
          شروع ورود داده
        </SubmitButton>
        {fileName && (
          <Button variant="tertiary" onClick={() => setFileName("")}>
            پاک کردن
          </Button>
        )}
      </div>

      {report && (
        <div className="grid gap-3">
          <Note type={report.ok ? "success" : "warning"}>{report.message}</Note>

          {report.ok && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {Object.entries(report.counts).map(([k, v]) => (
                <div
                  key={k}
                  className="rounded-[var(--geist-radius)] border border-[var(--geist-border)] p-3 text-center"
                >
                  <div className="num text-xl font-semibold">{v}</div>
                  <div className="text-xs text-[var(--geist-secondary)]">{k}</div>
                </div>
              ))}
            </div>
          )}

          {report.warnings.length > 0 && (
            <div className="rounded-[var(--geist-radius)] border border-[var(--geist-border)] p-3">
              <p className="mb-2 text-xs font-medium text-[var(--geist-secondary)]">
                {report.warnings.length} مورد رد یا نادیده گرفته شد:
              </p>
              <ul className="max-h-48 space-y-1 overflow-y-auto text-xs text-[var(--geist-tertiary)]">
                {report.warnings.map((w, i) => (
                  <li key={i}>— {w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </form>
  );
}
