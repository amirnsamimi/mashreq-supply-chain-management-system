import ExcelJS from "exceljs";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** ستون‌های هر شیت + یک ردیف نمونه، دقیقاً همان چیزی که importWorkbook می‌خواند */
const SHEETS: { name: string; columns: { header: string; width: number }[]; sample: unknown[] }[] = [
  {
    name: "کالاها",
    columns: [
      { header: "کد کالا/SKU", width: 16 },
      { header: "نام کالا", width: 30 },
      { header: "دسته", width: 16 },
      { header: "واحد", width: 10 },
      { header: "آخرین قیمت واحد", width: 16 },
      { header: "توضیحات", width: 30 },
    ],
    sample: ["SKU-1", "قطعه A", "قطعات یدکی", "عدد", 51, ""],
  },
  {
    name: "فاکتورها",
    columns: [
      { header: "شماره فاکتور", width: 18 },
      { header: "فروشنده", width: 24 },
      { header: "تاریخ فاکتور", width: 14 },
      { header: "ارز", width: 8 },
      { header: "مبلغ کل فاکتور", width: 16 },
      { header: "تاریخ سررسید", width: 14 },
      { header: "توضیحات", width: 30 },
    ],
    sample: ["INV-001", "Ningbo Trade Co", "1404/01/21", "RMB", 77520, "1404/03/20", ""],
  },
  {
    name: "اقلام فاکتور",
    columns: [
      { header: "شماره فاکتور", width: 18 },
      { header: "کد کالا/SKU", width: 16 },
      { header: "شرح کالا", width: 30 },
      { header: "تعداد فاکتور", width: 14 },
      { header: "قیمت واحد", width: 14 },
      { header: "توضیحات", width: 30 },
    ],
    sample: ["INV-001", "SKU-1", "قطعه A", 1000, 51, ""],
  },
  {
    name: "پارت‌های ارسال",
    columns: [
      { header: "شماره پارت ارسال", width: 18 },
      { header: "شماره فاکتور", width: 18 },
      { header: "نام کارگو", width: 20 },
      { header: "نوع حمل", width: 12 },
      { header: "شماره رهگیری", width: 18 },
      { header: "تاریخ تحویل به کارگو", width: 18 },
      { header: "تاریخ خروج", width: 14 },
      { header: "تاریخ دریافت", width: 14 },
      { header: "هزینه حمل پارت", width: 16 },
      { header: "وزن (کیلو)", width: 12 },
      { header: "حجم CBM", width: 12 },
      { header: "توضیحات", width: 30 },
    ],
    sample: ["SHP-001", "INV-001", "Sky Cargo", "هوایی", "TRK-77", "1404/01/26", "1404/01/28", "1404/02/05", 12000, 850, "", ""],
  },
  {
    name: "تخصیص اقلام به ارسال",
    columns: [
      { header: "شماره فاکتور", width: 18 },
      { header: "شماره پارت ارسال", width: 18 },
      { header: "کد کالا/SKU", width: 16 },
      { header: "تعداد ارسال‌شده در این پارت", width: 24 },
      { header: "تعداد دریافت‌شده از این پارت", width: 24 },
      { header: "توضیحات", width: 30 },
    ],
    sample: ["INV-001", "SHP-001", "SKU-1", 480, 480, ""],
  },
  {
    name: "پرداخت‌ها",
    columns: [
      { header: "شماره فاکتور", width: 18 },
      { header: "تاریخ پرداخت", width: 14 },
      { header: "مبلغ پرداخت", width: 16 },
      { header: "روش پرداخت", width: 14 },
      { header: "مرجع/رسید", width: 18 },
      { header: "توضیحات", width: 30 },
    ],
    sample: ["INV-001", "1404/01/31", 30000, "حواله", "R-1001", ""],
  },
];

const GUIDE = [
  ["راهنمای تکمیل فایل"],
  [""],
  ["۱. هر شیت را مطابق ستون‌های سطر اول پر کنید؛ نام شیت‌ها و عنوان ستون‌ها را تغییر ندهید."],
  ["۲. ردیف دوم هر شیت یک نمونه است؛ قبل از بارگذاری آن را پاک یا با داده خودتان جایگزین کنید."],
  ["۳. تاریخ‌ها هم شمسی (۱۴۰۴/۰۱/۲۶) و هم میلادی (2025-04-15) پذیرفته می‌شوند."],
  ["۴. «شماره فاکتور» و «شماره پارت ارسال» کلید ارتباط بین شیت‌ها هستند و باید دقیقاً یکسان نوشته شوند."],
  ["۵. در شیت «تخصیص اقلام به ارسال»، کد کالا باید با همان کدی که در «اقلام فاکتور» نوشته‌اید یکی باشد."],
  ["۶. شیت «کالاها» را اول پر کنید؛ اگر کالایی آنجا نباشد ولی در «اقلام فاکتور» بیاید، خودکار ساخته می‌شود."],
  ["۷. ستون‌های محاسباتی (مانده، سرشکن هزینه حمل، بهای تمام‌شده، وضعیت‌ها) لازم نیست؛ برنامه خودش حساب می‌کند."],
  ["۸. اگر شماره فاکتور یا پارتی از قبل در سیستم باشد، دست‌نخورده می‌ماند و دوباره ساخته نمی‌شود."],
];

export async function GET() {
  const user = await currentUser();
  if (!user) return new Response("unauthorized", { status: 401 });

  const wb = new ExcelJS.Workbook();
  wb.creator = "پیگیری فاکتور و ارسال";
  wb.views = [{ x: 0, y: 0, width: 10000, height: 20000, firstSheet: 0, activeTab: 0, visibility: "visible" }];

  const guide = wb.addWorksheet("راهنما", { views: [{ rightToLeft: true }] });
  guide.getColumn(1).width = 110;
  GUIDE.forEach((r) => guide.addRow(r));
  guide.getRow(1).font = { bold: true, size: 13 };
  guide.eachRow((row) => {
    row.alignment = { horizontal: "right", vertical: "middle", wrapText: true };
  });

  for (const sheet of SHEETS) {
    const ws = wb.addWorksheet(sheet.name, { views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }] });
    ws.columns = sheet.columns.map((c) => ({ header: c.header, width: c.width }));
    const header = ws.getRow(1);
    header.font = { bold: true };
    header.alignment = { horizontal: "center", vertical: "middle" };
    header.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F2F2" } };
      cell.border = { bottom: { style: "thin", color: { argb: "FFCCCCCC" } } };
    });
    const sample = ws.addRow(sheet.sample);
    sample.font = { color: { argb: "FF999999" }, italic: true };
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columns.length } };
  }

  const buffer = await wb.xlsx.writeBuffer();
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent("فایل-نمونه-ورود-داده")}.xlsx`,
      "Cache-Control": "no-store",
    },
  });
}
