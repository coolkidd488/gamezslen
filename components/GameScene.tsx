
import React, { Suspense, useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls, Stars } from '@react-three/drei';
import * as THREE from 'three';

// -- Geradores de Áudio (Para funcionar sem arquivos externos) --

const createAudioContext = () => {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return ctx;
};

// -- Helper Components --

const Tree = ({ position, scale = 1 }: { position: [number, number, number], scale?: number }) => {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 2.5, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.5, 5, 8]} />
        <meshStandardMaterial color="#1a120b" roughness={1} />
      </mesh>
      <mesh position={[0, 5, 0]} castShadow>
        <coneGeometry args={[2, 6, 6]} />
        <meshStandardMaterial color="#0b1a0e" roughness={1} />
      </mesh>
    </group>
  );
};

const Shack = ({ position, rotation = 0, scale = 1 }: { position: [number, number, number], rotation?: number, scale?: number }) => {
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[4, 3, 4]} />
        <meshStandardMaterial color="#2a1f1a" roughness={1} />
      </mesh>
      <mesh position={[0, 3.5, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[3.5, 2, 4]} />
        <meshStandardMaterial color="#1a1a1a" roughness={1} />
      </mesh>
      <mesh position={[0, 1, 2.01]}>
        <planeGeometry args={[1.2, 2]} />
        <meshBasicMaterial color="#000" />
      </mesh>
    </group>
  );
};

const Tower = ({ position }: { position: [number, number, number] }) => {
  return (
    <group position={position}>
      <mesh position={[0, 5, 0]} castShadow receiveShadow>
        <boxGeometry args={[2, 10, 2]} />
        <meshStandardMaterial color="#111" roughness={1} />
      </mesh>
      <mesh position={[0, 10, 0]} castShadow>
        <boxGeometry args={[4, 2, 4]} />
        <meshStandardMaterial color="#222" />
      </mesh>
    </group>
  );
};

const Wall = ({ position, rotation = 0 }: { position: [number, number, number], rotation?: number }) => {
  return (
    <mesh position={position} rotation={[0, rotation, 0]} castShadow receiveShadow>
      <boxGeometry args={[8, 2.5, 0.8]} />
      <meshStandardMaterial color="#1a1a1a" roughness={1} />
    </mesh>
  );
};

const DirectionalArrow = ({ position, pagePositions }: { position: [number, number, number], pagePositions: THREE.Vector3[] }) => {
  const arrowRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!arrowRef.current || pagePositions.length === 0) return;

    let closestPage = pagePositions[0];
    let minDist = arrowRef.current.position.distanceTo(closestPage);

    for (let i = 1; i < pagePositions.length; i++) {
      const d = arrowRef.current.position.distanceTo(pagePositions[i]);
      if (d < minDist) {
        minDist = d;
        closestPage = pagePositions[i];
      }
    }

    const target = new THREE.Vector3().copy(closestPage);
    target.y = position[1];
    arrowRef.current.lookAt(target);
  });

  return (
    <group ref={arrowRef} position={position}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.8, 8]} />
        <meshStandardMaterial color="#ff0000" emissive="#550000" />
      </mesh>
      <mesh position={[0, 0, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.2, 0.3, 8]} />
        <meshStandardMaterial color="#ff0000" emissive="#550000" />
      </mesh>
    </group>
  );
};

const Page = ({ position, onCollect }: { position: [number, number, number], onCollect: () => void }) => {
  const [collected, setCollected] = useState(false);
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (collected) return;
    const distance = state.camera.position.distanceTo(new THREE.Vector3(...position));
    if (distance < 2.5) {
      setCollected(true);
      onCollect();
    }
  });

  if (collected) return null;

  return (
    <mesh position={position} rotation={[0, Math.random() * Math.PI, 0]} ref={ref}>
      <planeGeometry args={[0.4, 0.6]} />
      <meshBasicMaterial color="white" side={THREE.DoubleSide} transparent opacity={0.9} />
    </mesh>
  );
};

const SlenderMan = ({ position }: { position: THREE.Vector3 }) => {
  return (
    <group position={[position.x, 0, position.z]}>
      <mesh position={[0, 2.2, 0]}>
        <boxGeometry args={[0.45, 4.4, 0.25]} />
        <meshBasicMaterial color="black" />
      </mesh>
      <mesh position={[0, 4.6, 0]}>
        <sphereGeometry args={[0.28, 16, 16]} />
        <meshBasicMaterial color="#e0e0e0" />
      </mesh>
      <mesh position={[0.45, 2.8, 0]} rotation={[0, 0, -0.15]}>
        <boxGeometry args={[0.08, 4.2, 0.08]} />
        <meshBasicMaterial color="black" />
      </mesh>
      <mesh position={[-0.45, 2.8, 0]} rotation={[0, 0, 0.15]}>
        <boxGeometry args={[0.08, 4.2, 0.08]} />
        <meshBasicMaterial color="black" />
      </mesh>
    </group>
  );
};

