"use client";

import { useState } from "react";
import { Dropdown } from "./Combobox";
import type { ControlSize } from "./Input";

/**
 * انتخاب تک‌گزینه‌ای با ظاهر یکدست در همه مرورگرها.
 * جای <select> بومی را می‌گیرد و مثل آن با name در فرم ارسال می‌شود.
 */
export function SelectField({
  name,
  label,
  options,
  defaultValue = "",
  placeholder = "انتخاب کنید…",
  required,
  disabled,
  size = "medium",
  allowEmpty = false,
  emptyLabel = "—",
}: {
  name: string;
  label?: string;
  options: string[] | { value: string; label: string }[];
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  size?: ControlSize;
  allowEmpty?: boolean;
  emptyLabel?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const normalized = options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o
  );
  const list = allowEmpty ? [{ value: "", label: emptyLabel }, ...normalized] : normalized;

  return (
    <Dropdown
      name={name}
      label={label}
      options={list}
      value={value}
      onChange={setValue}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      size={size}
      clearable={allowEmpty}
    />
  );
}
