"use client";

import { useState } from "react";
import {
  changeOwnPassword,
  createUser,
  resetPassword,
  updateUserAccess,
} from "@/lib/actions";
import {
  PERMISSIONS,
  ROLES,
  effectivePermissions,
  roleDefaults,
  type PermissionKey,
} from "@/lib/permissions";
import { ActionForm, Submit } from "@/components/ActionForm";
import { Button, Card, Input, Modal, Note, SelectField } from "@/components/geist";

export function CreateUserModal({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  return (
    <Modal open={open} onClose={() => setOpen(false)} title="کاربر جدید" footer={null}>
      <ActionForm action={createUser} className="grid gap-4 sm:grid-cols-2" resetOnSuccess>
        <Input name="first_name" label="نام" required />
        <Input name="last_name" label="نام خانوادگی" required />
        <Input name="phone" label="شماره موبایل" dir="ltr" placeholder="09121234567" required />
        <Input name="password" label="رمز عبور" type="password" minLength={6} required />
        <div className="sm:col-span-2">
          <SelectField
            name="role"
            label="نقش"
            defaultValue="staff"
            options={ROLES.map((r) => ({ value: r.value, label: `${r.label} — ${r.description}` }))}
          />
        </div>
        <div className="flex gap-2 sm:col-span-2">
          <Submit>افزودن کاربر</Submit>
          <Button onClick={() => setOpen(false)}>بستن</Button>
        </div>
      </ActionForm>
    </Modal>
  );
}

export function NewUserTrigger() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        + کاربر جدید
      </Button>
      <CreateUserModal open={open} setOpen={setOpen} />
    </>
  );
}

export function ResetPasswordButton({ id, name }: { id: number; name: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="tiny" variant="tertiary" onClick={() => setOpen(true)}>
        تغییر رمز
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`رمز جدید برای ${name}`}
        description="رمز فعلی قابل بازیابی نیست؛ رمز تازه‌ای بگذارید و به کاربر بدهید."
        footer={null}
        width={420}
      >
        <ActionForm action={resetPassword} className="grid gap-4">
          <input type="hidden" name="id" value={id} />
          <Input name="password" label="رمز جدید" type="password" minLength={6} required />
          <div className="flex gap-2">
            <Submit>ثبت رمز جدید</Submit>
            <Button onClick={() => setOpen(false)}>بستن</Button>
          </div>
        </ActionForm>
      </Modal>
    </>
  );
}

export function ChangeOwnPasswordCard() {
  return (
    <Card title="تغییر رمز عبور خودم">
      <ActionForm action={changeOwnPassword} className="grid gap-4 p-4 sm:grid-cols-3" resetOnSuccess>
        <Input name="current_password" label="رمز فعلی" type="password" required />
        <Input name="password" label="رمز جدید" type="password" minLength={6} required />
        <div className="flex items-end">
          <Submit>تغییر رمز</Submit>
        </div>
      </ActionForm>
    </Card>
  );
}

export function EditUserButton({
  id,
  first,
  last,
  phone,
}: {
  id: number;
  first: string;
  last: string;
  phone: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="tiny" variant="tertiary" onClick={() => setOpen(true)}>
        ویرایش
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={`ویرایش ${first} ${last}`} footer={null} width={420}>
        <form
          action={async (fd) => {
            const { updateUser } = await import("@/lib/actions");
            await updateUser(fd);
            setOpen(false);
          }}
          className="grid gap-4"
        >
          <input type="hidden" name="id" value={id} />
          <Input name="first_name" label="نام" defaultValue={first} />
          <Input name="last_name" label="نام خانوادگی" defaultValue={last} />
          <Input name="phone" label="شماره موبایل" dir="ltr" defaultValue={phone} />
          <div className="flex gap-2">
            <Button htmlType="submit" variant="primary">
              ذخیره
            </Button>
            <Button onClick={() => setOpen(false)}>انصراف</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}


/** ویرایش نقش و دسترسی‌های یک کاربر */
export function AccessButton({
  id,
  name,
  role,
  overrides,
}: {
  id: number;
  name: string;
  role: string;
  overrides: PermissionKey[] | null;
}) {
  const [open, setOpen] = useState(false);
  const [pickedRole, setPickedRole] = useState(role);
  const [custom, setCustom] = useState(overrides !== null);
  const [perms, setPerms] = useState<PermissionKey[]>(
    overrides ?? effectivePermissions(role, null)
  );

  const shown = custom ? perms : roleDefaults(pickedRole);
  const roleInfo = ROLES.find((r) => r.value === pickedRole);

  function toggle(key: PermissionKey) {
    setPerms((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]));
  }

  function switchRole(next: string) {
    setPickedRole(next);
    // با تغییر نقش، انتخاب دستی از پیش‌فرض همان نقش شروع شود
    if (custom) setPerms(roleDefaults(next));
  }

  return (
    <>
      <Button size="tiny" variant="tertiary" onClick={() => setOpen(true)}>
        نقش و دسترسی
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`نقش و دسترسی ${name}`}
        description="نقش، یک مجموعه دسترسی پیش‌فرض می‌دهد؛ در صورت نیاز می‌توانید همان را دستی تغییر دهید."
        footer={null}
        width={560}
      >
        <ActionForm action={updateUserAccess} className="grid gap-4">
          <input type="hidden" name="id" value={id} />

          <SelectField
            name="role"
            label="نقش"
            value={pickedRole}
            onChange={switchRole}
            options={ROLES.map((r) => ({ value: r.value, label: r.label }))}
          />
          {roleInfo && <Note>{roleInfo.description}</Note>}

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="use_defaults"
              checked={!custom}
              onChange={(e) => {
                setCustom(!e.target.checked);
                if (!e.target.checked) setPerms(roleDefaults(pickedRole));
              }}
              className="!h-4 !w-4 !p-0"
            />
            دسترسی‌ها را از پیش‌فرض همین نقش بگیر
          </label>

          <div className="grid gap-2 rounded-[var(--geist-radius-lg)] border border-[var(--geist-border)] p-3 sm:grid-cols-2">
            {PERMISSIONS.map((p) => {
              const on = shown.includes(p.key);
              const locked = !custom || p.key === "dashboard";
              return (
                <label
                  key={p.key}
                  className={`flex items-center gap-2 text-sm ${
                    locked ? "opacity-60" : "cursor-pointer"
                  }`}
                >
                  <input
                    type="checkbox"
                    name={`perm_${p.key}`}
                    checked={on}
                    disabled={locked}
                    onChange={() => toggle(p.key)}
                    className="!h-4 !w-4 !p-0"
                  />
                  {p.label}
                </label>
              );
            })}
          </div>

          <div className="flex gap-2">
            <Submit>ذخیره دسترسی‌ها</Submit>
            <Button onClick={() => setOpen(false)}>انصراف</Button>
          </div>
        </ActionForm>
      </Modal>
    </>
  );
}