const Forest = ({ onCollectPage, activePagePositions }: { onCollectPage: (id: number) => void, activePagePositions: THREE.Vector3[] }) => {
  const trees = useMemo(() => {
    return Array.from({ length: 450 }).map((_, i) => ({
      id: i,
      pos: [
        (Math.random() - 0.5) * 250,
        0,
        (Math.random() - 0.5) * 250
      ] as [number, number, number],
      scale: 0.8 + Math.random() * 0.7
    }));
  }, []);

  const pageDefinitions = useMemo(() => {
    return [
      { id: 0, pos: [30, 1.2, 30] }, 
      { id: 1, pos: [-45, 1.2, 25] }, 
      { id: 2, pos: [15, 1.2, -65] }, 
      { id: 3, pos: [-70, 1.2, -40] },
      { id: 4, pos: [65, 1.2, -20] }, 
      { id: 5, pos: [12, 1.2, 75] }, 
      { id: 6, pos: [-30, 1.2, -30] }, 
      { id: 7, pos: [55, 1.2, 55] }
    ] as { id: number, pos: [number, number, number] }[];
  }, []);

  const structures = useMemo(() => [
    { type: 'shack', pos: [20, 0, 20], rot: 0.5 },
    { type: 'shack', pos: [-35, 0, -45], rot: -1.2 },
    { type: 'shack', pos: [60, 0, -10], rot: 2.1 },
    { type: 'tower', pos: [-50, 0, 50] },
    { type: 'tower', pos: [40, 0, -50] },
    { type: 'wall', pos: [0, 0, -20], rot: 0 },
    { type: 'wall', pos: [15, 0, 60], rot: Math.PI / 2 },
    { type: 'wall', pos: [-60, 0, 15], rot: 0.8 },
    { type: 'wall', pos: [-10, 0, -60], rot: -0.5 },
  ], []);

  const arrowPositions = useMemo(() => [
    [0, 0.1, 0], [30, 0.1, -20], [-30, 0.1, 30], [50, 0.1, -50], [-50, 0.1, -20], [10, 0.1, 40]
  ] as [number, number, number][], []);

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
        <planeGeometry args={[500, 500]} />
        <meshStandardMaterial color="#030303" roughness={1} />
      </mesh>
      {trees.map(t => <Tree key={t.id} position={t.pos} scale={t.scale} />)}
      {structures.map((s, i) => (
        s.type === 'shack' 
          ? <Shack key={i} position={s.pos as any} rotation={s.rot} /> 
          : s.type === 'tower' 
          ? <Tower key={i} position={s.pos as any} />
          : <Wall key={i} position={s.pos as any} rotation={s.rot} />
      ))}
      {arrowPositions.map((pos, i) => (
        <DirectionalArrow key={i} position={pos} pagePositions={activePagePositions} />
      ))}
      {pageDefinitions.map((page) => (
        <Page 
          key={page.id} 
          position={page.pos} 
          onCollect={() => onCollectPage(page.id)} 
        />
      ))}
    </>
  );
};

