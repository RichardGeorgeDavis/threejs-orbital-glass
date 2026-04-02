import * as THREE from 'three'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTexture } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { KawaseBlurPass, KernelSize } from 'postprocessing'
import { sphereFragmentShader, sphereVertexShader } from './sphereShader'
import { heroDepthFragmentShader, heroFragmentShader, heroVertexShader } from './heroShader'
import { floorFragmentShader, floorVertexShader } from './floorShader'

const INSTANCES_COUNT = 3000;

function Hero({ settings }) {
    const [width, height] = useThree((state) => [state.size.width, state.size.height]);
    const dpr = useThree((state) => state.viewport.dpr);
    
    const refMesh = useRef(null);
    const sphere1Ref = useRef(null);
    const sphere2Ref = useRef(null);
    const sphere3Ref = useRef(null);
    const sphere4Ref = useRef(null);

    const [sphereGeometry, setSphereGeometry] = useState(null);
    const [sphereMaterial, setSphereMaterial] = useState(null);

    const lightPosition = useMemo(
        () => new THREE.Vector3(-1, 0.8, 0.25).normalize().multiplyScalar(5),
        [],
    );

    const noise = useTexture("/bnoise.png");
    noise.wrapS = THREE.RepeatWrapping;
    noise.wrapT = THREE.RepeatWrapping;
    const matcap = useTexture("/glass.png");

    const uniforms = useState(() => (Object.assign({
        u_scale: { value: 0.06 },
        u_lightPosition: { value: lightPosition },
        u_noiseTexture: { value: noise },
        u_noiseTexelSize: { value: new THREE.Vector2(1/128, 1/128) },
        u_noiseCoordOffset: { value: new THREE.Vector2(0, 0) },
        u_color: { value: new THREE.Color("#B2B8BB") },
        u_sphere1Position: { value: new THREE.Vector3(0, 0, 0) },
        u_sphere2Position: { value: new THREE.Vector3(0, 0, 0) },
        u_sphere3Position: { value: new THREE.Vector3(0, 0, 0) },
        u_sphere4Position: { value: new THREE.Vector3(0, 0, 0) },
        ...THREE.UniformsUtils.merge([THREE.UniformsLib.lights]),
    })))[0]
    
    const uniformsSphere = useState(() => (Object.assign({
        u_lightPosition: { value: lightPosition },
        u_noiseTexture: { value: noise },
        u_sceneTexture: { value: null },
        u_resolution: { value: new THREE.Vector2() },
        u_matcap: { value: null },
        ...THREE.UniformsUtils.merge([THREE.UniformsLib.lights]),
    })))[0]

    const geometry = useState(() => {
        const refGeometry = new THREE.CapsuleGeometry(1, 4, 4, 16);
        refGeometry.computeBoundingBox();

        const geometry = new THREE.InstancedBufferGeometry();
        for (let id in refGeometry.attributes) {
          geometry.setAttribute(id, refGeometry.attributes[id]);
        }
        geometry.setIndex(refGeometry.index);
    
        const positionsArray = new Float32Array(INSTANCES_COUNT * 3);
        const quaternionsArray = new Float32Array(INSTANCES_COUNT * 4);

        const sphereRadius = 1.5; 
        const goldenAngle = Math.PI * (3 - Math.sqrt(5));
        const up = new THREE.Vector3(0, 1, 0);
        const tempPos = new THREE.Vector3();
        const tempQuat = new THREE.Quaternion();

        for (let i = 0, i3 = 0, i4 = 0; i < INSTANCES_COUNT; i++, i3 += 3, i4 += 4) {
          const y = 1 - (i / (INSTANCES_COUNT - 1)) * 2;
          const radius = Math.sqrt(1 - y * y);
          const theta = goldenAngle * i;

          const x = Math.cos(theta) * radius * sphereRadius;
          const z = Math.sin(theta) * radius * sphereRadius;
          const posY = y * sphereRadius;

          positionsArray[i3] = x;
          positionsArray[i3 + 1] = posY;
          positionsArray[i3 + 2] = z;

          tempPos.set(-x, -posY, -z).normalize();
          tempQuat.setFromUnitVectors(up, tempPos);

          quaternionsArray[i4] = tempQuat.x;
          quaternionsArray[i4 + 1] = tempQuat.y;
          quaternionsArray[i4 + 2] = tempQuat.z;
          quaternionsArray[i4 + 3] = tempQuat.w;
        }
        geometry.setAttribute(
          "a_instancePos",
          new THREE.InstancedBufferAttribute(positionsArray, 3),
        );
        geometry.setAttribute(
          "a_instanceQuaternions",
          new THREE.InstancedBufferAttribute(quaternionsArray, 4),
        );
    
        return geometry;
    })[0];

    const blurPass = useState(() => new KawaseBlurPass({ kernelSize: KernelSize.VERY_SMALL }))[0];
    const blurRT = useState(
    () => {
        const rt = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false })
        rt.texture.minFilter = THREE.LinearFilter;
        rt.texture.magFilter = THREE.LinearFilter;
        return rt;
    }
    )[0];

    useEffect(() => {
        let _width = Math.floor(width >> 1);
        let _height = Math.floor(height >> 1);
        blurRT.setSize(_width * dpr, _height * dpr);
        blurPass.setSize(_width * dpr, _height * dpr);
        uniformsSphere.u_resolution.value.set(_width * dpr, _height * dpr);
    }, [blurRT, blurPass, width, height, dpr, uniformsSphere])

    useEffect(() => {
        uniforms.u_scale.value = settings.orbScale;
        uniforms.u_color.value.set(settings.orbColor);
        uniforms.u_lightPosition.value.copy(lightPosition);
        uniformsSphere.u_lightPosition.value.copy(lightPosition);
    }, [lightPosition, settings.orbColor, settings.orbScale, uniforms, uniformsSphere])

    useEffect(() => {
        return () => {
            uniformsSphere.u_sceneTexture.value = null;
            blurPass.dispose();
            blurRT.dispose();
        }
    }, [blurPass, blurRT, uniformsSphere])

    const onAfterRender = (gl) => {
        const currentRT = gl.getRenderTarget();
        if (!currentRT) return;
        blurPass.render(gl, currentRT, blurRT);
        gl.setRenderTarget(currentRT);
        uniformsSphere.u_sceneTexture.value = blurRT.texture;
    }

    useFrame((state) => {
        const time = state.clock.getElapsedTime();
        
        const configs = [
            { speed: 1.0, phase: Math.PI/1.1,     plane: 'yz', dir:  1 },  
            { speed: 0.75, phase: Math.PI/3.4, plane: 'xz', dir: -1 },
            { speed: 0.5, phase: Math.PI/2.2,  plane: 'yz', dir:  1 },
            { speed: 1.2, phase: Math.PI/1.7, plane: 'xy', dir: -1 },
        ];
        const radius = settings.orbitRadius;
        
        function orbitPosition(t, config) {
            const angle = config.dir * config.speed * t + config.phase;
            if (config.plane === 'xy') {
                return [Math.cos(angle) * radius, Math.sin(angle) * radius, 0];
            } else if (config.plane === 'xz') {
                return [Math.cos(angle) * radius, 0, Math.sin(angle) * radius];
            } else if (config.plane === 'yz') {
                return [0, Math.cos(angle) * radius, Math.sin(angle) * radius];
            }
            return [Math.cos(angle) * radius, Math.sin(angle) * radius, 0];
        }

        if (sphere1Ref.current) {
            const pos = orbitPosition(time, configs[0]);
            sphere1Ref.current.position.set(...pos);
            uniforms.u_sphere1Position.value.copy(sphere1Ref.current.position);
        }
        if (sphere2Ref.current) {
            const pos = orbitPosition(time, configs[1]);
            sphere2Ref.current.position.set(...pos);
            uniforms.u_sphere2Position.value.copy(sphere2Ref.current.position);
        }
        if (sphere3Ref.current) {
            const pos = orbitPosition(time, configs[2]);
            sphere3Ref.current.position.set(...pos);
            uniforms.u_sphere3Position.value.copy(sphere3Ref.current.position);
        }
        if (sphere4Ref.current) {
            const pos = orbitPosition(time, configs[3]);
            sphere4Ref.current.position.set(...pos);
            uniforms.u_sphere4Position.value.copy(sphere4Ref.current.position);
        }
        
        uniforms.u_noiseCoordOffset.value.set(Math.random(), Math.random());
        uniformsSphere.u_matcap.value = matcap;
    })

    return (
        <>
            <directionalLight
                castShadow
                position={[lightPosition.x, lightPosition.y, lightPosition.z]}
                shadow-camera-left={-3}
                shadow-camera-right={3}
                shadow-camera-top={3}
                shadow-camera-bottom={-3}
                shadow-camera-near={0.1}
                shadow-camera-far={20}
                shadow-bias={-0.0001}
                shadow-mapSize={[1024, 1024]}
            />
            <mesh renderOrder={-1} >
                <sphereGeometry args={[1.5, 32, 32]} />
                <meshBasicMaterial color="#111" />
            </mesh>
            <mesh
                ref={refMesh}
                geometry={geometry}
                renderOrder={0}
                receiveShadow
                castShadow
                onAfterRender={onAfterRender}
            >
                <shaderMaterial
                    vertexShader={heroVertexShader}
                    fragmentShader={heroFragmentShader}
                    uniforms={uniforms}
                    lights={true}
                />
                <shaderMaterial
                    attach="customDepthMaterial"
                    vertexShader={heroVertexShader}
                    fragmentShader={heroDepthFragmentShader}
                    uniforms={uniforms}
                    defines={{ IS_DEPTH: true }}
                />
            </mesh>

            <sphereGeometry args={[0.3, 32, 32]} ref={setSphereGeometry} />
            <shaderMaterial
                ref={setSphereMaterial}
                vertexShader={sphereVertexShader}
                fragmentShader={sphereFragmentShader}
                uniforms={uniformsSphere}
                lights={true}
            />

            <group>
                <mesh ref={sphere1Ref} renderOrder={1} receiveShadow geometry={sphereGeometry} material={sphereMaterial} />
                <mesh ref={sphere2Ref} renderOrder={1} receiveShadow geometry={sphereGeometry} material={sphereMaterial} />
                <mesh ref={sphere3Ref} renderOrder={1} receiveShadow geometry={sphereGeometry} material={sphereMaterial} />
                <mesh ref={sphere4Ref} renderOrder={1} receiveShadow geometry={sphereGeometry} material={sphereMaterial} />
            </group>

            <mesh rotation-x={-Math.PI / 2} position={[4, -3, -1.5]} >
                <planeGeometry args={[8, 8]} />
                <shaderMaterial
                    vertexShader={floorVertexShader}
                    fragmentShader={floorFragmentShader}
                    uniforms={uniforms}
                    lights={true}
                    transparent={true}
                />
            </mesh>
        </>
    )
}

export default Hero;
