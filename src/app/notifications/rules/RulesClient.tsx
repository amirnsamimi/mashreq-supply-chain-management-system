"use client";

import { useState } from "react";
import {
  PLACEHOLDERS,
  SEVERITIES,
  TRIGGERS,
  render,
  type NotifTarget,
  type Rule,
  type Severity,
} from "@/lib/notification-types";
import { createRule, deleteRule, toggleRule, updateRule } from "@/lib/actions";
import { ActionForm, Submit } from "@/components/ActionForm";
import {
  Badge,
  Button,
  Card,
  Empty,
  Input,
  Modal,
  NumberInput,
  Note,
  SelectField,
  Textarea,
} from "@/components/geist";
import type { BadgeTone } from "@/components/geist/Feedback";
import { useOpenParam } from "@/components/useOpenParam";

const severityTone: Record<Severity, BadgeTone> = {
  info: "blue",
  warning: "amber",
  critical: "red",
};
const severityLabel: Record<Severity, string> = {
  info: "اطلاع",
  warning: "هشدار",
  critical: "بحرانی",
};

const PAYMENT_STATUSES = ["پرداخت‌نشده", "بخشی پرداخت‌شده", "سررسید گذشته", "تسویه‌شده"];
const SHIPMENT_STATUSES = [
  "در انتظار تحویل به کارگو",
  "تحویل به کارگو",
  "در مسیر",
  "تحویل‌شده",
];

/** نمونه مقادیر برای پیش‌نمایش، تا کاربر ببیند اعلانش چه شکلی می‌شود */
const SAMPLE: Record<NotifTarget, Record<string, string>> = {
  invoice: {
    "شماره": "INV-001",
    "تأمین‌کننده": "Ningbo Trade Co",
    "مبلغ": "77٬520",
    "پرداختی": "30٬000",
    "مانده": "47٬520",
    "ارز": "RMB",
    "سررسید": "1404/03/20",
    "وضعیت": "بخشی پرداخت‌شده",
    "روز": "3",
  },
  shipment: {
    "شماره": "SHP-001",
    "فاکتور": "INV-001",
    "کارگو": "Sky Cargo",
    "نوع_حمل": "هوایی",
    "رهگیری": "TRK-77",
    "تعداد": "600",
    "دریافتی": "480",
    "وضعیت": "در مسیر",
    "روز": "10",
  },
};

