// اجرای اسکیما روی دیتابیس تعیین‌شده در DATABASE_URL
import { readFileSync } from "node:fs";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL تعریف نشده است");
  process.exit(1);
}

const sql = postgres(url, { ssl: url.includes("localhost") ? false : "require", max: 1 });
await sql.unsafe(readFileSync(new URL("../schema.sql", import.meta.url), "utf8"));
await sql.end();
console.log("✓ جداول ساخته شدند");
