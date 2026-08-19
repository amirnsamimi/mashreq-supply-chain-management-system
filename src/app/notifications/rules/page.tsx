import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { listRules } from "@/lib/notifications";
import { Page } from "@/components/Nav";
import { RulesHelp } from "../NotificationsClient";
import { RulesClient } from "./RulesClient";

export const dynamic = "force-dynamic";

export default async function RulesPage() {
  const me = await requireAuth();
  const rules = await listRules();

  return (
    <Page
      active="/notifications"
      title="قالب‌های اعلان"
      user={`${me.first_name} ${me.last_name}`}
      action={
        <Link href="/notifications" className="text-sm text-[var(--geist-secondary)] hover:underline">
          ← بازگشت به اعلان‌ها
        </Link>
      }
    >
      <div className="mb-4">
        <RulesHelp />
      </div>
      <RulesClient rules={rules} />
    </Page>
  );
}
