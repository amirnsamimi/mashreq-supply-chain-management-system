import { requirePermission } from "@/lib/auth";
import { Page } from "@/components/Nav";
import { Button, Card, Note } from "@/components/geist";
import { ImportForm } from "./ImportForm";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const me = await requirePermission("import");
  return (
    <Page
      active="/import"
      title="ورود داده از اکسل"
      user={`${me.first_name} ${me.last_name}`}
      permissions={me.permissions}
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card
            title="بارگذاری فایل"
            action={
              <a href="/api/template" download>
                <Button size="small">دانلود فایل نمونه</Button>
              </a>
            }
          >
            <div className="p-4">
              <ImportForm />
            </div>
          </Card>
        </div>

        <Card title="فایل باید چه شکلی باشد؟">
          <div className="space-y-3 p-4 text-sm leading-7 text-[var(--geist-secondary)]">
            <p>
              اگر مطمئن نیستید، <b>فایل نمونه</b> را دانلود کنید: همه شیت‌ها و ستون‌ها با یک ردیف
              نمونه و یک شیت راهنما در آن آماده است.
            </p>
            <p>فایل <b>xlsx.</b> با همان شیت‌های فایل اصلی شما:</p>
            <ul className="list-inside list-disc space-y-1">
              <li><b>فاکتورها</b> — شماره فاکتور، فروشنده، تاریخ فاکتور، ارز، مبلغ کل فاکتور، تاریخ سررسید</li>
              <li><b>اقلام فاکتور</b> — شماره فاکتور، کد کالا/SKU، شرح کالا، تعداد فاکتور، قیمت واحد</li>
              <li><b>پارت‌های ارسال</b> — شماره پارت ارسال، نام کارگو، نوع حمل، تاریخ‌ها، هزینه حمل پارت</li>
              <li><b>تخصیص اقلام به ارسال</b> — شماره فاکتور، شماره پارت ارسال، کد کالا/SKU، تعداد ارسال‌شده</li>
              <li><b>پرداخت‌ها</b> — شماره فاکتور، تاریخ پرداخت، مبلغ پرداخت، روش پرداخت</li>
            </ul>
            <Note type="warning" title="نکته">
              ستون‌های محاسباتی (مانده، سرشکن حمل، وضعیت‌ها) خوانده نمی‌شوند چون برنامه خودش آن‌ها را
              حساب می‌کند. تاریخ‌ها هم شمسی و هم میلادی پذیرفته می‌شوند.
            </Note>
            <Note>
              فاکتور یا پارتی که شماره‌اش از قبل در سیستم باشد <b>دست‌نخورده</b> می‌ماند و دوباره ساخته
              نمی‌شود؛ پس اگر فایل را دو بار وارد کنید، داده تکراری ایجاد نمی‌شود.
            </Note>
          </div>
        </Card>
      </div>
    </Page>
  );
}
