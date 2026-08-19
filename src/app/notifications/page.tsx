import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { listNotifications, listRules, lastRun } from "@/lib/notifications";
import { pushEnabled } from "@/lib/push";
import { Page } from "@/components/Nav";
import { Button, Card, Note } from "@/components/geist";
import { PushToggle } from "@/components/PWA";
import { NotificationList, RunNowButton } from "./NotificationsClient";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const me = await requirePermission("notifications");
  const notifications = await listNotifications();
  const rules = await listRules();
  const last = await lastRun();
  const activeRules = rules.filter((r) => r.is_active).length;
  const canPush = pushEnabled();

  return (
    <Page
      active="/notifications"
      title="اعلان‌ها"
      user={`${me.first_name} ${me.last_name}`}
      permissions={me.permissions}
      action={
        <>
          <RunNowButton />
          <Link href="/notifications/rules">
            <Button>مدیریت قالب‌ها</Button>
          </Link>
        </>
      }
    >
      <Card>
        <div className="border-b border-[var(--geist-border)] px-4 py-2.5 text-sm font-medium">
          اعلان روی گوشی
        </div>
        <div className="p-4">
          <PushToggle
            publicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""}
            enabled={canPush}
          />
        </div>
      </Card>

      <div className="h-4" />

      {rules.length === 0 ? (
        <Card>
          <div className="p-4">
            <Note type="warning" title="هنوز قالبی نساخته‌اید">
              اعلان‌ها از روی قالب‌هایی ساخته می‌شوند که خودتان تعریف می‌کنید — مثلاً «3 روز مانده به
              سررسید» یا «10 روز از خروج پارت گذشته و هنوز نرسیده».{" "}
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
        . بررسی خودکار هر 10 دقیقه یک‌بار هنگام باز بودن برنامه انجام می‌شود.
      </p>
    </Page>
  );
}
