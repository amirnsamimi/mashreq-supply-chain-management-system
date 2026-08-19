"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { Input } from "./Input";
import { Button } from "./Button";
import { Empty } from "./Feedback";

export type Column<T> = {
  key: string;
  header: string;
  /** مقدار قابل مرتب‌سازی/جست‌وجو */
  value?: (row: T) => string | number | null | undefined;
  render?: (row: T) => React.ReactNode;
  align?: "start" | "end";
  /** برای ردیف جمع پایین جدول */
  total?: (rows: T[]) => React.ReactNode;
  sortable?: boolean;
  className?: string;
};

type Dir = "asc" | "desc";

export function DataTable<T extends { id: number | string }>({
  rows,
  columns,
  searchPlaceholder,
  pageSize = 25,
  emptyTitle = "چیزی برای نمایش نیست",
  emptyHint,
  emptyAction,
  toolbar,
  showTotals = true,
}: {
  rows: T[];
  columns: Column<T>[];
  searchPlaceholder?: string;
  pageSize?: number;
  emptyTitle?: string;
  emptyHint?: string;
  emptyAction?: React.ReactNode;
  toolbar?: React.ReactNode;
  showTotals?: boolean;
}) {
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [dir, setDir] = useState<Dir>("asc");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(pageSize);
  const deferredQ = useDeferredValue(q);

  const valueOf = (row: T, col: Column<T>) =>
    col.value ? col.value(row) : (row as Record<string, unknown>)[col.key];

  const filtered = useMemo(() => {
    const needle = deferredQ.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) =>
      columns.some((c) => String(valueOf(row, c) ?? "").toLowerCase().includes(needle))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, columns, deferredQ]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return filtered;
    const factor = dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = valueOf(a, col);
      const bv = valueOf(b, col);
      if (av == null && bv == null) return 0;
      if (av == null) return 1; // خالی‌ها همیشه آخر
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * factor;
      return String(av).localeCompare(String(bv), "fa") * factor;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, sortKey, dir, columns]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / size));
  const current = Math.min(page, pageCount);
  const visible = sorted.slice((current - 1) * size, current * size);
  const hasTotals = showTotals && columns.some((c) => c.total);

  function toggleSort(key: string) {
    if (sortKey === key) setDir(dir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setDir("asc");
    }
    setPage(1);
  }

  return (
    <div>
      {(searchPlaceholder || toolbar) && (
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--geist-border)] p-3">
          {searchPlaceholder && (
            <div className="w-full sm:max-w-xs">
              <Input
                size="small"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder={searchPlaceholder}
                prefix={
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-3.5-3.5" strokeLinecap="round" />
                  </svg>
                }
              />
            </div>
          )}
          <div className="mr-auto flex items-center gap-2">{toolbar}</div>
        </div>
      )}

      {sorted.length === 0 ? (
        <Empty title={emptyTitle} action={emptyAction}>
          {q ? `چیزی با «${q}» پیدا نشد` : emptyHint}
        </Empty>
      ) : (
        <>
          <div className="scroll-x">
            <table>
              <thead>
                <tr>
                  {columns.map((c) => {
                    const active = sortKey === c.key;
                    const canSort = c.sortable !== false;
                    return (
                      <th key={c.key} className={c.align === "end" ? "text-left" : undefined}>
                        {canSort ? (
                          <button
                            onClick={() => toggleSort(c.key)}
                            className={`inline-flex items-center gap-1 transition hover:text-[var(--geist-foreground)] ${
                              active ? "text-[var(--geist-foreground)]" : ""
                            }`}
                          >
                            {c.header}
                            <span className={active ? "opacity-100" : "opacity-0"}>
                              {dir === "asc" ? "↑" : "↓"}
                            </span>
                          </button>
                        ) : (
                          c.header
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr key={String(row.id)}>
                    {columns.map((c) => (
                      <td key={c.key} className={c.className}>
                        {c.render ? c.render(row) : String(valueOf(row, c) ?? "—")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              {hasTotals && (
                <tfoot>
                  <tr>
                    {columns.map((c, i) => (
                      <td key={c.key} className={c.className}>
                        {c.total
                          ? c.total(sorted)
                          : i === 0
                            ? `جمع ${sorted.length} ردیف`
                            : null}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {sorted.length > 10 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--geist-border)] px-3 py-2.5 text-xs text-[var(--geist-secondary)]">
              <span>
                نمایش <span className="num">{(current - 1) * size + 1}</span> تا{" "}
                <span className="num">{Math.min(current * size, sorted.length)}</span> از{" "}
                <span className="num">{sorted.length}</span>
              </span>
              <div className="flex items-center gap-2">
                <select
                  value={size}
                  onChange={(e) => {
                    setSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="h-7 w-auto cursor-pointer rounded-[var(--geist-radius)] border border-[var(--geist-border)] bg-[var(--geist-background)] px-2 text-xs"
                >
                  {[10, 25, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n} ردیف
                    </option>
                  ))}
                </select>
                <Button size="tiny" onClick={() => setPage(current - 1)} disabled={current <= 1}>
                  قبلی
                </Button>
                <span className="num">
                  {current} / {pageCount}
                </span>
                <Button
                  size="tiny"
                  onClick={() => setPage(current + 1)}
                  disabled={current >= pageCount}
                >
                  بعدی
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
