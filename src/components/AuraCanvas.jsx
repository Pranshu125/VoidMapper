import React, { useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Float } from '@react-three/drei';
import { EffectComposer, Bloom, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';

/**
 * Deterministic 3D pseudo-noise function for organic + spiked vertex displacement.
 * Combines multi-octave trigonometric turbulence with sharp high-frequency spikes
 * when open_issues_count (chaosFactor) is elevated.
 */
function computeVertexDisplacement(x, y, z, time, freq, chaosFactor, glitchIntensity) {
  // Base organic breathing wave
  const wave1 =
    Math.sin(x * freq + time * 1.1) *
    Math.cos(y * freq - time * 0.9) *
    Math.sin(z * freq + time * 0.7);

  if (chaosFactor <= 0.01) {
    return wave1 * 0.015;
  }

  // Secondary chaotic harmonic
  const f2 = freq * 2.15;
  const wave2 =
    Math.sin(x * f2 - time * 2.3) *
    Math.sin(y * f2 + time * 1.9) *
    Math.cos(z * f2 - time * 2.7);

  // High-frequency spiked/glitched distortion for repos with heavy technical debt / open issues
  const spikeRaw = Math.sin((x * 3.7 + y * 5.3 + z * 4.1) * freq + time * 4.5);
  const sharpSpike = Math.pow(Math.abs(spikeRaw), 3.0) * Math.sign(spikeRaw);

  // Intermittent quantized glitch step
  const glitchQuant =
    glitchIntensity > 0.15
      ? Math.round(Math.sin(y * 12.0 + time * 8.0) * 2.0) * 0.12 * glitchIntensity
      : 0;

  return wave1 * 0.45 + wave2 * 0.35 * chaosFactor + sharpSpike * 0.65 * chaosFactor + glitchQuant;
}

/**
 * Core Procedural 3D Artifact ("The Aura")
 * Maps:
 *  - Total Commits -> IcosahedronGeometry vertex density & segment complexity
 *  - Top Languages -> Base material grayscale tone, metalness, roughness
 *  - Open Issues   -> Real-time vertex displacement noise/spiked chaos
 *  - Repo Age      -> Rotational velocity and ambient scale pulse rate
 */
function AuraArtifact({ auraState, renderMode = 'hybrid' }) {
  const groupRef = useRef(null);
  const coreMeshRef = useRef(null);
  const wireMeshRef = useRef(null);
  const innerRingRef = useRef(null);
  const outerRingRef = useRef(null);

  const { aura } = auraState;

  // Build core IcosahedronGeometry and store immutable base positions for real-time vertex displacement
  const { coreGeometry, basePositions } = useMemo(() => {
    const geom = new THREE.IcosahedronGeometry(aura.baseRadius, aura.icosahedronDetail);
    const posAttr = geom.attributes.position;
    const saved = new Float32Array(posAttr.array.length);
    saved.set(posAttr.array);
    return { coreGeometry: geom, basePositions: saved };
  }, [aura.baseRadius, aura.icosahedronDetail]);

  // Build outer structural wireframe lattice geometry
  const cageGeometry = useMemo(() => {
    return new THREE.IcosahedronGeometry(aura.baseRadius * 1.045, aura.wireframeDetail);
  }, [aura.baseRadius, aura.wireframeDetail]);

  // Dispose geometries cleanly when repo telemetry changes
  useEffect(() => {
    return () => {
      coreGeometry.dispose();
      cageGeometry.dispose();
    };
  }, [coreGeometry, cageGeometry]);

  // Animate rotation, ambient pulse, and real-time vertex displacement every frame
  useFrame((state, delta) => {
    const elapsed = state.clock.getElapsedTime();
    const dt = Math.min(delta, 0.1);

    // 1. Repository Age & Issue Chaos -> Rotational Velocity & Ambient Pulse
    if (groupRef.current) {
      groupRef.current.rotation.y += dt * aura.rotationVelocity * 0.65;
      groupRef.current.rotation.x += dt * aura.rotationVelocity * 0.28;
      groupRef.current.rotation.z = Math.sin(elapsed * 0.35) * 0.12 * (1 + aura.chaosFactor);

      const pulse = 1 + Math.sin(elapsed * aura.pulseFrequency) * aura.pulseAmplitude;
      groupRef.current.scale.setScalar(pulse);
    }

    // Counter-rotate outer wireframe shell slightly for depth
    if (wireMeshRef.current) {
      wireMeshRef.current.rotation.y -= dt * aura.rotationVelocity * 0.22;
      wireMeshRef.current.rotation.x += dt * aura.rotationVelocity * 0.14;
    }

    // Rotate subtle monochrome orbital telemetry rings
    if (innerRingRef.current) {
      innerRingRef.current.rotation.z += dt * aura.rotationVelocity * 0.45;
    }
    if (outerRingRef.current) {
      outerRingRef.current.rotation.z -= dt * aura.rotationVelocity * 0.25;
    }

    // 2. Open Issues -> Real-time Vertex Noise / Spiked Displacement on IcosahedronGeometry
    if (coreGeometry && basePositions) {
      const posAttr = coreGeometry.attributes.position;
      const arr = posAttr.array;
      const amp = aura.displacementAmplitude;
      const freq = aura.spikeFrequency;
      const chaos = aura.chaosFactor;
      const glitch = aura.glitchIntensity;

      for (let i = 0; i < arr.length; i += 3) {
        const bx = basePositions[i];
        const by = basePositions[i + 1];
        const bz = basePositions[i + 2];

        const length = Math.sqrt(bx * bx + by * by + bz * bz) || 1;
        const nx = bx / length;
        const ny = by / length;
        const nz = bz / length;

        const offset =
          computeVertexDisplacement(nx, ny, nz, elapsed, freq, chaos, glitch) * amp;

        arr[i] = bx + nx * offset;
        arr[i + 1] = by + ny * offset;
        arr[i + 2] = bz + nz * offset;
      }

      posAttr.needsUpdate = true;
      coreGeometry.computeVertexNormals();
    }
  });

  const showSolid = renderMode === 'monolith' || renderMode === 'hybrid';
  const showWireframe = renderMode === 'wireframe' || renderMode === 'hybrid';

  return (
    <Float
      speed={1.2 + aura.chaosFactor * 1.1}
      rotationIntensity={0.18 + aura.chaosFactor * 0.25}
      floatIntensity={0.35}
    >
      <group ref={groupRef}>
        {/* Primary Monochromatic Metallic / Grayscale Core Mesh */}
        {showSolid && (
          <mesh
            ref={coreMeshRef}
            geometry={coreGeometry}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial
              color={aura.materialColor}
              emissive={aura.emissiveColor}
              emissiveIntensity={aura.emissiveIntensity}
              metalness={aura.metalness}
              roughness={aura.roughness}
              wireframe={renderMode === 'wireframe'}
              flatShading={aura.icosahedronDetail <= 4 || aura.chaosFactor > 0.55}
            />
          </mesh>
        )}

        {/* Secondary Luminous Wireframe Topology Shell */}
        {showWireframe && (
          <mesh
            ref={wireMeshRef}
            geometry={ renderMode === 'wireframe' ? coreGeometry : cageGeometry }
          >
            <meshStandardMaterial
              color={aura.wireframeColor}
              emissive="#ffffff"
              emissiveIntensity={renderMode === 'wireframe' ? 0.55 : 0.28}
              metalness={0.9}
              roughness={0.15}
              wireframe
              transparent
              opacity={renderMode === 'wireframe' ? 0.92 : 0.24 + aura.chaosFactor * 0.22}
            />
          </mesh>
        )}

        {/* Inner Monochromatic Telemetry Meridian Ring */}
        <mesh ref={innerRingRef} rotation={[Math.PI / 2.3, 0.2, 0]}>
          <torusGeometry args={[aura.baseRadius * 1.42, 0.0045, 16, 160]} />
          <meshStandardMaterial
            color="#d4d4d4"
            emissive="#ffffff"
            emissiveIntensity={0.45}
            transparent
            opacity={0.32}
          />
        </mesh>

        {/* Outer Axis Reference Ring */}
        <mesh ref={outerRingRef} rotation={[0.35, Math.PI / 4, Math.PI / 3]}>
          <torusGeometry args={[aura.baseRadius * 1.72, 0.003, 12, 180]} />
          <meshStandardMaterial
            color="#737373"
            emissive="#a3a3a3"
            emissiveIntensity={0.22}
            transparent
            opacity={0.18}
          />
        </mesh>
      </group>
    </Float>
  );
}

/**
 * Sparse monochromatic dust field to ground the spatial museum depth.
 */
function VoidParticleField({ count = 180, chaosFactor = 0 }) {
  const pointsRef = useRef(null);

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      // Deterministic Halton-like spatial distribution
      const theta = i * 2.399963229728653;
      const y = 1 - (i / (count - 1)) * 2;
      const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
      const shell = 3.6 + ((i * 73) % 100) * 0.055;
      arr[i * 3] = Math.cos(theta) * radiusAtY * shell;
      arr[i * 3 + 1] = y * shell;
      arr[i * 3 + 2] = Math.sin(theta) * radiusAtY * shell;
    }
    return arr;
  }, [count]);

  useFrame((_, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += Math.min(delta, 0.1) * (0.025 + chaosFactor * 0.04);
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#d4d4d4"
        size={0.018}
        transparent
        opacity={0.35}
        sizeAttenuation
      />
    </points>
  );
}

