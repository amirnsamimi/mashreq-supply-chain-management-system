import { currentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { buildBackupWorkbook, recordBackup } from "@/lib/backup";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return new Response("unauthorized", { status: 401 });
  if (!user.permissions.includes("import")) return new Response("forbidden", { status: 403 });

  const { buffer, fingerprint, takenAt } = await buildBackupWorkbook(user);
  await recordBackup(user, fingerprint);
  await logAudit(user, "پشتیبان‌گیری", "backup", null, "دانلود پشتیبان کامل داده‌ها در اکسل");

  const stamp = takenAt.slice(0, 16).replace(/[-:]/g, "").replace("T", "-");
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(`پشتیبان-مشرقی-${stamp}`)}.xlsx`,
      "Cache-Control": "no-store",
    },
  });
}
