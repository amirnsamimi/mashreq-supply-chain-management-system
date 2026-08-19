export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <span
      role="status"
      aria-label="در حال بارگذاری"
      style={{ width: size, height: size }}
      className="relative inline-block shrink-0"
    >
      {Array.from({ length: 12 }).map((_, i) => (
        <span
          key={i}
          className="absolute left-[46.5%] top-[4.4%] h-[24%] w-[7%] origin-[center_212%] rounded-full bg-current"
          style={{
            transform: `rotate(${i * 30}deg)`,
            animation: "geist-spinner 1.2s linear infinite",
            animationDelay: `${-1.2 + i * 0.1}s`,
          }}
        />
      ))}
    </span>
  );
}
