"use client";

import { useState } from "react";

const faDigits = /[۰-۹٠-٩]/g;
const faMap: Record<string, string> = {
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
  "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
  "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
};

/** رقم‌های فارسی/عربی را به لاتین تبدیل و کاراکترهای اضافه را حذف می‌کند */
function normalize(v: string): string {
  return v
    .replace(faDigits, (d) => faMap[d] ?? d)
    .replace(/[,\s٬]/g, "")
    .replace(/[^\d.-]/g, "");
}

/** جداکننده هزارگان را اضافه می‌کند و بخش اعشاری را دست‌نخورده نگه می‌دارد */
function group(v: string): string {
  if (v === "" || v === "-") return v;
  const neg = v.startsWith("-");
  const body = neg ? v.slice(1) : v;
  const [int, ...rest] = body.split(".");
  const withSep = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const dec = rest.length ? "." + rest.join("").replace(/\./g, "") : "";
  return (neg ? "-" : "") + withSep + dec;
}

/** صفرهای بی‌اثر انتهای اعشار را حذف می‌کند: 2100.000 → 2100 */
function trimZeros(v: string): string {
  return v.includes(".") ? v.replace(/0+$/, "").replace(/\.$/, "") : v;
}

/**
 * ورودی عدد با جداکننده هزارگان.
 * مقدار خام (بدون کاما) در یک input مخفی با نام واقعی ارسال می‌شود.
 */
export function NumberInput({
  name,
  defaultValue,
  placeholder,
  className = "",
  title,
}: {
  name: string;
  defaultValue?: string | number | null;
  placeholder?: string;
  className?: string;
  title?: string;
}) {
  const initial =
    defaultValue === null || defaultValue === undefined || defaultValue === ""
      ? ""
      : trimZeros(normalize(String(defaultValue)));
  const [display, setDisplay] = useState(group(initial));
  const raw = normalize(display);

  return (
    <>
      <input
        type="text"
        inputMode="decimal"
        dir="ltr"
        title={title}
        placeholder={placeholder}
        value={display}
        onChange={(e) => setDisplay(group(normalize(e.target.value)))}
        className={`num text-left ${className}`}
      />
      <input type="hidden" name={name} value={raw} />
    </>
  );
}
