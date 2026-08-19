import { requireAuth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { jalali } from "@/lib/format";
import { deleteUser, toggleUserActive, updateUser } from "@/lib/actions";
import { Page, Card, Badge, Field, Empty } from "@/components/ui";
import { Collapse } from "@/components/Collapse";
import { SubmitBtn } from "@/components/Confirm";
import { ChangeOwnPasswordForm, CreateUserForm, ResetPasswordForm } from "./forms";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const me = await requireAuth();
  const users = await sql`
    select id, phone, first_name, last_name, is_active, created_at::text as created_at
    from users order by id
  `;

  return (
    <Page
      active="/users"
      user={`${me.first_name} ${me.last_name}`}
      title="کاربران"
      action={
        <Collapse label="کاربر جدید">
          <CreateUserForm />
        </Collapse>
      }
    >
      <Card>
        {users.length === 0 ? (
          <Empty>کاربری وجود ندارد</Empty>
        ) : (
          <div className="scroll-x">
            <table>
              <thead>
                <tr>
                  <th>نام</th>
                  <th>نام خانوادگی</th>
                  <th>شماره موبایل</th>
                  <th>وضعیت</th>
                  <th>تاریخ ساخت</th>
                  <th></th>
                  <th></th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isMe = Number(u.id) === me.id;
                  const name = `${u.first_name} ${u.last_name}`;
                  return (
                    <tr key={String(u.id)}>
                      <td className="font-medium">
                        {String(u.first_name)}
                        {isMe && (
                          <span className="mr-2 text-xs text-[var(--geist-tertiary)]">(شما)</span>
                        )}
                      </td>
                      <td>{String(u.last_name)}</td>
                      <td className="num" dir="ltr">
                        {String(u.phone)}
                      </td>
                      <td>
                        <Badge>{u.is_active ? "فعال" : "غیرفعال"}</Badge>
                      </td>
                      <td>{jalali(String(u.created_at))}</td>
                      <td>
                        <details className="inline-block">
                          <summary className="cursor-pointer text-xs text-[var(--geist-tertiary)] transition hover:text-[var(--geist-foreground)]">
                            ویرایش
                          </summary>
                          <div className="absolute z-10 mt-2 w-64 rounded-[var(--geist-radius-lg)] border border-[var(--geist-border)] bg-[var(--geist-background)] p-3 shadow-[var(--geist-shadow)]">
                            <form action={updateUser} className="grid gap-2">
                              <input type="hidden" name="id" value={String(u.id)} />
                              <Field label="نام">
                                <input name="first_name" defaultValue={String(u.first_name)} />
                              </Field>
                              <Field label="نام خانوادگی">
                                <input name="last_name" defaultValue={String(u.last_name)} />
                              </Field>
                              <Field label="شماره موبایل">
                                <input name="phone" dir="ltr" defaultValue={String(u.phone)} />
                              </Field>
                              <SubmitBtn>ذخیره</SubmitBtn>
                            </form>
                          </div>
                        </details>
                      </td>
                      <td>
                        <ResetPasswordForm id={Number(u.id)} name={name} />
                      </td>
                      <td>
                        {!isMe && (
                          <div className="flex items-center gap-2">
                            <form action={toggleUserActive}>
                              <input type="hidden" name="id" value={String(u.id)} />
                              <SubmitBtn
                                variant="ghost"
                                className="!px-2 !py-1 !text-xs"
                                confirm={
                                  u.is_active
                                    ? `دسترسی ${name} قطع شود؟`
                                    : `${name} دوباره فعال شود؟`
                                }
                              >
                                {u.is_active ? "غیرفعال کردن" : "فعال کردن"}
                              </SubmitBtn>
                            </form>
                            <form action={deleteUser}>
                              <input type="hidden" name="id" value={String(u.id)} />
                              <SubmitBtn
                                variant="danger"
                                confirm={`کاربر ${name} برای همیشه حذف شود؟`}
                              >
                                حذف
                              </SubmitBtn>
                            </form>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="mt-4">
        <ChangeOwnPasswordForm />
      </div>

      <p className="mt-4 text-xs text-[var(--geist-tertiary)]">
        همه کاربران دسترسی یکسان دارند. رمزها با scrypt و نمک تصادفی ذخیره می‌شوند و قابل بازیابی
        نیستند؛ برای کاربری که رمزش را فراموش کرده، از «تغییر رمز» استفاده کنید.
      </p>
    </Page>
  );
}
