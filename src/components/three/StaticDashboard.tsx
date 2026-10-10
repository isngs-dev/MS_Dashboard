/**
 * Lightweight CSS/SVG dashboard illustration used while a 3D canvas is not
 * mounted yet, or when WebGL is unavailable. Pure markup, no JS.
 */
export default function StaticDashboard({ className }: { className?: string }) {
  const bars = [42, 66, 52, 86, 70, 100, 78, 92, 60, 82];
  return (
    <div aria-hidden className={`pointer-events-none flex items-center justify-center lg:justify-end lg:pr-[6%] ${className ?? ""}`}>
      <div
        className="glass gborder relative w-[min(92vw,640px)] rounded-3xl p-4 sm:p-5"
        style={{ transform: "perspective(1400px) rotateY(-16deg) rotateX(7deg)", transformStyle: "preserve-3d" }}
      >
        <div className="mb-3 flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#e0786a]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#e3b25f]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#79b88a]" />
          <span className="ml-3 h-3 w-1/3 rounded-full bg-taupe/25" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {["from-blue/25", "from-clay/30", "from-sky/30"].map((c) => (
            <div key={c} className={`h-16 rounded-xl border border-taupe/20 bg-gradient-to-br ${c} to-transparent`} />
          ))}
        </div>
        <div className="mt-3 grid grid-cols-5 gap-3">
          <div className="col-span-3 flex h-36 items-end gap-1.5 rounded-xl border border-taupe/20 bg-white/60 p-3">
            {bars.map((h, i) => (
              <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-blue-deep to-sky" style={{ height: `${h}%` }} />
            ))}
          </div>
          <div className="col-span-2 rounded-xl border border-taupe/20 bg-white/60 p-3">
            <svg viewBox="0 0 120 70" className="h-full w-full">
              <defs>
                <linearGradient id="sd-line" x1="0" x2="1">
                  <stop offset="0" stopColor="#1f4aa8" />
                  <stop offset="1" stopColor="#6b97e8" />
                </linearGradient>
              </defs>
              <path d="M2 56 C 20 40, 30 60, 48 38 S 80 30, 96 18 S 112 10, 118 6" fill="none" stroke="url(#sd-line)" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
