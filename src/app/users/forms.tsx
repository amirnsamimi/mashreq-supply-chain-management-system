"use client";

import { useState } from "react";
import { changeOwnPassword, createUser, resetPassword } from "@/lib/actions";
import { ActionForm, Submit } from "@/components/ActionForm";
import { Button, Card, Input, Modal } from "@/components/geist";

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