/**
 * Full-Viewport React Three Fiber Canvas with Post-Processing (Bloom & Noise).
 */
export default function AuraCanvas({ auraState, renderMode = 'hybrid' }) {
  const { aura } = auraState;

  return (
    <div className="fixed inset-0 w-screen h-screen bg-[#050505] z-0">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, 5.4], fov: 42, near: 0.1, far: 100 }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
        }}
      >
        <color attach="background" args={['#050505']} />
        <fog attach="fog" args={['#050505', 6.5, 15]} />

        {/* Stark Monochromatic Studio Lighting Setup */}
        <ambientLight intensity={0.32} color="#ffffff" />
        <directionalLight
          position={[5, 6, 4]}
          intensity={2.4}
          color="#ffffff"
        />
        <directionalLight
          position={[-6, -4, -3]}
          intensity={0.95}
          color="#a3a3a3"
        />
        <pointLight
          position={[0, 3.5, -4]}
          intensity={1.6}
          color="#e5e5e5"
          distance={12}
        />

        {/* Core Generative Artifact */}
        <AuraArtifact auraState={auraState} renderMode={renderMode} />

        {/* Subtle Spatial Reference Dust */}
        <VoidParticleField count={160} chaosFactor={aura.chaosFactor} />

        {/* Interactive Camera Controls */}
        <OrbitControls
          enablePan={false}
          enableZoom
          minDistance={2.8}
          maxDistance={9.5}
          dampingFactor={0.05}
          enableDamping
          rotateSpeed={0.65}
        />

        {/* Charter Section IV: @react-three/postprocessing Bloom + Noise Passes */}
        <EffectComposer disableNormalPass>
          <Bloom
            intensity={aura.bloomIntensity}
            luminanceThreshold={aura.bloomThreshold}
            luminanceSmoothing={0.82}
            mipmapBlur
          />
          <Noise opacity={aura.postNoiseOpacity} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
