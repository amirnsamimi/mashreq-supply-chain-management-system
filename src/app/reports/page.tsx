import { Suspense } from "react";
import { requireAuth } from "@/lib/auth";
import { buildReport, reportCurrencies } from "@/lib/reports";
import { Page } from "@/components/Nav";
import { Skeleton } from "@/components/geist";
import { ReportsClient } from "./ReportsClient";

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ currency?: string }>;
}) {
  const me = await requireAuth();
  const currencies = await reportCurrencies();
  const asked = (await searchParams).currency;
  const currency = asked && currencies.includes(asked) ? asked : currencies[0];
  const report = await buildReport(currency);

  return (
    <Page active="/reports" title="گزارش‌ها" user={`${me.first_name} ${me.last_name}`}>
      <Suspense fallback={<Skeleton height={400} />}>
        <ReportsClient report={report} currency={currency} />
      </Suspense>
    </Page>
  );
}
