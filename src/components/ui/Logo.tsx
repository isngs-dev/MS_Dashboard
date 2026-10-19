import Image from "next/image";

type Props = {
  className?: string;
  /** "md" for the navbar, "lg" for the footer */
  size?: "md" | "lg";
  /** Makes the "MS Dashboard" wordmark a link (the navbar uses it to jump back to the top). */
  wordmarkHref?: string;
};

const SIZES = {
  md: { img: "h-6 sm:h-8", text: "text-[0.74rem] sm:text-lg", gap: "gap-1.5 sm:gap-3", divider: "h-5 sm:h-6" },
  lg: { img: "h-9", text: "text-xl", gap: "gap-3", divider: "h-7" },
} as const;

/**
 * Brand lockup: the iSN logo, a hairline divider and the "MS Dashboard" wordmark.
 * The logo is a tiny transparent PNG, served as-is (unoptimized) so it stays crisp.
 * The iSN mark links to the company site. Below 360px only the iSN mark is shown, so the navbar CTA never gets crowded.
 */
export default function Logo({ className, size = "md", wordmarkHref }: Props) {
  const s = SIZES[size];
  const wordmark = `whitespace-nowrap font-display font-bold tracking-tight text-espresso max-[359px]:hidden ${s.text}`;
  return (
    <span className={`inline-flex items-center ${s.gap} ${className ?? ""}`}>
      <a href="https://isngs.com/" target="_blank" rel="noopener" aria-label="iSN, opens isngs.com in a new tab" className="shrink-0 rounded-lg">
        <Image
          src="/brand/isn-logo.png"
          alt="iSN"
          width={250}
          height={96}
          unoptimized
          priority
          className={`${s.img} w-auto`}
        />
      </a>
      <span aria-hidden className={`${s.divider} w-px shrink-0 bg-taupe/45 max-[359px]:hidden`} />
      {wordmarkHref ? (
        <a href={wordmarkHref} aria-label="MS Dashboard, back to top" className={`${wordmark} rounded-lg`}>
          MS Dashboard
        </a>
      ) : (
        <span className={wordmark}>MS Dashboard</span>
      )}
    </span>
  );
}
