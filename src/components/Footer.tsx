const REPO = "https://github.com/amirnsamimi/mashreq-supply-chain-management-system";

/** پانویس مشترک همه صفحه‌ها */
export function Footer() {
  return (
    <footer className="mt-4 border-t border-[var(--geist-border)] px-4 py-4 sm:px-5">
      <div className="mx-auto flex max-w-[1400px] flex-col items-center gap-2.5 text-center sm:flex-row sm:justify-between sm:text-right">
        <p dir="ltr" className="text-xs leading-6 text-[var(--geist-tertiary)]">
          Designed and developed by{" "}
          <span className="text-[var(--geist-secondary)]">Amir Samimi</span>
          <span className="num"> 2026</span> — built with{" "}
          <a
            href="https://claude.com/claude-code"
            target="_blank"
            rel="noreferrer noopener"
            className="text-[var(--geist-secondary)] underline underline-offset-2 transition hover:text-[var(--geist-foreground)]"
          >
            Claude
          </a>
          . Open source project.
        </p>
        <a
          href={REPO}
          target="_blank"
          rel="noreferrer noopener"
          title="View the source on GitHub"
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--geist-border)] px-2.5 py-1 text-xs text-[var(--geist-secondary)] transition hover:border-[var(--geist-foreground)] hover:text-[var(--geist-foreground)]"
        >
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
          </svg>
          GitHub
        </a>
      </div>
    </footer>
  );
}
