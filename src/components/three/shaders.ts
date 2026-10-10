/* GLSL shared by the scenes. ShaderMaterial output is converted with
   <colorspace_fragment> so uniform colours behave like normal sRGB hex values.
   Colour literals written inside the shaders are therefore LINEAR values. */

export const glassVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * Rounded-rect frosted white glass panel drawn with an SDF: crisp corners at any
 * scale, a thin tinted border, a soft sheen and a warm drop shadow. The quad is
 * larger than the panel (uPad) so the shadow has room to fall off.
 */
export const glassFragment = /* glsl */ `
  uniform vec2 uSize;
  uniform float uPad;
  uniform float uRadius;
  uniform float uOpacity;
  uniform float uTime;
  uniform float uFill;
  uniform float uEdge;
  uniform float uShadow;
  uniform vec3 uTintA;
  uniform vec3 uTintB;
  uniform vec3 uBorder;
  varying vec2 vUv;

  float sdRoundBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }

  void main() {
    vec2 full = uSize + vec2(2.0 * uPad);
    vec2 p = (vUv - 0.5) * full;
    float d = sdRoundBox(p, uSize * 0.5, uRadius);
    float aa = fwidth(d) * 1.2;
    float mask = 1.0 - smoothstep(-aa, aa, d);

    // soft warm shadow, offset downwards, fading out across the padding
    float sd = sdRoundBox(p - vec2(0.0, -uPad * 0.3), uSize * 0.5, uRadius);
    float shadow = 1.0 - smoothstep(-uPad * 0.15, uPad * 0.95, sd);
    shadow *= shadow * uShadow;
    if (mask < 0.002 && shadow < 0.002) discard;

    vec2 uvIn = clamp(p / uSize + 0.5, 0.0, 1.0);
    float g = clamp(uvIn.x * 0.55 + (1.0 - uvIn.y) * 0.65, 0.0, 1.0);
    vec3 col = mix(uTintA, uTintB, g);

    float inner = exp(-max(-d, 0.0) * 7.0);
    float border = 1.0 - smoothstep(0.0, 0.016 + aa, abs(d + 0.008));
    float topLight = smoothstep(0.3, 0.0, 1.0 - uvIn.y);
    float sh = max(0.0, sin((uvIn.x * 0.8 + uvIn.y * 0.35) * 6.2831 - uTime * 0.45));
    sh *= sh; sh *= sh; sh *= sh;
    float sheen = sh * 0.1;

    vec3 rgb = mix(col, uBorder, border * 0.9);
    rgb += vec3(sheen * 1.3 + topLight * 0.05);
    float pa = clamp(uFill * (0.72 + 0.28 * g) + inner * 0.1 + border * uEdge + topLight * 0.08 + sheen, 0.0, 1.0) * mask;

    // panel over shadow, written as non-premultiplied colour + alpha
    vec3 shadowCol = vec3(0.1, 0.047, 0.017);
    float sa = shadow * (1.0 - pa);
    float oa = pa + sa;
    vec3 orgb = (rgb * pa + shadowCol * sa) / max(oa, 0.0001);

    gl_FragColor = vec4(orgb, oa * uOpacity);
    #include <colorspace_fragment>
  }
`;

export const barVertex = /* glsl */ `
  varying vec3 vN;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vN = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const barFragment = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uOpacity;
  uniform float uGlow;
  varying vec3 vN;
  varying vec2 vUv;
  void main() {
    vec3 base = mix(uColorA, uColorB, smoothstep(0.0, 1.0, vUv.y));
    float lit = 0.62 + 0.38 * max(dot(vN, normalize(vec3(0.35, 0.85, 0.6))), 0.0);
    float rim = pow(1.0 - abs(vN.z), 2.0);
    vec3 rgb = base * lit + vec3(1.0) * rim * 0.07 * uGlow;
    gl_FragColor = vec4(rgb, uOpacity);
    #include <colorspace_fragment>
  }
`;

export const particleVertex = /* glsl */ `
  attribute vec3 aStart;
  attribute vec3 aTarget;
  attribute vec4 aRand; // x: delay, y: size, z: colour mix, w: phase
  uniform float uProgress;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uSize;
  uniform float uSettle;
  uniform float uSpread;
  uniform float uDrift;
  varying float vAlpha;
  varying float vMix;

  void main() {
    float window = 0.55;
    float d = aRand.x * window;
    float t = clamp((uProgress - d) / (1.0 - window), 0.0, 1.0);
    float e = 1.0 - pow(1.0 - t, 3.0);

    vec3 start = aStart * uSpread;
    vec3 dir = normalize(aTarget - start + 0.0001);
    vec3 perp = normalize(cross(dir, vec3(0.0, 0.0, 1.0)) + vec3(0.0001));
    vec3 p = mix(start, aTarget, e);
    p += perp * sin(e * 3.14159) * (aRand.w - 0.5) * 4.2;
    p.z += sin(e * 3.14159) * (aRand.z - 0.5) * 3.0;

    float idle = e * (0.035 + 0.02 * aRand.y) * uDrift;
    p += vec3(
      sin(uTime * 0.9 + aRand.w * 6.2831),
      cos(uTime * 0.8 + aRand.w * 4.0),
      sin(uTime * 0.7 + aRand.w * 9.0)
    ) * idle;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float twinkle = 0.8 + 0.2 * sin(uTime * 2.0 + aRand.w * 40.0);
    gl_PointSize = aRand.y * uSize * uPixelRatio * (46.0 / -mv.z) * mix(1.5, 1.0, e) * twinkle;
    gl_Position = projectionMatrix * mv;

    vAlpha = smoothstep(0.0, 0.12, t) * mix(1.0, uSettle, smoothstep(0.7, 1.0, t));
    vMix = aRand.z;
  }
`;

/** Soft round dots drawn with normal blending (additive glow disappears on a light page). */
export const particleFragment = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorC;
  varying float vAlpha;
  varying float vMix;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float core = smoothstep(0.5, 0.08, d);
    vec3 col = vMix < 0.5 ? mix(uColorA, uColorB, vMix * 2.0) : mix(uColorB, uColorC, (vMix - 0.5) * 2.0);
    gl_FragColor = vec4(col, core * vAlpha * 0.9);
    #include <colorspace_fragment>
  }
`;
