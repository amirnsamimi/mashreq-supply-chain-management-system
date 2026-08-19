import { requireAuth } from "@/lib/auth";
import { listAudit } from "@/lib/audit";
import { Page } from "@/components/Nav";
import { Card } from "@/components/geist";
import { HistoryTable } from "./HistoryTable";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const me = await requireAuth();
  const rows = await listAudit(500);

  return (
    <Page active="/history" title="تاریخچه تغییرات" user={`${me.first_name} ${me.last_name}`}>
      <Card>
        <HistoryTable rows={rows} />
      </Card>
    </Page>
  );
}
