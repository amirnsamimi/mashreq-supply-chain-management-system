import Link from "next/link";
import { Card, Empty } from "@/components/geist";

export default function ShareNotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md items-center px-4">
      <Card className="w-full">
        <Empty title="این لینک دیگر کار نمی‌کند">
          ممکن است صاحب فاکتور آن را غیرفعال کرده باشد یا آدرس اشتباه باشد. اگر کاربر سیستم هستید{" "}
          <Link href="/login" className="underline">
            وارد شوید
          </Link>
          .
        </Empty>
      </Card>
    </main>
  );
}
