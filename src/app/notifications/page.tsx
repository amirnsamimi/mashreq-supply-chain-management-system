import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { listNotifications, listRules, lastRun } from "@/lib/notifications";
import { Page } from "@/components/Nav";
import { Button, Card, Note } from "@/components/geist";
import { NotificationList, RunNowButton } from "./NotificationsClient";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const me = await requireAuth();
  const notifications = await listNotifications();
  const rules = await listRules();
  const last = await lastRun();
  const activeRules = rules.filter((r) => r.is_active).length;

  return (
    <Page
      active="/notifications"
      title="اعلان‌ها"
      user={`${me.first_name} ${me.last_name}`}
      action={
        <>
          <RunNowButton />
          <Link href="/notifications/rules">
            <Button>مدیریت قالب‌ها</Button>
          </Link>
        </>
      }
    >
      {rules.length === 0 ? (
        <Card>
          <div className="p-4">
            <Note type="warning" title="هنوز قالبی نساخته‌اید">
              اعلان‌ها از روی قالب‌هایی ساخته می‌شوند که خودتان تعریف می‌کنید — مثلاً «۳ روز مانده به
              سررسید» یا «۱۰ روز از خروج پارت گذشته و هنوز نرسیده».{" "}
              <Link href="/notifications/rules" className="underline">
                ساخت اولین قالب
              </Link>
            </Note>
          </div>
        </Card>
      ) : (
        <NotificationList notifications={notifications} />
      )}

      <p className="mt-4 text-xs text-[var(--geist-tertiary)]">
        {activeRules} قالب فعال از {rules.length} قالب
        {last && ` — آخرین بررسی: ${new Intl.DateTimeFormat("fa-IR", {
          dateStyle: "short",
          timeStyle: "short",
        }).format(new Date(last))}`}
        . بررسی خودکار هر ۱۰ دقیقه یک‌بار هنگام باز بودن برنامه انجام می‌شود.
      </p>
    </Page>
  );
}
