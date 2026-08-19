"use client";

import { forwardRef } from "react";
import { useFormStatus } from "react-dom";
import { Spinner } from "./Spinner";

export type ButtonType = "primary" | "secondary" | "tertiary" | "error" | "warning";
export type ButtonSize = "tiny" | "small" | "medium" | "large";

/* اندازه‌های استاندارد Geist: 24 / 32 / 40 / 48 پیکسل */
const sizes: Record<ButtonSize, string> = {
  tiny: "h-6 px-1.5 text-xs gap-1 rounded-[var(--geist-radius)]",
  small: "h-8 px-3 text-sm gap-1.5 rounded-[var(--geist-radius)]",
  medium: "h-10 px-3 text-sm gap-2 rounded-[var(--geist-radius)]",
  large: "h-12 px-4 text-base gap-2 rounded-[var(--geist-radius-lg)]",
};

const types: Record<ButtonType, string> = {
  primary:
    "bg-[var(--geist-foreground)] text-[var(--geist-background)] border border-[var(--geist-foreground)] hover:bg-[var(--geist-background)] hover:text-[var(--geist-foreground)]",
  secondary:
    "bg-[var(--geist-background)] text-[var(--geist-secondary)] border border-[var(--geist-border)] hover:text-[var(--geist-foreground)] hover:border-[var(--geist-foreground)]",
  tertiary:
    "bg-transparent text-[var(--geist-secondary)] border border-transparent hover:text-[var(--geist-foreground)] hover:bg-[var(--geist-gray-100)]",
  error:
    "bg-[var(--geist-red)] text-white border border-[var(--geist-red)] hover:bg-[var(--geist-background)] hover:text-[var(--geist-red-text)]",
  warning:
    "bg-[var(--geist-amber)] text-black border border-[var(--geist-amber)] hover:bg-[var(--geist-background)] hover:text-[var(--geist-amber-text)]",
};

export type ButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type" | "prefix"> & {
  variant?: ButtonType;
  size?: ButtonSize;
  loading?: boolean;
  /** دکمه را هم‌عرض ظرفش می‌کند */
  block?: boolean;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  htmlType?: "button" | "submit" | "reset";
  /** پیش از اجرا این متن را تأیید می‌گیرد */
  confirm?: string;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "secondary",
    size = "medium",
    loading = false,
    block = false,
    prefix,
    suffix,
    htmlType = "button",
    confirm,
    disabled,
    onClick,
    className = "",
    children,
    ...rest
  },
  ref
) {
  return (
    <button
      ref={ref}
      type={htmlType}
      disabled={disabled || loading}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
      className={`inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-medium leading-none transition-colors duration-150 disabled:cursor-not-allowed disabled:border-[var(--geist-border)] disabled:bg-[var(--geist-gray-100)] disabled:text-[var(--geist-tertiary)] ${sizes[size]} ${types[variant]} ${block ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {loading ? (
        <Spinner size={size === "tiny" ? 12 : 16} />
      ) : (
        prefix && <span className="inline-flex shrink-0">{prefix}</span>
      )}
      {children}
      {suffix && !loading && <span className="inline-flex shrink-0">{suffix}</span>}
    </button>
  );
});

/**
 * دکمهٔ ارسال فرم که خودش حالت «در حال ارسال» را از وضعیت فرم می‌گیرد.
 * باید داخل یک <form> با اکشن سروری باشد.
 */
export function SubmitButton(props: Omit<ButtonProps, "htmlType" | "loading">) {
  const { pending } = useFormStatus();
  return <Button {...props} htmlType="submit" loading={pending} />;
}
