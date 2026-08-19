"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { ReportData } from "@/lib/reports";
import { money } from "@/lib/format";
import { useCalendar } from "@/components/useCalendar";
import {
  BaseChart,
  ChartBox,
  RAMP,
  SERIES,
  Stat,
  useChartMode,
} from "@/components/geist";
import { Card, Empty } from "@/components/geist";

const fa = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

function SectionTitle({ children, hint }: { children: string; hint?: string }) {
  return (
    <div className="mb-3 mt-8 first:mt-0">
      <h2 className="text-base font-semibold tracking-tight">{children}</h2>
      {hint && <p className="mt-0.5 text-xs text-[var(--geist-tertiary)]">{hint}</p>}
    </div>
  );
}

export function ReportsClient({
  report,
  currency,
}: {
  report: ReportData;
  currency: string;
}) {
  const mode = useChartMode();
  const calendar = useCalendar();
  // برچسب ماه‌ها با تقویمی که کاربر انتخاب کرده هماهنگ می‌شود
  const monthLabels = report.months.map((m) => m[calendar]);
  const series = SERIES[mode];
  const ramp = RAMP[mode];
  const router = useRouter();
  const params = useSearchParams();

  const { totals } = report;
  const hasMoney = totals.purchases > 0 || totals.paid > 0;
  const hasShipments = report.shipmentStatus.some((s) => s.value > 0);

  function setCurrency(c: string) {
    const next = new URLSearchParams(params.toString());
    next.set("currency", c);
    router.push(`/reports?${next}`);
  }

  return (
    <>
      {report.currencies.length > 1 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-[var(--geist-secondary)]">ارز:</span>
          {report.currencies.map((c) => (
            <button
              key={c}
              onClick={() => setCurrency(c)}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                c === currency
                  ? "border-[var(--geist-foreground)] bg-[var(--geist-gray-100)] font-medium"
                  : "border-[var(--geist-border)] text-[var(--geist-secondary)] hover:border-[var(--geist-foreground)]"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {/* شاخص‌های سرصفحه — عدد تنها، نه نمودار */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={`جمع خرید (${currency})`} value={money(totals.purchases)} hint={`${totals.invoices} فاکتور`} />
        <Stat label={`پرداخت‌شده (${currency})`} value={money(totals.paid)} tone="good" />
        <Stat
          label={`مانده بدهی (${currency})`}
          value={money(totals.balance)}
          tone={totals.balance > 0 ? "warn" : "good"}
          hint={totals.overdue > 0 ? `${totals.overdue} فاکتور سررسید گذشته` : "بدون سررسید گذشته"}
        />
        <Stat
          label="سهم حمل از ارزش کالا"
          value={`${fa.format(totals.freightShare)}٪`}
          hint={`هزینه حمل: ${money(totals.freight)}`}
        />
        <Stat
          label="میانگین مدت حمل"
          value={totals.avgTransit === null ? "—" : `${fa.format(totals.avgTransit)} روز`}
        />
        <Stat
          label="تحویل کامل"
          value={totals.onTimeRate === null ? "—" : `${fa.format(totals.onTimeRate)}٪`}
          hint="پارت‌هایی که کامل دریافت شدند"
          tone={totals.onTimeRate !== null && totals.onTimeRate < 90 ? "warn" : "good"}
        />
        <Stat
          label="میانگین زمان تا پرداخت"
          value={totals.avgDaysToPay === null ? "—" : `${fa.format(totals.avgDaysToPay)} روز`}
          hint="از تاریخ فاکتور تا ثبت پرداخت"
        />
        <Stat label="تأمین‌کنندگان" value={fa.format(totals.suppliers)} />
        <Stat label="پارت‌های ارسال" value={fa.format(totals.shipments)} hint={`${fa.format(totals.itemsCount)} قلم کالا`} />
      </div>

      {!hasMoney && !hasShipments ? (
        <div className="mt-6">
          <Card>
            <Empty title="هنوز داده‌ای برای گزارش نیست">
              بعد از ثبت فاکتور و پارت ارسال، نمودارها اینجا ساخته می‌شوند
            </Empty>
          </Card>
        </div>
      ) : (
        <>
        <SectionTitle hint="همه مبالغ این بخش به ارز انتخاب‌شده است">مالی</SectionTitle>
        <div className="grid gap-4 xl:grid-cols-2">
          {/* خرید و پرداخت — دو سری، پس افسانه لازم است */}
          <ChartBox
            title="خرید و پرداخت به تفکیک ماه"
            subtitle={`مبالغ به ${currency} — 12 ماه گذشته`}
          >
            <BaseChart
              type="bar"
              data={{
                labels: monthLabels,
                datasets: [
                  {
                    label: "خرید",
                    data: report.purchasesByMonth,
                    backgroundColor: series[0],
                    borderRadius: 4,
                    borderSkipped: false,
                    maxBarThickness: 22,
                  },
                  {
                    label: "پرداخت",
                    data: report.paymentsByMonth,
                    backgroundColor: series[1],
                    borderRadius: 4,
                    borderSkipped: false,
                    maxBarThickness: 22,
                  },
                ],
              }}
              options={{
                plugins: { legend: { display: true } },
                scales: { x: { grid: { display: false } } },
              }}
            />
          </ChartBox>

          {/* سنی‌سازی بدهی — مقیاس ترتیبی، رمپ تک‌رنگ */}
          <ChartBox
            title="سن بدهی"
            subtitle={`مانده پرداخت‌نشده به ${currency}، بر اساس فاصله از سررسید`}
            footer="ستون‌ها از راست به چپ: از سررسیدنشده تا بیش از 60 روز دیرکرد."
          >
            <BaseChart
              type="bar"
              data={{
                labels: report.aging.map((a) => a.label),
                datasets: [
                  {
                    label: "مانده",
                    data: report.aging.map((a) => a.value),
                    backgroundColor: ramp,
                    borderRadius: 4,
                    borderSkipped: false,
                    maxBarThickness: 48,
                  },
                ],
              }}
            />
          </ChartBox>

          {/* مانده بدهی به تفکیک تأمین‌کننده */}
          <ChartBox
            title="مانده بدهی به تفکیک تأمین‌کننده"
            subtitle={`چقدر به هر کدام بدهکاریم — به ${currency}`}
            height={Math.max(200, report.outstandingBySupplier.length * 34 + 40)}
          >
            {report.outstandingBySupplier.length === 0 ? (
              <Empty title="بدهی معوقی نیست" />
            ) : (
              <BaseChart
                type="bar"
                horizontal
                data={{
                  labels: report.outstandingBySupplier.map((s) => s.label),
                  datasets: [
                    {
                      label: "مانده",
                      data: report.outstandingBySupplier.map((s) => s.value),
                      backgroundColor: series[1],
                      borderRadius: 4,
                      borderSkipped: false,
                      maxBarThickness: 18,
                    },
                  ],
                }}
                options={{ indexAxis: "y" }}
              />
            )}
          </ChartBox>
        </div>

        <SectionTitle hint="بر اساس اقلام فاکتورهای همین ارز">خرید و کالا</SectionTitle>
        <div className="grid gap-4 xl:grid-cols-2">
          {/* تأمین‌کنندگان برتر — میله افقی، تک‌رنگ */}
          <ChartBox
            title="تأمین‌کنندگان به ترتیب حجم خرید"
            subtitle={`مبالغ به ${currency}`}
            height={Math.max(200, report.topSuppliers.length * 34 + 40)}
          >
            {report.topSuppliers.length === 0 ? (
              <Empty title="داده‌ای نیست" />
            ) : (
              <BaseChart
                type="bar"
                data={{
                  labels: report.topSuppliers.map((s) => s.label),
                  datasets: [
                    {
                      label: "خرید",
                      data: report.topSuppliers.map((s) => s.value),
                      backgroundColor: series[0],
                      borderRadius: 4,
                      borderSkipped: false,
                      maxBarThickness: 18,
                    },
                  ],
                }}
                horizontal
                options={{ indexAxis: "y" }}
              />
            )}
          </ChartBox>

          {/* کالاهای برتر */}
          <ChartBox
            title="کالاها به ترتیب ارزش خرید"
            subtitle={`مبالغ به ${currency}`}
            height={Math.max(200, report.topProducts.length * 34 + 40)}
          >
            {report.topProducts.length === 0 ? (
              <Empty title="داده‌ای نیست" />
            ) : (
              <BaseChart
                type="bar"
                data={{
                  labels: report.topProducts.map((p) => p.label),
                  datasets: [
                    {
                      label: "ارزش",
                      data: report.topProducts.map((p) => p.value),
                      backgroundColor: series[2],
                      borderRadius: 4,
                      borderSkipped: false,
                      maxBarThickness: 18,
                    },
                  ],
                }}
                horizontal
                options={{ indexAxis: "y" }}
              />
            )}
          </ChartBox>

          {/* چرخه کالا — مقیاس ترتیبی از ارسال‌نشده تا دریافت‌شده */}
          <ChartBox
            title="چرخه کالا"
            subtitle="تعداد کالا در هر مرحله — از ثبت فاکتور تا تحویل انبار"
            footer="جمع سه ستون برابر کل تعداد سفارش‌شده است."
          >
            <BaseChart
              type="bar"
              data={{
                labels: report.itemsPipeline.map((p) => p.label),
                datasets: [
                  {
                    label: "تعداد",
                    data: report.itemsPipeline.map((p) => p.value),
                    backgroundColor: ramp,
                    borderRadius: 4,
                    borderSkipped: false,
                    maxBarThickness: 48,
                  },
                ],
              }}
            />
          </ChartBox>
        </div>

        <SectionTitle hint="مستقل از ارز — بر اساس همه پارت‌های ارسال">حمل و تحویل</SectionTitle>
        <div className="grid gap-4 xl:grid-cols-2">
          {/* هزینه حمل ماهانه — یک سری، بدون افسانه */}
          <ChartBox
            title="هزینه حمل به تفکیک ماه"
            subtitle="بر اساس تاریخ تحویل پارت به کارگو"
          >
            <BaseChart
              type="line"
              data={{
                labels: monthLabels,
                datasets: [
                  {
                    label: "هزینه حمل",
                    data: report.freightByMonth,
                    borderColor: series[1],
                    backgroundColor: series[1] + "22",
                    borderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: series[1],
                    pointBorderColor: mode === "dark" ? "#000000" : "#ffffff",
                    pointBorderWidth: 2,
                    tension: 0.25,
                    fill: true,
                  },
                ],
              }}
            />
          </ChartBox>

          {/* وضعیت پارت‌ها — مقیاس ترتیبی از انتظار تا تحویل */}
          <ChartBox
            title="پارت‌های ارسال بر اساس وضعیت"
            subtitle="تعداد پارت در هر مرحله — مستقل از ارز"
            footer={
              report.shipmentModes.length > 0
                ? `نوع حمل: ${report.shipmentModes.map((m) => `${m.label} (${m.value})`).join("، ")}`
                : undefined
            }
          >
            {!hasShipments ? (
              <Empty title="پارتی ثبت نشده است" />
            ) : (
              <BaseChart
                type="bar"
                data={{
                  labels: report.shipmentStatus.map((s) => s.label),
                  datasets: [
                    {
                      label: "تعداد",
                      data: report.shipmentStatus.map((s) => s.value),
                      backgroundColor: ramp,
                      borderRadius: 4,
                      borderSkipped: false,
                      maxBarThickness: 48,
                    },
                  ],
                }}
                options={{
                  scales: { y: { ticks: { precision: 0, maxTicksLimit: 5 } } },
                }}
              />
            )}
          </ChartBox>
          {/* ارسال و دریافت به تفکیک ماه */}
          <ChartBox
            title="تعداد ارسالی و دریافتی به تفکیک ماه"
            subtitle="کالای خارج‌شده در برابر کالای رسیده"
          >
            <BaseChart
              type="line"
              data={{
                labels: monthLabels,
                datasets: [
                  {
                    label: "ارسال‌شده",
                    data: report.shippedByMonth,
                    borderColor: series[0],
                    backgroundColor: "transparent",
                    borderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: series[0],
                    pointBorderColor: mode === "dark" ? "#000000" : "#ffffff",
                    pointBorderWidth: 2,
                    tension: 0.25,
                  },
                  {
                    label: "دریافت‌شده",
                    data: report.receivedByMonth,
                    borderColor: series[2],
                    backgroundColor: "transparent",
                    borderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: series[2],
                    pointBorderColor: mode === "dark" ? "#000000" : "#ffffff",
                    pointBorderWidth: 2,
                    tension: 0.25,
                  },
                ],
              }}
              options={{ plugins: { legend: { display: true } } }}
            />
          </ChartBox>
        </div>

        {report.carriers.length > 0 && (
          <>
            <SectionTitle hint="برای مقایسه کارگوها هنگام انتخاب برای پارت بعدی">
              کارنامه کارگوها
            </SectionTitle>
            <Card>
              <div className="scroll-x">
                <table>
                  <thead>
                    <tr>
                      <th>کارگو</th>
                      <th>تعداد پارت</th>
                      <th>میانگین مدت حمل</th>
                      <th>نرخ تحویل کامل</th>
                      <th>جمع هزینه حمل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.carriers.map((c) => (
                      <tr key={c.carrier}>
                        <td className="font-medium">{c.carrier}</td>
                        <td className="num">{fa.format(c.shipments)}</td>
                        <td className="num">
                          {c.avgTransit === null ? "—" : `${fa.format(c.avgTransit)} روز`}
                        </td>
                        <td
                          className={`num ${
                            c.completeRate !== null && c.completeRate < 90
                              ? "text-[var(--geist-amber-text)]"
                              : ""
                          }`}
                        >
                          {c.completeRate === null ? "—" : `${fa.format(c.completeRate)}٪`}
                        </td>
                        <td className="num">{money(c.freight)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
        </>
      )}

      {/* نمای جدولی — الزام دسترس‌پذیری برای رنگ‌هایی که کنتراستشان پایین است */}
      <div className="mt-8">
        <Card
          title="خلاصه ماهانه"
          footer="همان اعداد نمودارهای بالا — برای وقتی که به عدد دقیق یا کپی‌کردن نیاز دارید."
        >
          <div className="scroll-x">
            <table>
              <thead>
                <tr>
                  <th>ماه</th>
                  <th>خرید ({currency})</th>
                  <th>پرداخت ({currency})</th>
                  <th>هزینه حمل</th>
                </tr>
              </thead>
              <tbody>
                {monthLabels.map((m, i) => (
                  <tr key={m}>
                    <td>{m}</td>
                    <td className="num">{money(report.purchasesByMonth[i])}</td>
                    <td className="num">{money(report.paymentsByMonth[i])}</td>
                    <td className="num">{money(report.freightByMonth[i])}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>جمع</td>
                  <td className="num">{money(report.purchasesByMonth.reduce((a, b) => a + b, 0))}</td>
                  <td className="num">{money(report.paymentsByMonth.reduce((a, b) => a + b, 0))}</td>
                  <td className="num">{money(report.freightByMonth.reduce((a, b) => a + b, 0))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
