"use client";

import { useEffect, useState } from "react";
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from "chart.js";
import { Chart as ReactChart } from "react-chartjs-2";

ChartJS.register(
  BarController, BarElement, LineController, LineElement, PointElement,
  CategoryScale, LinearScale, Tooltip, Legend, Filler
);

/**
 * پالت نمودار — با اسکریپت اعتبارسنجی دیتاویز بررسی شده است:
 * جداپذیری کوررنگی و کنتراست در هر دو حالت روشن و تیره پاس می‌شود.
 */
export const SERIES = {
  light: ["#2a78d6", "#eb6834", "#1baf7a"],
  dark: ["#3987e5", "#d95926", "#199e70"],
};
/** رمپ تک‌رنگ برای بزرگی (کم → زیاد) */
export const RAMP = {
  light: ["#86b6ef", "#5598e7", "#2a78d6", "#184f95"],
  dark: ["#184f95", "#256abf", "#3987e5", "#86b6ef"],
};

type Mode = "light" | "dark";

/** حالت رنگی فعلی را می‌خواند و با تغییرش دوباره رندر می‌کند */
export function useChartMode(): Mode {
  const [mode, setMode] = useState<Mode>("light");

  useEffect(() => {
    const read = (): Mode => {
      const stamped = document.documentElement.getAttribute("data-theme");
      if (stamped === "dark") return "dark";
      if (stamped === "light") return "light";
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    };
    setMode(read());

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onMq = () => setMode(read());
    mq.addEventListener("change", onMq);

    const observer = new MutationObserver(() => setMode(read()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    return () => {
      mq.removeEventListener("change", onMq);
      observer.disconnect();
    };
  }, []);

  return mode;
}

export function chartInk(mode: Mode) {
  return mode === "dark"
    ? { text: "#c3c2b7", muted: "#898781", grid: "#2c2c2a", surface: "#000000" }
    : { text: "#52514e", muted: "#898781", grid: "#e1e0d9", surface: "#ffffff" };
}

const enNum = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

/**
 * برچسب محورها با رقم لاتین نوشته می‌شود: canvas ترکیب رقم فارسی و پسوند
 * فارسی را وارونه می‌چیند. اعداد فارسی در کارت‌ها و جدول‌ها سر جایشان هستند.
 */
export function shortNum(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return enNum.format(v / 1_000_000) + "M";
  if (abs >= 1_000) return enNum.format(v / 1_000) + "k";
  return enNum.format(v);
}

export function ChartBox({
  title,
  subtitle,
  height = 260,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  height?: number;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <section className="rounded-[var(--geist-radius-lg)] border border-[var(--geist-border)] bg-[var(--geist-background)] p-4">
      <h3 className="text-sm font-medium">{title}</h3>
      {subtitle && <p className="mt-0.5 text-xs text-[var(--geist-tertiary)]">{subtitle}</p>}
      <div className="mt-4" style={{ height }}>
        {children}
      </div>
      {footer && <div className="mt-3 text-xs text-[var(--geist-tertiary)]">{footer}</div>}
    </section>
  );
}

export function BaseChart({
  type,
  data,
  options,
  horizontal = false,
}: {
  type: "bar" | "line";
  data: ChartData<"bar" | "line">;
  options?: ChartOptions<"bar" | "line">;
  /** میله افقی: محور مقدار x می‌شود، پس فرمت اعداد جابه‌جا می‌شود */
  horizontal?: boolean;
}) {
  const mode = useChartMode();
  const ink = chartInk(mode);

  const merged: ChartOptions<"bar" | "line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    layout: { padding: { top: 4 } },
    plugins: {
      legend: {
        display: false,
        position: "top",
        align: "end",
        labels: {
          color: ink.text,
          usePointStyle: true,
          pointStyle: "circle",
          boxWidth: 8,
          boxHeight: 8,
          padding: 14,
          font: { family: "var(--font-vazirmatn)", size: 12 },
        },
      },
      tooltip: {
        backgroundColor: mode === "dark" ? "#1a1a19" : "#ffffff",
        titleColor: mode === "dark" ? "#ffffff" : "#0b0b0b",
        bodyColor: ink.text,
        borderColor: mode === "dark" ? "#2c2c2a" : "#e1e0d9",
        borderWidth: 1,
        padding: 10,
        cornerRadius: 6,
        displayColors: true,
        boxWidth: 8,
        boxHeight: 8,
        usePointStyle: true,
        rtl: true,
        titleFont: { family: "var(--font-vazirmatn)", size: 12, weight: 600 },
        bodyFont: { family: "var(--font-vazirmatn)", size: 12 },
      },
    },
    scales: {
      x: horizontal
        ? {
            grid: { color: ink.grid },
            border: { display: false },
            ticks: {
              color: ink.muted,
              font: { family: "var(--font-geist-mono)", size: 11 },
              callback: (v) => shortNum(Number(v)),
              maxTicksLimit: 5,
            },
          }
        : {
            grid: { display: false },
            border: { color: ink.grid },
            ticks: { color: ink.muted, font: { family: "var(--font-vazirmatn)", size: 11 } },
          },
      y: horizontal
        ? {
            grid: { display: false },
            border: { color: ink.grid },
            ticks: { color: ink.muted, font: { family: "var(--font-vazirmatn)", size: 11 } },
          }
        : {
            grid: { color: ink.grid },
            border: { display: false },
            ticks: {
              color: ink.muted,
              font: { family: "var(--font-geist-mono)", size: 11 },
              callback: (v) => shortNum(Number(v)),
              maxTicksLimit: 5,
            },
          },
    },
  };

  // ادغام عمیق تا options سفارشی، تنظیمات پایه محور و راهنما را پاک نکند
  const scales = merged.scales as Record<string, object>;
  const extra = (options?.scales ?? {}) as Record<string, object>;
  const final = {
    ...merged,
    ...options,
    plugins: { ...merged.plugins, ...options?.plugins },
    scales: {
      x: { ...scales.x, ...extra.x },
      y: { ...scales.y, ...extra.y },
    },
  } as ChartOptions<"bar" | "line">;

  return <ReactChart key={mode} type={type} data={data} options={final} />;
}
