import * as THREE from "three";
import { useEffect, useState } from "react";

function Background({ settings }) {
  const uniforms = useState(
    () => ({
      u_color0: {value: new THREE.Color("#AEB2B5")},
      u_color1: {value: new THREE.Color("#939A9D")},
    })
  )[0]

  useEffect(() => {
    uniforms.u_color0.value.set(settings.backgroundStart)
    uniforms.u_color1.value.set(settings.backgroundEnd)
  }, [settings.backgroundEnd, settings.backgroundStart, uniforms])

  return (
    <mesh renderOrder={-2} >
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        vertexShader={`
          varying vec2 v_uv;
          void main() {
            v_uv = position.xy * 0.5 + 0.5;
            gl_Position = vec4(position.xy, 0.0, 1.0);
          }
        `}
        fragmentShader={`
          varying vec2 v_uv;
          uniform vec3 u_color0;
          uniform vec3 u_color1;

          void main() {
            gl_FragColor = vec4(mix(u_color0, u_color1, v_uv.x), 1.0);
          }
        `}
        uniforms={uniforms}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  );
}

export default Background;
