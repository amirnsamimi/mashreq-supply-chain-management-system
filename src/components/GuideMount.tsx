import { currentUser } from "@/lib/auth";
import { stepsFor } from "@/lib/guide";
import { guideSamples, guideState } from "@/lib/guideState";
import { GuideProvider } from "./GuideLauncher";

/**
 * راهنما را برای کاربر واردشده سوار می‌کند.
 * چون در چیدمان اصلی است، با جابه‌جایی بین صفحه‌ها بسته نمی‌شود.
 */
export async function GuideMount() {
  const me = await currentUser().catch(() => null);
  if (!me) return null;

  const [state, samples] = await Promise.all([
    guideState(me.id).catch(() => null),
    guideSamples().catch(() => ({ invoiceId: null, shipmentId: null })),
  ]);
  if (!state) return null;

  const steps = stepsFor(me.permissions, samples);

  // ورود اول = هنوز نه تمامش کرده و نه ردش کرده است
  const autoStart = state.completed_at === null && !state.skipped;

  return (
    <GuideProvider
      steps={steps}
      autoStart={autoStart}
      startAt={Math.min(state.last_step, Math.max(steps.length - 1, 0))}
    />
  );
}