const Controller = ({ onDeath, setStaticAmount, pagesCollected, flashlightOn, activePagePositions, onUpdateNearestAngle }: any) => {
  const { camera, scene } = useThree();
  const moveSpeed = 0.12;
  const keys = useRef<{ [key: string]: boolean }>({});
  const slenderPos = useRef(new THREE.Vector3(50, 0, 50));
  const lastTeleport = useRef(0);
  
  const lightRef = useRef<THREE.SpotLight>(null!);
  const targetRef = useRef<THREE.Object3D>(new THREE.Object3D());

  // Áudio Ref
  const audioCtx = useRef<AudioContext | null>(null);
  const footstepTimer = useRef(0);
  const ambienceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    scene.add(targetRef.current);
    const down = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
      if (!audioCtx.current) {
        audioCtx.current = createAudioContext();
        startAmbience();
      }
    };
    const up = (e: KeyboardEvent) => keys.current[e.code] = false;
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      scene.remove(targetRef.current);
      if (ambienceRef.current) ambienceRef.current.stop();
    };
  }, [scene]);

  const startAmbience = () => {
    if (!audioCtx.current) return;
    const ctx = audioCtx.current;
    
    // Gerar ruído de vento marrom
    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5; // volume
    }

    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    source.connect(filter);
    filter.connect(ctx.destination);
    source.start();
    ambienceRef.current = source;
  };

  const playFootstep = () => {
    if (!audioCtx.current) return;
    const ctx = audioCtx.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(60, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  };

  const playJumpscareSound = () => {
    if (!audioCtx.current) return;
    const ctx = audioCtx.current;
    
    // Som estridente
    for (let i = 0; i < 5; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = i % 2 === 0 ? 'sawtooth' : 'square';
        osc.frequency.setValueAtTime(100 + Math.random() * 300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(10 + Math.random() * 20, ctx.currentTime + 1.5);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 1.5);
    }
  };

  useFrame((state, delta) => {
    const moveDir = new THREE.Vector3();
    const front = Number(keys.current['KeyW'] || 0) - Number(keys.current['KeyS'] || 0);
    const side = Number(keys.current['KeyD'] || 0) - Number(keys.current['KeyA'] || 0);

    const isMoving = front !== 0 || side !== 0;

    if (isMoving) {
      const cameraDir = new THREE.Vector3();
      camera.getWorldDirection(cameraDir);
      cameraDir.y = 0;
      cameraDir.normalize();
      const cameraSide = new THREE.Vector3().crossVectors(cameraDir, new THREE.Vector3(0, 1, 0)).normalize();
      moveDir.addScaledVector(cameraDir, front * moveSpeed);
      moveDir.addScaledVector(cameraSide, side * moveSpeed);
      camera.position.add(moveDir);

      // Footsteps logic
      footstepTimer.current += delta;
      if (footstepTimer.current > 0.6) {
        playFootstep();
        footstepTimer.current = 0;
      }
    }
    camera.position.y = 1.7;

    const lookAtPos = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).add(camera.position);
    targetRef.current.position.copy(lookAtPos);
    if (lightRef.current) {
        lightRef.current.position.copy(camera.position);
        lightRef.current.target = targetRef.current;
    }

    const dist = camera.position.distanceTo(slenderPos.current);
    const lookDir = new THREE.Vector3();
    camera.getWorldDirection(lookDir);
    const toSlender = new THREE.Vector3().subVectors(slenderPos.current, camera.position).normalize();
    const dot = lookDir.dot(toSlender);
    
    let currentStatic = 0;
    if (dist < 30) {
      const multiplier = 1.2 + (pagesCollected * 0.5);
      currentStatic = (Math.max(0, (30 - dist) / 30) * multiplier);
      if (dot > 0.7) {
        currentStatic *= 4.5;
      }
    }
    setStaticAmount(Math.min(1.2, currentStatic));

    if (dist < 3.5) {
      playJumpscareSound();
      onDeath();
    }

    // Nearest Page UI Indicator Angle
    if (activePagePositions.length > 0) {
      let closest = activePagePositions[0];
      let minDist = camera.position.distanceTo(closest);
      for (const p of activePagePositions) {
        const d = camera.position.distanceTo(p);
        if (d < minDist) {
          minDist = d;
          closest = p;
        }
      }
      const playerFwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      playerFwd.y = 0;
      playerFwd.normalize();
      const toPage = new THREE.Vector3().subVectors(closest, camera.position);
      toPage.y = 0;
      toPage.normalize();
      const angle = Math.atan2(toPage.x, toPage.z) - Math.atan2(playerFwd.x, playerFwd.z);
      onUpdateNearestAngle(angle);
    } else {
      onUpdateNearestAngle(null);
    }

    const now = state.clock.getElapsedTime();
    const teleportCooldown = Math.max(1.0, 7 - pagesCollected);
    if (now - lastTeleport.current > teleportCooldown) {
      const angle = Math.random() * Math.PI * 2;
      const spawnDist = Math.max(5, 22 - pagesCollected * 2.5);
      slenderPos.current.set(camera.position.x + Math.cos(angle) * spawnDist, 0, camera.position.z + Math.sin(angle) * spawnDist);
      lastTeleport.current = now;
    }
  });

  return (
    <>
      <PointerLockControls />
      <SlenderMan position={slenderPos.current} />
      <spotLight ref={lightRef} intensity={flashlightOn ? 55 : 0} distance={35} angle={0.48} penumbra={0.7} color="#fffef0" castShadow />
      <primitive object={camera} />
    </>
  );
};

interface GameSceneProps {
  pagesCollected: number;
  flashlightOn: boolean;
  onCollectPage: () => void;
  onDeath: () => void;
  setStaticAmount: (val: number) => void;
  onUpdateNearestAngle: (angle: number | null) => void;
}

const GameScene: React.FC<GameSceneProps> = (props) => {
  const initialPagePositions = useMemo(() => [
    new THREE.Vector3(30, 1.2, 30),
    new THREE.Vector3(-45, 1.2, 25),
    new THREE.Vector3(15, 1.2, -65),
    new THREE.Vector3(-70, 1.2, -40),
    new THREE.Vector3(65, 1.2, -20),
    new THREE.Vector3(12, 1.2, 75),
    new THREE.Vector3(-30, 1.2, -30),
    new THREE.Vector3(55, 1.2, 55)
  ], []);

  const [activePages, setActivePages] = useState<number[]>(initialPagePositions.map((_, i) => i));

  const handlePageCollect = (id: number) => {
    setActivePages(prev => prev.filter(pId => pId !== id));
    props.onCollectPage();
  };

  const activeVecs = useMemo(() => 
    initialPagePositions.filter((_, i) => activePages.includes(i)),
    [activePages, initialPagePositions]
  );

  return (
    <div className="w-full h-full cursor-none">
      <Canvas shadows camera={{ fov: 75 }}>
        <color attach="background" args={['#000']} />
        <fog attach="fog" args={['#000', 1, 35]} />
        <Suspense fallback={null}>
          <ambientLight intensity={0.04} />
          <Stars radius={120} depth={60} count={4000} factor={4} saturation={0} fade speed={0.5} />
          <Forest onCollectPage={handlePageCollect} activePagePositions={activeVecs} />
          <Controller {...props} activePagePositions={activeVecs} />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default GameScene;
