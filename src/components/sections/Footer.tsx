import Logo from "@/components/ui/Logo";
import { FOOTER } from "@/content/copy";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="relative border-t border-taupe/20 bg-sand/70 px-5 py-14 sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 text-center md:flex-row md:items-center md:justify-between md:text-left">
        <Logo size="lg" />
        <p className="font-display text-base font-medium text-text sm:text-lg">{FOOTER.tagline}</p>
        <p className="text-sm text-faint">
          &copy; {year} iSN. {FOOTER.rights}
        </p>
      </div>
    </footer>
  );
}
