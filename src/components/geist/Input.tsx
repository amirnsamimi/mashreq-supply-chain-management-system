"use client";

import { forwardRef, useId } from "react";

export type ControlSize = "small" | "medium" | "large";

export const controlHeights: Record<ControlSize, string> = {
  small: "h-8 text-sm",
  medium: "h-10 text-sm",
  large: "h-12 text-base",
};

export const controlBase =
  "w-full rounded-[var(--geist-radius)] border bg-[var(--geist-background)] text-[var(--geist-foreground)] outline-none transition-colors duration-150 placeholder:text-[var(--geist-tertiary)] disabled:cursor-not-allowed disabled:bg-[var(--geist-gray-100)] disabled:text-[var(--geist-tertiary)]";

export function controlBorder(error?: boolean) {
  return error
    ? "border-[var(--geist-red)] focus:border-[var(--geist-red)] focus:shadow-[0_0_0_3px_var(--geist-red-lighter)]"
    : "border-[var(--geist-border)] hover:border-[var(--geist-border-strong)] focus:border-[var(--geist-foreground)] focus:shadow-[0_0_0_3px_var(--geist-gray-alpha)]";
}

export function Label({
  htmlFor,
  children,
  required,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium text-[var(--geist-secondary)]">
      {children}
      {required && <span className="mr-1 text-[var(--geist-red-text)]">*</span>}
    </label>
  );
}

export function FieldError({ children }: { children?: string | null }) {
  if (!children) return null;
  return <p className="mt-1.5 text-xs text-[var(--geist-red-text)]">{children}</p>;
}

export type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "size" | "prefix"> & {
  label?: string;
  size?: ControlSize;
  error?: string | null;
  hint?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, size = "medium", error, hint, prefix, suffix, required, className = "", id, ...rest },
  ref
) {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <div className="w-full">
      {label && (
        <Label htmlFor={inputId} required={required}>
          {label}
        </Label>
      )}
      <div className="relative flex items-center">
        {prefix && (
          <span className="pointer-events-none absolute right-3 text-[var(--geist-tertiary)]">
            {prefix}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          required={required}
          aria-invalid={!!error}
          className={`${controlBase} ${controlBorder(!!error)} ${controlHeights[size]} px-3 ${prefix ? "pr-9" : ""} ${suffix ? "pl-9" : ""} ${className}`}
          {...rest}
        />
        {suffix && (
          <span className="pointer-events-none absolute left-3 text-[var(--geist-tertiary)]">
            {suffix}
          </span>
        )}
      </div>
      {hint && !error && <p className="mt-1.5 text-xs text-[var(--geist-tertiary)]">{hint}</p>}
      <FieldError>{error}</FieldError>
    </div>
  );
});

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string | null;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, required, className = "", id, ...rest },
  ref
) {
  const auto = useId();
  const areaId = id ?? auto;
  return (
    <div className="w-full">
      {label && (
        <Label htmlFor={areaId} required={required}>
          {label}
        </Label>
      )}
      <textarea
        ref={ref}
        id={areaId}
        required={required}
        className={`${controlBase} ${controlBorder(!!error)} py-2 px-3 text-sm ${className}`}
        {...rest}
      />
      <FieldError>{error}</FieldError>
    </div>
  );
});

export type SelectProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> & {
  label?: string;
  size?: ControlSize;
  error?: string | null;
  options?: { value: string; label: string }[];
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, size = "medium", error, options, required, className = "", id, children, ...rest },
  ref
) {
  const auto = useId();
  const selectId = id ?? auto;
  return (
    <div className="w-full">
      {label && (
        <Label htmlFor={selectId} required={required}>
          {label}
        </Label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          required={required}
          className={`${controlBase} ${controlBorder(!!error)} ${controlHeights[size]} cursor-pointer appearance-none pr-3 pl-9 ${className}`}
          {...rest}
        >
          {options
            ? options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))
            : children}
        </select>
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--geist-secondary)]"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
      <FieldError>{error}</FieldError>
    </div>
  );
});