function RuleForm({
  rule,
  onDone,
}: {
  rule?: Rule;
  onDone: () => void;
}) {
  const [target, setTarget] = useState<NotifTarget>(rule?.target ?? "invoice");
  const [trigger, setTrigger] = useState(rule?.trigger_type ?? "due_soon");
  const [title, setTitle] = useState(rule?.title_template ?? "سررسید فاکتور {شماره} نزدیک است");
  const [body, setBody] = useState(
    rule?.body_template ??
      "فاکتور {شماره} از {تأمین‌کننده} تا {روز} روز دیگر سررسید می‌شود. مانده: {مانده} {ارز}"
  );

  const triggersFor = Object.entries(TRIGGERS).filter(([, t]) => t.target === target);
  const spec = TRIGGERS[trigger];
  const statuses = target === "invoice" ? PAYMENT_STATUSES : SHIPMENT_STATUSES;
  const vars = SAMPLE[target];

  function switchTarget(next: string) {
    const t = next as NotifTarget;
    setTarget(t);
    const first = Object.entries(TRIGGERS).find(([, x]) => x.target === t)?.[0];
    if (first) setTrigger(first);
  }

  return (
    <ActionForm action={rule ? updateRule : createRule} className="grid gap-4">
      {rule && <input type="hidden" name="id" value={rule.id} />}
      {rule && <input type="hidden" name="is_active" value={rule.is_active ? "on" : "off"} />}
      <input type="hidden" name="target" value={target} />
      <input type="hidden" name="trigger_type" value={trigger} />

      <Input name="name" label="نام قالب" defaultValue={rule?.name ?? ""} required
             placeholder="مثلاً: یادآوری سررسید" />

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          name="_target_ui"
          label="درباره چه چیزی؟"
          value={target}
          onChange={switchTarget}
          options={[
            { value: "invoice", label: "فاکتور و پرداخت" },
            { value: "shipment", label: "پارت ارسال" },
          ]}
        />
        <SelectField
          name="_trigger_ui"
          label="چه وقت؟"
          value={trigger}
          onChange={setTrigger}
          options={triggersFor.map(([k, t]) => ({ value: k, label: t.label }))}
        />
      </div>

      {spec && <Note>{spec.help}</Note>}

      <div className="grid gap-4 sm:grid-cols-2">
        {spec?.needsDays && (
          <NumberInput
            name="offset_days"
            label="تعداد روز"
            defaultValue={rule?.offset_days ?? 3}
          />
        )}
        {spec?.needsStatus && (
          <SelectField
            name="match_status"
            label="وضعیت موردنظر"
            defaultValue={rule?.match_status ?? statuses[0]}
            options={statuses}
          />
        )}
        <SelectField
          name="severity"
          label="اهمیت"
          defaultValue={rule?.severity ?? "warning"}
          options={SEVERITIES.map((s) => ({ value: s.value, label: s.label }))}
        />
      </div>

      <Input
        name="title_template"
        label="عنوان اعلان"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />
      <Textarea
        name="body_template"
        label="متن اعلان"
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
      />

      <div>
        <p className="mb-2 text-xs font-medium text-[var(--geist-secondary)]">
          متغیرهای قابل استفاده — روی هرکدام بزنید تا به متن اضافه شود:
        </p>
        <div className="flex flex-wrap gap-1.5">
          {PLACEHOLDERS[target].map((p) => (
            <button
              key={p.key}
              type="button"
              title={p.desc}
              onClick={() => setBody((b: string) => `${b}{${p.key}}`)}
              className="num rounded-[var(--geist-radius)] border border-[var(--geist-border)] px-2 py-1 text-xs text-[var(--geist-secondary)] transition hover:border-[var(--geist-foreground)] hover:text-[var(--geist-foreground)]"
            >
              {`{${p.key}}`}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-[var(--geist-radius-lg)] border border-[var(--geist-border)] bg-[var(--geist-background-subtle)] p-3">
        <p className="mb-2 text-xs font-medium text-[var(--geist-secondary)]">پیش‌نمایش</p>
        <p className="text-sm font-medium">{render(title, vars) || "—"}</p>
        <p className="mt-1 text-sm leading-6 text-[var(--geist-secondary)]">
          {render(body, vars) || "—"}
        </p>
      </div>

      <div className="flex gap-2">
        <Submit>{rule ? "ذخیره" : "ساخت قالب"}</Submit>
        <Button onClick={onDone}>انصراف</Button>
      </div>
    </ActionForm>
  );
}

export function RulesClient({ rules }: { rules: Rule[] }) {
  const [creating, setCreating] = useOpenParam("rule");
  const [editing, setEditing] = useState<Rule | null>(null);

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button variant="primary" onClick={() => setCreating(true)}>
          + قالب جدید
        </Button>
      </div>

      <Card>
        {rules.length === 0 ? (
          <Empty title="هنوز قالبی نساخته‌اید">
            یک قالب بسازید تا برنامه خودش موارد مهم را به شما یادآوری کند
          </Empty>
        ) : (
          <ul className="divide-y divide-[var(--geist-border)]">
            {rules.map((r) => {
              const spec = TRIGGERS[r.trigger_type];
              return (
                <li key={r.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      {r.name}
                      <Badge tone={severityTone[r.severity]}>{severityLabel[r.severity]}</Badge>
                      <Badge tone={r.is_active ? "green" : "gray"}>
                        {r.is_active ? "فعال" : "غیرفعال"}
                      </Badge>
                    </p>
                    <p className="mt-1 text-xs text-[var(--geist-secondary)]">
                      {r.target === "invoice" ? "فاکتور" : "پارت ارسال"} — {spec?.label ?? r.trigger_type}
                      {r.offset_days !== null && ` (${r.offset_days} روز)`}
                      {r.match_status && ` (${r.match_status})`}
                    </p>
                    <p className="mt-1.5 text-sm text-[var(--geist-secondary)]">{r.title_template}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button size="tiny" variant="tertiary" onClick={() => setEditing(r)}>
                      ویرایش
                    </Button>
                    <form action={toggleRule}>
                      <input type="hidden" name="id" value={r.id} />
                      <Button htmlType="submit" size="tiny" variant="tertiary">
                        {r.is_active ? "غیرفعال" : "فعال"}
                      </Button>
                    </form>
                    <form action={deleteRule}>
                      <input type="hidden" name="id" value={r.id} />
                      <Button
                        htmlType="submit"
                        size="tiny"
                        variant="tertiary"
                        className="!text-[var(--geist-red-text)]"
                        confirm={`قالب «${r.name}» و همه اعلان‌هایش حذف شود؟`}
                      >
                        حذف
                      </Button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Modal open={creating} onClose={() => setCreating(false)} title="قالب اعلان جدید" footer={null} width={640}>
        <RuleForm onDone={() => setCreating(false)} />
      </Modal>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing ? `ویرایش «${editing.name}»` : ""}
        footer={null}
        width={640}
      >
        {editing && <RuleForm key={editing.id} rule={editing} onDone={() => setEditing(null)} />}
      </Modal>
    </>
  );
}
