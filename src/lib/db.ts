import postgres from "postgres";

type Sql = ReturnType<typeof postgres>;

declare global {
  // eslint-disable-next-line no-var
  var __sql: Sql | undefined;
}

function connect(): Sql {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL تعریف نشده است. یک کپی از .env.example به نام .env.local بسازید و پرش کنید."
    );
  }

  const local = url.includes("localhost") || url.includes("127.0.0.1");
  return postgres(url, {
    ssl: local ? false : "require",
    // روی سرورهای بدون‌حالت (مثل Vercel) هر نمونه اتصال خودش را دارد،
    // پس تعداد را کم نگه می‌داریم و برای Neon از رشته اتصال pooler استفاده کنید
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
    idle_timeout: 20,
    connect_timeout: 10,
    transform: { undefined: null },
    // ستون‌های date به‌صورت رشته YYYY-MM-DD برگردند، نه شیء Date
    types: {
      date: {
        to: 1082,
        from: [1082],
        serialize: (x: unknown) => x as string,
        parse: (x: string) => x,
      },
    },
  });
}

/**
 * اتصال با اولین استفاده ساخته می‌شود، نه هنگام import.
 * این‌طور `next build` بدون DATABASE_URL هم کار می‌کند.
 */
export const sql: Sql = new Proxy((() => {}) as unknown as Sql, {
  apply(_target, _thisArg, args: unknown[]) {
    const client = (global.__sql ??= connect());
    return (client as unknown as (...a: unknown[]) => unknown)(...args);
  },
  get(_target, prop) {
    const client = (global.__sql ??= connect());
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === "function" ? value.bind(client) : value;
  },
}) as Sql;
