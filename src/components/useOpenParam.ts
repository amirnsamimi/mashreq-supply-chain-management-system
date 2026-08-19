"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

/**
 * وضعیت باز/بسته یک دیالوگ که با آدرس هم قابل باز کردن است: ?new=<key>
 * این همان چیزی است که به راهنما اجازه می‌دهد فرم‌های داخل صفحه را هم نشان دهد.
 */
export function useOpenParam(key: string): [boolean, (v: boolean) => void] {
  const params = useSearchParams();
  const wanted = params.get("new") === key;
  const [open, setOpen] = useState(wanted);

  useEffect(() => {
    if (wanted) setOpen(true);
  }, [wanted]);

  return [open, setOpen];
}
