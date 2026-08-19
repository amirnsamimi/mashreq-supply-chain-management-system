"use client";

import { useState } from "react";
import type { Share } from "@/lib/share";
import { createShareLink, revokeShareLink, rotateShareLink } from "@/lib/actions";
import { ActionForm, Submit } from "@/components/ActionForm";
import { Button, Card, Note } from "@/components/geist";
import { DateText } from "@/components/DateText";

export function ShareCard({
  invoiceId,
  invoiceNo,
  share,
  baseUrl,
}: {
  invoiceId: number;
  invoiceNo: string;
  share: Share | null;
  /** از NEXT_PUBLIC_APP_URL یا هدرهای درخواست می‌آید */
  baseUrl: string;
}) {
  const [copied, setCopied] = useState(false);
  const url = share ? `${baseUrl}/s/${share.token}` : "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Card title="اشتراک‌گذاری وضعیت این فاکتور">
      <div className="grid gap-4 p-4">
        {!share ? (
          <>
            <Note>
              با ساخت لینک، هرکسی که آن را داشته باشد می‌تواند <b>وضعیت</b> این فاکتور را ببیند:
              نام تأمین‌کننده، تاریخ‌ها، اقلام و تعدادشان، پارت‌های ارسال و وضعیت‌ها.{" "}
              <b>هیچ مبلغی نمایش داده نمی‌شود</b> مگر بیننده خودش کاربر سیستم باشد و وارد شده باشد.
            </Note>
            <ActionForm action={createShareLink}>
              <input type="hidden" name="invoice_id" value={invoiceId} />
              <Submit>ساخت لینک اشتراک</Submit>
            </ActionForm>
          </>
        ) : (
          <>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--geist-secondary)]">
                لینک عمومی فاکتور {invoiceNo}
              </label>
              <div className="flex gap-2">
                <input
                  readOnly
                  dir="ltr"
                  value={url}
                  onFocus={(e) => e.currentTarget.select()}
                  className="num h-10 flex-1 rounded-[var(--geist-radius)] border border-[var(--geist-border)] bg-[var(--geist-background-subtle)] px-3 text-sm"
                />
                <Button onClick={copy} variant={copied ? "primary" : "secondary"}>
                  {copied ? "کپی شد" : "کپی"}
                </Button>
                <a href={`/s/${share.token}`} target="_blank" rel="noreferrer">
                  <Button>باز کردن</Button>
                </a>
              </div>
            </div>

            <p className="text-xs text-[var(--geist-tertiary)]">
              ساخته‌شده: <DateText value={share.created_at} /> — {share.view_count} بار دیده شده
              {share.last_viewed_at && (
                <>
                  {" "}
                  (آخرین بار <DateText value={share.last_viewed_at} withTime />)
                </>
              )}
            </p>

            <div className="flex flex-wrap gap-2 border-t border-[var(--geist-border)] pt-4">
              <ActionForm action={rotateShareLink} hideResult>
                <input type="hidden" name="invoice_id" value={invoiceId} />
                <Submit variant="secondary" size="small" confirm="لینک فعلی از کار می‌افتد و لینک تازه‌ای ساخته می‌شود. ادامه؟">
                  ساخت لینک تازه
                </Submit>
              </ActionForm>
              <form action={revokeShareLink}>
                <input type="hidden" name="invoice_id" value={invoiceId} />
                <Button
                  htmlType="submit"
                  size="small"
                  variant="tertiary"
                  className="!text-[var(--geist-red-text)]"
                  confirm="لینک غیرفعال شود؟ هرکسی که آن را دارد دیگر نمی‌تواند این صفحه را ببیند."
                >
                  غیرفعال کردن لینک
                </Button>
              </form>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
