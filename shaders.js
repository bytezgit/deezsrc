const Shaders = {
  vertex: `
    varying vec2 vUv;
    varying vec3 vPosition;
    uniform float uTime;
    uniform float uScroll;

    void main() {
      vUv = uv;
      vPosition = position;

      vec3 pos = position;
      float wave = sin(pos.x * 2.0 + uTime * 0.5) * cos(pos.y * 2.0 + uTime * 0.3) * 0.15;
      pos.z += wave;
      pos.z += sin(uScroll * 0.002 + pos.x) * 0.1;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,

  fragment: `
    varying vec2 vUv;
    varying vec3 vPosition;
    uniform float uTime;
    uniform float uScroll;
    uniform vec2 uResolution;

    void main() {
      vec2 uv = vUv;

      float d = length(uv - 0.5);
      float glow = 0.02 / (d + 0.1);

      vec3 col1 = vec3(0.784, 0.635, 1.0);
      vec3 col2 = vec3(0.2, 0.12, 0.35);
      vec3 col3 = vec3(0.04, 0.04, 0.05);

      float t = sin(uTime * 0.2 + uv.x * 3.0) * 0.5 + 0.5;
      vec3 color = mix(col2, col1, glow * 0.3 * t);
      color = mix(col3, color, smoothstep(0.8, 0.0, d));

      float grid = step(0.97, fract(uv.x * 30.0)) + step(0.97, fract(uv.y * 30.0));
      color += grid * 0.02 * col1;

      float scanline = sin(uv.y * uResolution.y * 0.5 + uTime * 2.0) * 0.02;
      color += scanline;

      float alpha = smoothstep(0.7, 0.0, d) * 0.6;
      alpha *= 0.4 + 0.1 * sin(uTime * 0.3);

      gl_FragColor = vec4(color, alpha);
    }
  `,

  particleVertex: `
    attribute float aSize;
    attribute float aPhase;
    varying float vAlpha;
    uniform float uTime;
    uniform float uScroll;

    void main() {
      vec3 pos = position;
      pos.y += sin(uTime * 0.3 + aPhase) * 0.5;
      pos.x += cos(uTime * 0.2 + aPhase * 0.7) * 0.3;
      pos.z += sin(uTime * 0.15 + aPhase * 1.3) * 0.4;

      pos.y -= uScroll * 0.003;

      vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPos;
      gl_PointSize = aSize * (200.0 / -mvPos.z);

      vAlpha = 0.3 + 0.3 * sin(uTime * 0.5 + aPhase);
      vAlpha *= smoothstep(15.0, 5.0, -mvPos.z);
    }
  `,

  particleFragment: `
    varying float vAlpha;

    void main() {
      vec2 center = gl_PointCoord - 0.5;
      float d = length(center);
      if (d > 0.5) discard;

      float alpha = smoothstep(0.5, 0.0, d) * vAlpha;
      vec3 color = vec3(0.784, 0.635, 1.0);

      gl_FragColor = vec4(color, alpha * 0.5);
    }
  `
};