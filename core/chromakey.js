import {
  Color,
  ShaderMaterial,
} from './three.js';

// Creates a chroma key compositing material

export default ({ key, texture }) => (
  new ShaderMaterial({
    uniforms: {
      key: { value: new Color(key) },
      video: { value: texture },
    },
    vertexShader: [
      '#version 300 es',
      'out vec2 fragUV;',
      'void main() {',
      '  fragUV = uv;',
      '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
      '}',
    ].join('\n'),
    fragmentShader: [
      '#version 300 es',
      'in vec2 fragUV;',
      'out vec4 color;',
      'uniform vec3 key;',
      'uniform float threshold;',
      'uniform sampler2D video;',
      'void main() {',
      '  vec3 fragColor = texture2D(video, fragUV).rgb;',
      '  float fragAlpha = (length(fragColor - key) - 0.5) * 7.0;',
      '  color = vec4(fragColor, fragAlpha);',
      '}',
    ].join('\n'),
    transparent: true,
  })
);
