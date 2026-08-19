import { requirePermission } from "@/lib/auth";
import { AUDIT_SORTS, listAuditPaged } from "@/lib/audit";
import { parseParams } from "@/lib/paging";
import { Page } from "@/components/Nav";
import { Card } from "@/components/geist";
import { HistoryTable } from "./HistoryTable";

export const dynamic = "force-dynamic";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const me = await requirePermission("history");
  const params = parseParams(await searchParams, AUDIT_SORTS, "created_at");
  const rows = await listAuditPaged(params);

  return (
    <Page
      active="/history"
      title="تاریخچه تغییرات"
      user={`${me.first_name} ${me.last_name}`}
      permissions={me.permissions}
    >
      <Card>
        <HistoryTable page={rows} />
      </Card>
    </Page>
  );
}
