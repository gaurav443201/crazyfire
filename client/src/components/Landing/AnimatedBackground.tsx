import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function Particles() {
  const ref = useRef<THREE.Points>(null);
  
  // Generate random particles
  const count = 3000;
  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // Spatial positioning
      pos[i * 3] = (Math.random() - 0.5) * 50;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 50;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 50;

      // Color gradient between neon blue (#00d4ff) and neon red (#ff2d55)
      const mix = Math.random();
      col[i * 3] = mix * 1.0 + (1 - mix) * 0.0;     // R
      col[i * 3 + 1] = mix * 0.17 + (1 - mix) * 0.83; // G
      col[i * 3 + 2] = mix * 0.33 + (1 - mix) * 1.0;  // B
    }
    return [pos, col];
  }, []);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.getElapsedTime() * 0.03;
      ref.current.rotation.x = state.clock.getElapsedTime() * 0.015;
    }
  });

  return (
    <group rotation={[0, 0, Math.PI / 4]}>
      <points ref={ref}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[colors, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.12}
          vertexColors
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>
    </group>
  );
}

function NeonGrids() {
  const gridRef = useRef<THREE.GridHelper>(null);

  useFrame((state) => {
    if (gridRef.current) {
      gridRef.current.position.z = (state.clock.getElapsedTime() * 2) % 4;
    }
  });

  return (
    <group position={[0, -5, 0]}>
      <gridHelper
        ref={gridRef}
        args={[100, 25, '#00d4ff', '#0d1e2e']}
      />
    </group>
  );
}

export default function AnimatedBackground() {
  return (
    <div className="absolute inset-0 w-full h-full -z-10 bg-[#050a0f] overflow-hidden">
      {/* Background glow vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,10,20,0)_60%,#050a0f_100%)] z-[1] pointer-events-none" />
      
      {/* Ambient gradient */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-[radial-gradient(circle_at_center,rgba(0,212,255,0.15)_0%,rgba(0,0,0,0)_70%)] blur-[80px]" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,45,85,0.12)_0%,rgba(0,0,0,0)_70%)] blur-[80px]" />

      <Canvas 
        camera={{ position: [0, 0, 15], fov: 60 }}
        style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#00d4ff" />
        <pointLight position={[-10, -10, -10]} intensity={1.0} color="#ff2d55" />
        <Particles />
        <NeonGrids />
      </Canvas>
    </div>
  );
}
