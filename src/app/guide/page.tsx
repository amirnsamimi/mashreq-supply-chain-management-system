import { requireAuth } from "@/lib/auth";
import { stepsFor } from "@/lib/guide";
import { guideSamples, guideState } from "@/lib/guideState";
import { guideResetAction } from "@/lib/actions";
import { Page } from "@/components/Nav";
import { GuideStartButton } from "@/components/GuideLauncher";
import { ActionForm, Submit } from "@/components/ActionForm";
import { Badge, Card, Note } from "@/components/geist";

export const dynamic = "force-dynamic";

export default async function GuidePage() {
  // راهنما به دسترسی خاصی نیاز ندارد؛ هر کاربر واردشده می‌تواند ببیندش
  const me = await requireAuth();
  const samples = await guideSamples();
  const steps = stepsFor(me.permissions, samples);
  const state = await guideState(me.id);
  const resume = Math.min(state.last_step, Math.max(steps.length - 1, 0));
  const done = state.completed_at !== null && !state.skipped;

  return (
    <Page
      active="/guide"
      title="راهنمای استفاده"
      user={`${me.first_name} ${me.last_name}`}
      permissions={me.permissions}
      action={
        <GuideStartButton
          startAt={resume}
          label={state.last_step > 0 && !done ? "ادامه راهنما" : "شروع راهنمای گام‌به‌گام"}
        />
      }
    >
      <div className="mb-5">
        <Note type={done ? "success" : "default"}>
          {done
            ? "شما راهنما را تا انتها دیده‌اید. هر زمان خواستید دوباره اجرایش کنید."
            : state.skipped
              ? "راهنما را قبلاً بسته‌اید. با دکمه بالا می‌توانید دوباره از همان‌جا ادامه دهید."
              : "این راهنما در چند گام کوتاه، کار با هر بخش سامانه را توضیح می‌دهد و با هر گام خودش شما را به همان صفحه می‌برد."}
        </Note>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Info label="تعداد گام‌ها" value={steps.length} />
        <Info label="آخرین گام دیده‌شده" value={state.last_step > 0 ? state.last_step + 1 : "—"} />
        <Info label="دفعات اجرا" value={state.seen_count} />
        <Info
          label="وضعیت"
          value={
            done ? (
              <Badge tone="green">کامل</Badge>
            ) : state.skipped ? (
              <Badge tone="amber">نیمه‌کاره</Badge>
            ) : (
              <Badge tone="blue">شروع‌نشده</Badge>
            )
          }
        />
      </div>

      <Card
        title="فهرست گام‌ها"
        footer="گام‌ها بر اساس دسترسی‌های شما فیلتر شده‌اند؛ هر کاربر فقط راهنمای بخش‌هایی را می‌بیند که به آن‌ها دسترسی دارد."
      >
        <ol className="divide-y divide-[var(--geist-border)]">
          {steps.map((s, k) => (
            <li key={s.key} className="flex gap-3 px-4 py-4">
              <span className="num mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--geist-border)] text-xs text-[var(--geist-secondary)]">
                {k + 1}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-medium">{s.title}</h3>
                  {s.pageLabel && <Badge tone="gray">{s.pageLabel}</Badge>}
                </div>
                <ul className="mt-1.5 space-y-1">
                  {s.body.map((line, j) => (
                    <li key={j} className="text-sm leading-7 text-[var(--geist-secondary)]">
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <div className="mt-5">
        <Card title="بازنشانی راهنما">
          <div className="px-4 py-4">
            <p className="mb-3 text-sm text-[var(--geist-secondary)]">
              با بازنشانی، پیشرفت شما پاک می‌شود و راهنما دفعه بعد مثل ورود اول، خودکار در داشبورد باز
              می‌شود.
            </p>
            <ActionForm action={guideResetAction}>
              <Submit variant="secondary" size="small">
                بازنشانی راهنما
              </Submit>
            </ActionForm>
          </div>
        </Card>
      </div>
    </Page>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-[var(--geist-radius-lg)] border border-[var(--geist-border)] bg-[var(--geist-background)] p-4">
      <div className="text-xs text-[var(--geist-secondary)]">{label}</div>
      <div className="num mt-1.5 text-lg font-semibold tracking-tight">{value}</div>
    </div>
  );
}
