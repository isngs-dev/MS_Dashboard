/**
 * One-time GPU probe. Cached because it is read from useSyncExternalStore
 * snapshots (called on every render) and every probe would otherwise leak a
 * WebGL context until the browser starts evicting the real ones.
 */
export type GpuClass = "software" | "integrated" | "discrete";

type GpuInfo = { webgl: boolean; renderer: string; cls: GpuClass };

let cached: GpuInfo | undefined;

const SOFTWARE = /swiftshader|llvmpipe|softpipe|software|basic render/i;
const INTEGRATED = /intel(?!.*\barc\b)|mali|adreno|powervr|videocore|vivante/i;

export function probeGpu(): GpuInfo {
  if (cached) return cached;
  if (typeof document === "undefined") return { webgl: true, renderer: "", cls: "discrete" };

  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl2") || canvas.getContext("webgl")) as
      | WebGLRenderingContext
      | WebGL2RenderingContext
      | null;
    if (!gl) {
      cached = { webgl: false, renderer: "", cls: "software" };
      return cached;
    }
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    const cls: GpuClass = SOFTWARE.test(renderer) ? "software" : INTEGRATED.test(renderer) ? "integrated" : "discrete";
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    cached = { webgl: true, renderer, cls };
  } catch {
    cached = { webgl: false, renderer: "", cls: "software" };
  }
  return cached;
}

export const hasWebGL = () => probeGpu().webgl;
