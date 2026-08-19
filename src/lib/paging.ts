/** ابزار صفحه‌بندی سمت سرور — پارامترها از URL می‌آیند */

export type PageParams = {
  page: number;
  limit: number;
  q: string;
  sort: string;
  dir: "asc" | "desc";
};

export type Paged<T> = {
  rows: T[];
  total: number;
  page: number;
  limit: number;
  pageCount: number;
  q: string;
  sort: string;
  dir: "asc" | "desc";
};

export const LIMITS = [10, 25, 50, 100];
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 200;

/**
 * پارامترهای خام URL را تمیز می‌کند.
 * ستون مرتب‌سازی باید در فهرست مجاز باشد تا تزریق SQL ممکن نشود.
 */
export function parseParams(
  raw: Record<string, string | string[] | undefined>,
  allowedSorts: readonly string[],
  fallbackSort: string
): PageParams {
  const one = (k: string) => {
    const v = raw[k];
    return Array.isArray(v) ? v[0] : v;
  };

  const page = Math.max(1, Number(one("page")) || 1);
  const limitRaw = Number(one("limit")) || DEFAULT_LIMIT;
  const limit = Math.min(MAX_LIMIT, Math.max(1, limitRaw));
  const q = (one("q") ?? "").trim().slice(0, 100);

  const askedSort = one("sort") ?? "";
  const sort = allowedSorts.includes(askedSort) ? askedSort : fallbackSort;
  const dir = one("dir") === "asc" ? "asc" : "desc";

  return { page, limit, q, sort, dir };
}

export function paged<T>(rows: T[], total: number, p: PageParams): Paged<T> {
  return {
    rows,
    total,
    page: p.page,
    limit: p.limit,
    pageCount: Math.max(1, Math.ceil(total / p.limit)),
    q: p.q,
    sort: p.sort,
    dir: p.dir,
  };
}

/** الگوی جست‌وجوی ILIKE */
export function like(q: string): string {
  return `%${q.replace(/[%_]/g, (m) => "\\" + m)}%`;
}
