import postgres from "postgres";

declare global {
  // eslint-disable-next-line no-var
  var __sql: ReturnType<typeof postgres> | undefined;
}

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL تعریف نشده است");

export const sql =
  global.__sql ??
  postgres(url, {
    ssl: url.includes("localhost") ? false : "require",
    max: 5,
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

if (process.env.NODE_ENV !== "production") global.__sql = sql;
