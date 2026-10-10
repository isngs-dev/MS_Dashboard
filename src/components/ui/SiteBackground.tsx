/**
 * Fixed, page-wide backdrop: deep navy base, gradient orbs, a faint grid and
 * film grain, all painted as ONE static CSS layer (see `.site-bg`). Keeping it a
 * single, never-repainted layer is deliberate: it costs the GPU almost nothing
 * while the 3D scenes animate on top of it.
 */
export default function SiteBackground() {
  return <div aria-hidden className="site-bg pointer-events-none fixed inset-0 -z-10" />;
}
