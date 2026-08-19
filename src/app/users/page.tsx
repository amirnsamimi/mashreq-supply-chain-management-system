import { requireAuth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { jalali } from "@/lib/format";
import { deleteUser, toggleUserActive } from "@/lib/actions";
import { Page } from "@/components/Nav";
import { Badge, Button, Card, Empty, Note } from "@/components/geist";
import { statusTone } from "@/lib/tones";
import {
  ChangeOwnPasswordCard,
  EditUserButton,
  NewUserTrigger,
  ResetPasswordButton,
} from "./forms";

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
      title="کاربران"
      user={`${me.first_name} ${me.last_name}`}
      action={<NewUserTrigger />}
    >
      <Card>
        {users.length === 0 ? (
          <Empty title="کاربری وجود ندارد" />
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
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const id = Number(u.id);
                  const isMe = id === me.id;
                  const first = String(u.first_name);
                  const last = String(u.last_name);
                  const status = u.is_active ? "فعال" : "غیرفعال";
                  return (
                    <tr key={id}>
                      <td className="font-medium">
                        {first}
                        {isMe && (
                          <span className="mr-2 text-xs text-[var(--geist-tertiary)]">(شما)</span>
                        )}
                      </td>
                      <td>{last}</td>
                      <td className="num" dir="ltr">
                        {String(u.phone)}
                      </td>
                      <td>
                        <Badge tone={statusTone(status)}>{status}</Badge>
                      </td>
                      <td>{jalali(String(u.created_at))}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          <EditUserButton id={id} first={first} last={last} phone={String(u.phone)} />
                          <ResetPasswordButton id={id} name={`${first} ${last}`} />
                          {!isMe && (
                            <>
                              <form action={toggleUserActive}>
                                <input type="hidden" name="id" value={id} />
                                <Button
                                  htmlType="submit"
                                  size="tiny"
                                  variant="tertiary"
                                  confirm={
                                    u.is_active
                                      ? `دسترسی ${first} ${last} قطع شود؟`
                                      : `${first} ${last} دوباره فعال شود؟`
                                  }
                                >
                                  {u.is_active ? "غیرفعال" : "فعال"}
                                </Button>
                              </form>
                              <form action={deleteUser}>
                                <input type="hidden" name="id" value={id} />
                                <Button
                                  htmlType="submit"
                                  size="tiny"
                                  variant="tertiary"
                                  className="!text-[var(--geist-red-text)]"
                                  confirm={`کاربر ${first} ${last} برای همیشه حذف شود؟`}
                                >
                                  حذف
                                </Button>
                              </form>
                            </>
                          )}
                        </div>
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
        <ChangeOwnPasswordCard />
      </div>

      <div className="mt-4">
        <Note>
          همه کاربران دسترسی یکسان دارند. رمزها با scrypt و نمک تصادفی ذخیره می‌شوند و قابل بازیابی
          نیستند؛ برای کاربری که رمزش را فراموش کرده از «تغییر رمز» استفاده کنید.
        </Note>
      </div>
    </Page>
  );
}
