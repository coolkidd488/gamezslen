
import React, { useState, useEffect, useCallback, useRef, Suspense, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls, Stars, Html } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import { Map as MapIcon, X, Lightbulb, Menu } from 'lucide-react';
import { GameStatus } from './types';
import { getCrypticMessage, getDeathMessage } from './services/gemini';

// --- COMPONENTE: JOYSTICK ---
const Joystick = ({ onMove }: { onMove: (f: number, s: number) => void }) => {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((e: any) => {
    if (!active || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const dist = Math.min(Math.sqrt(dx*dx + dy*dy), rect.width / 2);
    const angle = Math.atan2(dy, dx);
    const x = Math.cos(angle) * dist;
    const y = Math.sin(angle) * dist;
    setPos({ x, y });
    onMove(-y / (rect.width/2), x / (rect.width/2));
  }, [active, onMove]);

  const handleEnd = useCallback(() => {
    setActive(false);
    setPos({ x: 0, y: 0 });
    onMove(0, 0);
  }, [onMove]);

  useEffect(() => {
    if (active) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('blur', handleEnd);
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('touchend', handleEnd);
    }
    return () => { 
      window.removeEventListener('mousemove', handleMove); 
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('blur', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [active, handleMove, handleEnd]);

  return (
    <div ref={containerRef} onMouseDown={() => setActive(true)} onTouchStart={() => setActive(true)}
      className="w-32 h-32 bg-white/5 rounded-full border border-white/10 flex items-center justify-center touch-none pointer-events-auto">
      <div className="w-12 h-12 bg-white/20 rounded-full pointer-events-none" style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }} />
    </div>
  );
};

// --- COMPONENTE: SLENDER MAN ---
const SlenderMan = ({ position, isMenu = false }: { position: THREE.Vector3, isMenu?: boolean }) => {
  const group = useRef<THREE.Group>(null!);
  const { camera } = useThree();
  
  useFrame((s) => {
    if (group.current) {
      // Bobbing effect
      group.current.position.y = Math.sin(s.clock.elapsedTime * 1.5) * 0.03;
      
      // Always look at camera (classic Slender behavior)
      if (!isMenu) {
        const targetPos = new THREE.Vector3(camera.position.x, 0, camera.position.z);
        group.current.lookAt(targetPos);
      }
    }
  });

  return (
    <group ref={group} position={[position.x, 0, position.z]}>
      {/* Body (Suit) - Taller and thinner */}
      <mesh position={[0, 3, 0]}>
        <boxGeometry args={[0.5, 4.5, 0.25]} />
        <meshStandardMaterial color="#020202" roughness={1} />
      </mesh>
      
      {/* White Shirt / Tie Area */}
      <mesh position={[0, 4.8, 0.13]}>
        <planeGeometry args={[0.15, 0.5]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, 4.6, 0.14]}>
        <planeGeometry args={[0.04, 0.4]} />
        <meshStandardMaterial color="#600000" />
      </mesh>

      {/* Head (Featureless, slightly elongated) */}
      <mesh position={[0, 5.5, 0]}>
        <sphereGeometry args={[0.28, 32, 32]} />
        <meshStandardMaterial color="#f5f5f5" roughness={1} />
      </mesh>

      {/* Extremely Long Arms */}
      <mesh position={[-0.4, 3.5, 0]} rotation={[0, 0, 0.05]}>
        <boxGeometry args={[0.12, 4, 0.12]} />
        <meshStandardMaterial color="#000" />
      </mesh>
      <mesh position={[0.4, 3.5, 0]} rotation={[0, 0, -0.05]}>
        <boxGeometry args={[0.12, 4, 0.12]} />
        <meshStandardMaterial color="#000" />
      </mesh>

      {/* Long Legs */}
      <mesh position={[-0.18, 1, 0]}>
        <boxGeometry args={[0.15, 2.5, 0.15]} />
        <meshStandardMaterial color="#000" />
      </mesh>
      <mesh position={[0.2, 1, 0]}>
        <boxGeometry args={[0.15, 2.5, 0.15]} />
        <meshStandardMaterial color="#000" />
      </mesh>

      {/* Dynamic Tentacles */}
      {[...Array(10)].map((_, i) => (
        <mesh 
          key={i} 
          position={[0, 4, -0.1]} 
          rotation={[
            Math.sin(i * 1.2) * 0.8, 
            (i / 10) * Math.PI * 2, 
            Math.cos(i * 1.2) * 0.8
          ]}
        >
          <boxGeometry args={[0.04, 5, 0.04]} />
          <meshStandardMaterial color="#000" />
        </mesh>
      ))}
    </group>
  );
};

const INITIAL_PAGE_POSITIONS: [number, number, number][] = [
  [30, 1, 30], [-40, 1, 20], [10, 1, -60], [-70, 1, -30], [60, 1, -10], [5, 1, 70], [-25, 1, -25], [50, 1, 50]
];

// --- COMPONENTE: TIMER DIGIT ---
const TimerDigit = ({ value }: { value: string }) => {
  return (
    <div className="relative h-12 w-8 overflow-hidden flex items-center justify-center">
      <AnimatePresence mode="popLayout">
        <motion.span
          key={value}
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -30, opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="absolute text-3xl font-mono text-white"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </div>
  );
};

const TimerDisplay = ({ seconds }: { seconds: number }) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const mStr = mins.toString();
  const sStr = secs.toString().padStart(2, '0');

  return (
    <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md p-3 rounded-xl border border-white/10 shadow-2xl">
      <div className="text-[10px] absolute -top-5 left-1/2 -translate-x-1/2 opacity-50 tracking-[0.5em]">TIMER</div>
      <TimerDigit value={mStr} />
      <span className="text-3xl text-white mb-1">:</span>
      <TimerDigit value={sStr[0]} />
      <TimerDigit value={sStr[1]} />
    </div>
  );
};

const Rain = ({ count = 1500, volume = 0.5 }) => {
  const points = useRef<THREE.Points>(null!);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Rain sound from Mixkit
    audio.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2513/2513-preview.mp3');
    audio.current.loop = true;
    audio.current.volume = volume;
    
    const playAudio = () => {
      audio.current?.play().catch(e => console.log("Audio play blocked", e));
    };

    window.addEventListener('click', playAudio, { once: true });
    window.addEventListener('keydown', playAudio, { once: true });
    
    return () => {
      audio.current?.pause();
      audio.current = null;
      window.removeEventListener('click', playAudio);
      window.removeEventListener('keydown', playAudio);
    };
  }, [volume]);
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 100;
      pos[i * 3 + 1] = Math.random() * 50;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 100;
    }
    return pos;
  }, [count]);

  useFrame((state, delta) => {
    const pos = points.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 1] -= 0.5;
      if (pos[i * 3 + 1] < 0) pos[i * 3 + 1] = 50;
    }
    points.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.1} color="#aaa" transparent opacity={0.4} />
    </points>
  );
};

// --- COMPONENTE: COMPASS ---
const Compass = ({ angle }: { angle: number }) => {
  const angleDeg = (angle * (180 / Math.PI) + 360) % 360;
  return (
    <div className="relative w-32 h-32 border-4 border-white/20 rounded-full flex items-center justify-center bg-black/60 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
      {/* Compass Rose Labels */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="absolute top-2 font-black text-white text-sm">N</span>
        <span className="absolute bottom-2 font-black text-white text-sm">S</span>
        <span className="absolute left-2 font-black text-white text-sm">W</span>
        <span className="absolute right-2 font-black text-white text-sm">E</span>
      </div>
      {/* Needle */}
      <motion.div 
        className="relative w-1 h-24 flex flex-col items-center justify-between"
        animate={{ rotate: -angleDeg }}
        transition={{ type: "spring", stiffness: 60, damping: 15 }}
      >
        <div className="w-2 h-12 bg-red-600 rounded-t-full shadow-[0_0_10px_rgba(220,38,38,0.8)]" />
        <div className="w-2 h-12 bg-white rounded-b-full" />
      </motion.div>
      {/* Center Pin */}
      <div className="absolute w-3 h-3 bg-zinc-800 rounded-full border border-white/40 z-10" />
    </div>
  );
};

// --- COMPONENTE: FOREST ---
const Forest = ({ onCollect, onCollectMap, collectedIndices, onGateReach, pagePositions, isGateOpen, espDoor, espMaps, espPapers }: any) => {
  const trees = useMemo(() => Array.from({ length: 400 }).map(() => ({
    pos: [(Math.random() - 0.5) * 400, 0, (Math.random() - 0.5) * 400] as [number, number, number],
    s: 0.8 + Math.random()
  })).filter(t => {
    const x = Math.abs(t.pos[0]);
    const z = Math.abs(t.pos[2]);
    if (x < 10 && z < 200) return false; // Main road
    if (z < 10 && x < 200) return false; // Cross road
    return true;
  }), []);

  const mapItems = useMemo(() => Array.from({ length: 3 }).map(() => [
    (Math.random() - 0.5) * 150, 0.1, (Math.random() - 0.5) * 150
  ] as [number, number, number]), []);

  const roads = useMemo(() => [
    { pos: [0, 0.01, 0], size: [20, 400], rot: 0 },
    { pos: [0, 0.01, 0], size: [400, 20], rot: 0 },
    { pos: [100, 0.01, 0], size: [10, 400], rot: 0 },
    { pos: [-100, 0.01, 0], size: [10, 400], rot: 0 },
    { pos: [0, 0.01, 100], size: [400, 10], rot: 0 },
    { pos: [0, 0.01, -100], size: [400, 10], rot: 0 },
  ], []);

  const trunkRef = useRef<THREE.InstancedMesh>(null!);
  const topRef = useRef<THREE.InstancedMesh>(null!);

  useEffect(() => {
    const tempObject = new THREE.Object3D();
    trees.forEach((t, i) => {
      tempObject.position.set(t.pos[0], 3 * t.s, t.pos[2]);
      tempObject.scale.set(t.s, t.s, t.s);
      tempObject.updateMatrix();
      trunkRef.current.setMatrixAt(i, tempObject.matrix);

      tempObject.position.set(t.pos[0], 6 * t.s, t.pos[2]);
      tempObject.scale.set(t.s, t.s, t.s);
      tempObject.updateMatrix();
      topRef.current.setMatrixAt(i, tempObject.matrix);
    });
    trunkRef.current.instanceMatrix.needsUpdate = true;
    topRef.current.instanceMatrix.needsUpdate = true;
  }, [trees]);

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1000, 1000]} />
        <meshStandardMaterial color="#020202" />
      </mesh>
      
      {/* Brick Walls */}
      <Wall pos={[0, 5, 200]} size={[400, 10, 1]} /> {/* South */}
      <Wall pos={[0, 5, -200]} size={[400, 10, 1]} /> {/* North */}
      <Wall pos={[200, 5, 0]} size={[1, 10, 400]} /> {/* East */}
      <Wall pos={[-200, 5, 0]} size={[1, 10, 400]} /> {/* West */}

      {/* Haunted Gate (North) */}
      <Gate pos={[0, 0, -198]} onReach={onGateReach} isOpen={isGateOpen} esp={espDoor} />

      {/* Roads */}
      {roads.map((r, i) => (
        <mesh key={i} position={r.pos as any} rotation={[-Math.PI / 2, 0, r.rot]} receiveShadow>
          <planeGeometry args={r.size as any} />
          <meshStandardMaterial color="#080808" roughness={1} />
        </mesh>
      ))}

      <instancedMesh ref={trunkRef} args={[undefined, undefined, 300]} castShadow frustumCulled={false}>
        <cylinderGeometry args={[0.2, 0.4, 6]} />
        <meshStandardMaterial color="#0a0805" />
      </instancedMesh>
      <instancedMesh ref={topRef} args={[undefined, undefined, 300]} castShadow frustumCulled={false}>
        <coneGeometry args={[2, 6]} />
        <meshStandardMaterial color="#050805" />
      </instancedMesh>
      {pagePositions.map((p: any, i: number) => (
        !collectedIndices.includes(i) && <PageItem key={i} id={i} pos={p} onCollect={onCollect} esp={espPapers} />
      ))}
      {mapItems.map((p, i) => <MapPickup key={i} pos={p} onCollect={onCollectMap} esp={espMaps} />)}
    </>
  );
};

const Wall = ({ pos, size }: { pos: [number, number, number], size: [number, number, number] }) => {
  return (
    <mesh position={pos}>
      <boxGeometry args={size} />
      <meshStandardMaterial color="#2a1a1a" roughness={0.8} />
    </mesh>
  );
};

const Gate = ({ pos, onReach, isOpen, esp }: { pos: [number, number, number], onReach: () => void, isOpen: boolean, esp: boolean }) => {
  const { camera } = useThree();
  const gatePos = useMemo(() => new THREE.Vector3(...pos), [pos]);
  
  useFrame(() => {
    if (camera.position.distanceTo(gatePos) < 10) {
      onReach();
    }
  });

  return (
    <group position={pos}>
      {esp && (
        <mesh position={[0, 4, 0]}>
          <planeGeometry args={[8, 8]} />
          <meshStandardMaterial 
            color="#ff0000" 
            transparent 
            opacity={0.3} 
            emissive="#ff0000" 
            emissiveIntensity={2} 
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      {/* Pillars */}
      <mesh position={[-4, 4, 0]}><boxGeometry args={[1, 8, 1]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
      <mesh position={[4, 4, 0]}><boxGeometry args={[1, 8, 1]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
      
      {/* Bars - Only visible if gate is NOT open */}
      {!isOpen && (
        <group>
          <mesh position={[0, 4, 0]}><boxGeometry args={[8, 0.2, 0.2]} /><meshStandardMaterial color="#000" /></mesh>
          <mesh position={[0, 2, 0]}><boxGeometry args={[8, 0.2, 0.2]} /><meshStandardMaterial color="#000" /></mesh>
          <mesh position={[0, 6, 0]}><boxGeometry args={[8, 0.2, 0.2]} /><meshStandardMaterial color="#000" /></mesh>
          {[...Array(10)].map((_, i) => (
            <mesh key={i} position={[-3.5 + i * 0.8, 4, 0]}><boxGeometry args={[0.1, 7, 0.1]} /><meshStandardMaterial color="#000" /></mesh>
          ))}
        </group>
      )}
    </group>
  );
};

const MapPickup = ({ pos, onCollect, esp }: any) => {
  const [c, setC] = useState(false);
  const { camera } = useThree();
  const itemPos = useMemo(() => new THREE.Vector3(...pos), [pos]);
  useFrame(() => {
    if (!c && camera.position.distanceTo(itemPos) < 2.5) {
      setC(true);
      onCollect();
    }
  });
  return c ? null : (
    <group position={pos}>
      {esp && (
        <Html distanceFactor={10}>
          <div className="bg-blue-600/80 text-white px-2 py-1 rounded text-[8px] font-bold whitespace-nowrap border border-white/20 shadow-lg">
            MAPA
          </div>
        </Html>
      )}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.5, 0.5]} />
        <meshBasicMaterial color="#4444ff" side={THREE.DoubleSide} transparent opacity={0.8} />
      </mesh>
    </group>
  );
};

const PageItem = ({ id, pos, onCollect, esp }: any) => {
  const [c, setC] = useState(false);
  const { camera } = useThree();
  const pagePos = useMemo(() => new THREE.Vector3(...pos), [pos]);
  useFrame(() => {
    if (!c && camera.position.distanceTo(pagePos) < 2.5) {
      setC(true);
      onCollect(id);
    }
  });
  return c ? null : (
    <group position={pos}>
      {esp && (
        <Html distanceFactor={10}>
          <div className="bg-white/80 text-black px-2 py-1 rounded text-[8px] font-bold whitespace-nowrap border border-black/20 shadow-lg">
            PÁGINA
          </div>
        </Html>
      )}
      <mesh rotation={[0, Math.random() * Math.PI, 0]}>
        <planeGeometry args={[0.4, 0.6]} />
        <meshBasicMaterial color="white" side={THREE.DoubleSide} transparent opacity={0.9} />
      </mesh>
    </group>
  );
};

// --- COMPONENTE: TERMINAL ---
const Terminal = ({ onClose, setters, states }: { onClose: () => void, setters: any, states: any }) => {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>(["SISTEMA DE TERMINAL SLENDER V1.0", "DIGITE 'HELP' PARA COMANDOS"]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    const parts = input.trim().toLowerCase().split(" ");
    const cmd = parts[0];
    const arg = parts[1];
    if (!cmd) return;
    
    let response = "COMANDO NÃO RECONHECIDO";
    
    if (cmd === "/freezetemp") { setters.setFreezeTemp(true); response = "TEMPO CONGELADO"; }
    else if (cmd === "/unfreezetemp") { setters.setFreezeTemp(false); response = "TEMPO DESCONGELADO"; }
    else if (cmd === "/stopkiller") { setters.setStopKiller(true); response = "KILLER PARADO"; }
    else if (cmd === "/playkiller") { setters.setStopKiller(false); response = "KILLER EM MOVIMENTO"; }
    else if (cmd === "/day") { setters.setIsDay(true); response = "DIA ATIVADO"; }
    else if (cmd === "/night") { setters.setIsDay(false); response = "NOITE ATIVADA"; }
    else if (cmd === "/fly") { setters.setIsFlying(true); response = "MODO VOO ATIVADO"; }
    else if (cmd === "/unfly") { setters.setIsFlying(false); response = "MODO VOO DESATIVADO"; }
    else if (cmd === "/killkiller") { setters.setKillerKilled(true); response = "KILLER ELIMINADO"; }
    else if (cmd === "/unkillkiler") { setters.setKillerKilled(false); response = "KILLER RESTAURADO"; }
    else if (cmd === "/givemap") { setters.setHasMap(true); response = "MAPA CONCEDIDO"; }
    else if (cmd === "/givepaper") { 
      const n = parseInt(arg) || 0;
      setters.setPages(Math.min(8, Math.max(0, n)));
      response = `PÁGINAS DEFINIDAS PARA ${Math.min(8, Math.max(0, n))}`;
    }
    else if (cmd === "/godmod") { setters.setGodMode(true); response = "MODO DEUS ATIVADO"; }
    else if (cmd === "/ungodmod") { setters.setGodMode(false); response = "MODO DEUS DESATIVADO"; }
    else if (cmd === "/quantitykiller") {
      const n = parseInt(arg) || 1;
      setters.setKillerQuantity(Math.min(10, Math.max(1, n)));
      response = `QUANTIDADE DE KILLERS DEFINIDA PARA ${Math.min(10, Math.max(1, n))}`;
    }
    else if (cmd === "/espdoor") { setters.setEspDoor(true); response = "ESP PORTÃO ATIVADO"; }
    else if (cmd === "/unespdoor") { setters.setEspDoor(false); response = "ESP PORTÃO DESATIVADO"; }
    else if (cmd === "/espmaps") { setters.setEspMaps(true); response = "ESP MAPAS ATIVADO"; }
    else if (cmd === "/unespmaps") { setters.setEspMaps(false); response = "ESP MAPAS DESATIVADO"; }
    else if (cmd === "/esppapers") { setters.setEspPapers(true); response = "ESP PÁGINAS ATIVADO"; }
    else if (cmd === "/unesppapers") { setters.setEspPapers(false); response = "ESP PÁGINAS DESATIVADO"; }
    else if (cmd === "/givegun") { setters.setHasGun(true); response = "ARMA CONCEDIDA"; }
    else if (cmd === "/ungivegun") { setters.setHasGun(false); response = "ARMA REMOVIDA"; }
    else if (cmd === "/speed") { setters.setPlayerSpeed(parseFloat(parts[1]) || 1); response = `VELOCIDADE: ${parts[1] || 1}`; }
    else if (cmd === "/tpdoor") { setters.teleportToDoor(); response = "TELEPORTADO PARA O PORTÃO"; }
    else if (cmd === "/invisible") { setters.setIsInvisible(true); response = "INVISIBILIDADE ATIVADA"; }
    else if (cmd === "/uninvisible") { setters.setIsInvisible(false); response = "INVISIBILIDADE DESATIVADA"; }
    else if (cmd === "/radar") { setters.setRadarEnabled(true); response = "RADAR ATIVADO"; }
    else if (cmd === "/unradar") { setters.setRadarEnabled(false); response = "RADAR DESATIVADO"; }
    else if (cmd === "/gravity") { setters.setGravity(parseFloat(parts[1]) || 1); response = `GRAVIDADE: ${parts[1] || 1}`; }
    else if (cmd === "/nightvision") { setters.setNightVision(true); response = "VISÃO NOTURNA ATIVADA"; }
    else if (cmd === "/unnightvision") { setters.setNightVision(false); response = "VISÃO NOTURNA DESATIVADA"; }
    else if (cmd === "/fog") { setters.setFogDensity(parseFloat(parts[1]) || 40); response = `NEBLINA: ${parts[1] || 40}`; }
    else if (cmd === "/fov") { setters.setFov(parseFloat(parts[1]) || 75); response = `FOV: ${parts[1] || 75}`; }
    else if (cmd === "/grayscale") { setters.setIsGrayscale(true); response = "MODO CINZA ATIVADO"; }
    else if (cmd === "/ungrayscale") { setters.setIsGrayscale(false); response = "MODO CINZA DESATIVADO"; }
    else if (cmd === "/pixelate") { setters.setIsPixelated(true); response = "MODO PIXEL ATIVADO"; }
    else if (cmd === "/unpixelate") { setters.setIsPixelated(false); response = "MODO PIXEL DESATIVADO"; }
    else if (cmd === "/jumpscare") { setters.setJumpScareActive(true); setTimeout(() => setters.setJumpScareActive(false), 1000); response = "BOO!"; }
    else if (cmd === "/highjump") { setters.setHighJump(true); response = "PULO ALTO ATIVADO"; }
    else if (cmd === "/unhighjump") { setters.setHighJump(false); response = "PULO ALTO DESATIVADO"; }
    else if (cmd === "/slowmo") { setters.setTimeScale(0.5); response = "CÂMERA LENTA"; }
    else if (cmd === "/fastforward") { setters.setTimeScale(2); response = "TEMPO ACELERADO"; }
    else if (cmd === "/normaltime") { setters.setTimeScale(1); response = "TEMPO NORMAL"; }
    else if (cmd === "/coords") { setters.setShowCoords(true); response = "COORDENADAS ATIVADAS"; }
    else if (cmd === "/uncoords") { setters.setShowCoords(false); response = "COORDENADAS DESATIVADAS"; }
    else if (cmd === "/fps") { setters.setShowFps(true); response = "FPS ATIVADO"; }
    else if (cmd === "/unfps") { setters.setShowFps(false); response = "FPS DESATIVADO"; }
    else if (cmd === "/brightness") { setters.setBrightness(parseFloat(parts[1]) || 1); response = `BRILHO: ${parts[1] || 1}`; }
    else if (cmd === "/volume") { setters.setGameVolume(parseFloat(parts[1]) || 0.5); response = `VOLUME: ${parts[1] || 0.5}`; }
    else if (cmd === "/win") { setters.setPages(8); response = "VITÓRIA INSTANTÂNEA"; }
    else if (cmd === "/reset") { setters.resetGame(); response = "REINICIANDO..."; }
    else if (cmd === "help") { 
      response = "COMANDOS: /freezetemp, /stopkiller, /day, /fly, /killkiller, /givemap, /givepaper {n}, /godmod, /quantitykiller {n}, /espdoor, /espmaps, /esppapers, /givegun, /speed {n}, /tpdoor, /invisible, /radar, /gravity {n}, /nightvision, /fog {n}, /fov {n}, /grayscale, /pixelate, /jumpscare, /highjump, /slowmo, /fastforward, /coords, /fps, /brightness {n}, /volume {n}, /win, /reset"; 
    }

    setHistory(prev => [...prev, `> ${input}`, response]);
    setInput("");
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 md:p-10 font-mono pointer-events-auto">
      <div className="w-full max-w-2xl h-[400px] bg-zinc-900 border border-white/20 rounded-lg flex flex-col overflow-hidden shadow-2xl">
        <div className="bg-zinc-800 px-4 py-2 border-b border-white/10 flex justify-between items-center">
          <span className="text-xs tracking-widest opacity-50">TERMINAL_CONSOLE</span>
          <button onClick={onClose} className="text-white hover:text-red-500 transition-colors">✕</button>
        </div>
        <div className="flex-1 p-4 overflow-y-auto text-green-500 text-sm space-y-1">
          {history.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
          <form onSubmit={handleCommand} className="flex gap-2">
            <span className="text-white">{'>'}</span>
            <input 
              ref={inputRef}
              type="text" 
              value={input} 
              onChange={(e) => setInput(e.target.value)}
              className="bg-transparent border-none outline-none flex-1 text-green-500"
              autoFocus
            />
          </form>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTE: APP PRINCIPAL ---
const App: React.FC = () => {
  const [status, setStatus] = useState<GameStatus>(GameStatus.MENU);
  const [pages, setPages] = useState(0);
  const [flashlight, setFlashlight] = useState(true);
  const [staticAmount, setStaticAmount] = useState(0);
  const [msg, setMsg] = useState("");
  const [deathNote, setDeathNote] = useState("");
  const [isMobile] = useState(() => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  const joy = useRef({ front: 0, side: 0 });
  const look = useRef({ x: 0, y: 0 });
  const [angle, setAngle] = useState<number | null>(null);
  const [jumpscare, setJumpscare] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [hasMap, setHasMap] = useState(false);
  const [collectedIndices, setCollectedIndices] = useState<number[]>([]);
  const [pagePositions, setPagePositions] = useState<[number, number, number][]>(INITIAL_PAGE_POSITIONS);
  const [mapPageIndex, setMapPageIndex] = useState<number | null>(null);
  const [timer, setTimer] = useState<number | null>(null);
  const playerPos = useRef(new THREE.Vector3());
  const playerAngle = useRef(0);

  const [isMouseDown, setIsMouseDown] = useState(false);
  const [menuSlenderVisible, setMenuSlenderVisible] = useState(true);
  const [terminalEnabled, setTerminalEnabled] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);

  // Terminal States
  const [freezeTemp, setFreezeTemp] = useState(false);
  const [stopKiller, setStopKiller] = useState(false);
  const [isDay, setIsDay] = useState(false);
  const [isFlying, setIsFlying] = useState(false);
  const [killerKilled, setKillerKilled] = useState(false);
  const [godMode, setGodMode] = useState(false);
  const [killerQuantity, setKillerQuantity] = useState(1);
  const [espDoor, setEspDoor] = useState(false);
  const [espMaps, setEspMaps] = useState(false);
  const [espPapers, setEspPapers] = useState(false);
  const [hasGun, setHasGun] = useState(false);
  const [isShooting, setIsShooting] = useState(false);
  const [playerSpeed, setPlayerSpeed] = useState(1);
  const [isInvisible, setIsInvisible] = useState(false);
  const [radarEnabled, setRadarEnabled] = useState(false);
  const [gravity, setGravity] = useState(1);
  const [radarIntensity, setRadarIntensity] = useState(0);
  const [isRaining, setIsRaining] = useState(true);
  const [hallucinationCount, setHallucinationCount] = useState(0);
  const [collisionEnabled, setCollisionEnabled] = useState(true);
  const [flashlightIntensity, setFlashlightIntensity] = useState(80);
  const [fov, setFov] = useState(75);
  const [fogDensity, setFogDensity] = useState(40);
  const [isGrayscale, setIsGrayscale] = useState(false);
  const [isPixelated, setIsPixelated] = useState(false);
  const [jumpScareActive, setJumpScareActive] = useState(false);
  const [gameVolume, setGameVolume] = useState(0.5);
  const [brightness, setBrightness] = useState(1);
  const [highJump, setHighJump] = useState(false);
  const [timeScale, setTimeScale] = useState(1);
  const [showCoords, setShowCoords] = useState(false);
  const [showFps, setShowFps] = useState(false);
  const [nightVision, setNightVision] = useState(false);

  const startGame = () => {
    // Request full screen on mobile
    if (isMobile) {
      const docEl = document.documentElement;
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch(() => {});
      } else if ((docEl as any).webkitRequestFullscreen) {
        (docEl as any).webkitRequestFullscreen();
      } else if ((docEl as any).msRequestFullscreen) {
        (docEl as any).msRequestFullscreen();
      }
    }

    // Generate random page positions
    const randomPositions: [number, number, number][] = Array.from({ length: 8 }).map(() => {
      const x = (Math.random() - 0.5) * 300;
      const z = (Math.random() - 0.5) * 300;
      return [x, 1, z];
    });
    setPagePositions(randomPositions);

    setPages(0);
    setCollectedIndices([]);
    setMapPageIndex(null);
    setTimer(null);
    setHasMap(false);
    setShowMap(false);
    setStatus(GameStatus.PLAYING);
    setJumpscare(false);
    setMsg("ENCONTRE AS 8 PÁGINAS");
    setTimeout(() => setMsg(""), 4000);
    
    // Reset terminal states on new game
    setFreezeTemp(false);
    setStopKiller(false);
    setIsDay(false);
    setIsFlying(false);
    setKillerKilled(false);
    setGodMode(false);
    setKillerQuantity(1);
    setEspDoor(false);
    setEspMaps(false);
    setEspPapers(false);
    setHasGun(false);
    setIsShooting(false);
    setPlayerSpeed(1);
    setIsInvisible(false);
    setRadarEnabled(false);
    setGravity(1);
    setRadarIntensity(0);
    setIsRaining(true);
    setHallucinationCount(0);
    setCollisionEnabled(true);
    setFlashlightIntensity(80);
    setFov(75);
    setFogDensity(40);
    setIsGrayscale(false);
    setIsPixelated(false);
    setJumpScareActive(false);
    setHighJump(false);
    setTimeScale(1);
    setShowCoords(false);
    setShowFps(false);
    setNightVision(false);
  };

  // Menu Slender Flicker (every 15s)
  useEffect(() => {
    if (status !== GameStatus.MENU) return;
    const interval = setInterval(() => {
      setMenuSlenderVisible(false);
      setTimeout(() => setMenuSlenderVisible(true), 200); // Quick flicker
    }, 15000);
    return () => clearInterval(interval);
  }, [status]);

  // Automatic Full Screen for Mobile
  useEffect(() => {
    if (!isMobile || status !== GameStatus.MENU) return;

    const handleFirstTouch = () => {
      const docEl = document.documentElement;
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch(() => {});
      } else if ((docEl as any).webkitRequestFullscreen) {
        (docEl as any).webkitRequestFullscreen();
      } else if ((docEl as any).msRequestFullscreen) {
        (docEl as any).msRequestFullscreen();
      }
      window.removeEventListener('touchstart', handleFirstTouch);
      window.removeEventListener('click', handleFirstTouch);
    };

    window.addEventListener('touchstart', handleFirstTouch);
    window.addEventListener('click', handleFirstTouch);
    return () => {
      window.removeEventListener('touchstart', handleFirstTouch);
      window.removeEventListener('click', handleFirstTouch);
    };
  }, [isMobile, status]);

  // Timer Countdown
  useEffect(() => {
    if (timer === null || status !== GameStatus.PLAYING || freezeTemp) return;
    if (timer <= 0) {
      handleDeath();
      return;
    }
    const interval = setInterval(() => setTimer(t => (t !== null ? t - 1 : null)), 1000);
    return () => clearInterval(interval);
  }, [timer, status, freezeTemp]);

  // Cycle page shown on map every 10 seconds
  useEffect(() => {
    if (status !== GameStatus.PLAYING && status !== GameStatus.PAUSED) return;
    
    const cycleMapPage = () => {
      const available = pagePositions.map((_, i) => i).filter(i => !collectedIndices.includes(i));
      if (available.length > 0) {
        const next = available[Math.floor(Math.random() * available.length)];
        setMapPageIndex(next);
      } else {
        setMapPageIndex(null);
      }
    };

    if (mapPageIndex === null) cycleMapPage();

    const interval = setInterval(cycleMapPage, 10000);
    return () => clearInterval(interval);
  }, [status, collectedIndices, mapPageIndex, pagePositions]);

  // Ensure mouse release on pause
  useEffect(() => {
    if (status === GameStatus.PAUSED || status === GameStatus.MENU || status === GameStatus.GAME_OVER || status === GameStatus.VICTORY) {
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
    }
  }, [status]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyF' && status === GameStatus.PLAYING) {
        setFlashlight(prev => !prev);
      }
      if (e.code === 'KeyG' && (status === GameStatus.PLAYING || status === GameStatus.PAUSED)) {
        if (hasMap) setShowMap(prev => !prev);
        else {
          setMsg("VOCÊ NÃO TEM UM MAPA");
          setTimeout(() => setMsg(""), 2000);
        }
      }
      if (e.code === 'Escape') {
        if (status === GameStatus.PLAYING) setStatus(GameStatus.PAUSED);
        else if (status === GameStatus.PAUSED) { setStatus(GameStatus.PLAYING); setShowMap(false); }
      }
    };

    const handleMouseUpGlobal = () => {
      setIsMouseDown(false);
      look.current = { x: 0, y: 0 };
    };
    const handleMouseDownGlobal = () => setIsMouseDown(true);
    
    const handleMouseMoveGlobal = (e: MouseEvent) => {
      if (status === GameStatus.PLAYING && !isMobile && !document.pointerLockElement) {
        // Only rotate if mouse is down on the RIGHT side of the screen
        // This prevents the joystick (on the left) from rotating the camera
        if (isMouseDown && e.clientX > window.innerWidth / 2) {
          look.current = { x: e.clientX, y: e.clientY };
        } else {
          look.current = { x: 0, y: 0 };
        }
      }
    };

    const handleGlobalReset = () => {
      setIsMouseDown(false);
      look.current = { x: 0, y: 0 };
      // We don't reset joy here because Joystick component handles its own end
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mouseup', handleGlobalReset);
    window.addEventListener('mousedown', handleMouseDownGlobal);
    window.addEventListener('mousemove', handleMouseMoveGlobal);
    window.addEventListener('blur', handleGlobalReset);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mouseup', handleGlobalReset);
      window.removeEventListener('mousedown', handleMouseDownGlobal);
      window.removeEventListener('mousemove', handleMouseMoveGlobal);
      window.removeEventListener('blur', handleGlobalReset);
    };
  }, [status, hasMap, isMouseDown, isMobile]);

  const handleDeath = async () => {
    if (status !== GameStatus.PLAYING || jumpscare) return;
    setJumpscare(true);
    setTimeout(async () => {
      setStatus(GameStatus.GAME_OVER);
      try {
        const msg = await getDeathMessage();
        setDeathNote(msg);
      } catch (e) {
        setDeathNote("FIM DE JOGO");
      }
      setJumpscare(false);
    }, 1500);
  };

  // Handle timer start when 8 pages are collected
  useEffect(() => {
    if (pages === 8 && timer === null && status === GameStatus.PLAYING) {
      setTimer(90);
      setMsg("O PORTÃO ESTÁ ABERTO! FUJA PARA O NORTE!");
      setTimeout(() => setMsg(""), 5000);
    }
  }, [pages, timer, status]);

  const handlePage = async (id: number) => {
    if (collectedIndices.includes(id)) return;
    new Audio('https://www.soundjay.com/misc/paper-rustle-1.mp3').play().catch(() => {});
    const newCollected = [...collectedIndices, id];
    setCollectedIndices(newCollected);
    const n = newCollected.length;
    setPages(n);
    if (n < 8) {
      const m = await getCrypticMessage(n);
      setMsg(m);
      setHallucinationCount(prev => prev + 1);
      setTimeout(() => setMsg(""), 3000);
    }
  };

  const handleGateReach = () => {
    if (pages === 8) {
      setStatus(GameStatus.VICTORY);
    }
  };

  const handleCollectMap = () => {
    setHasMap(true);
    setMsg("MAPA COLETADO (G)");
    setTimeout(() => setMsg(""), 3000);
  };

  return (
    <div className="w-full h-full bg-black relative overflow-hidden select-none"
      onTouchMove={(e) => {
        if (status === GameStatus.PLAYING && e.touches[0].clientX > window.innerWidth / 2) {
          const touch = e.touches[0];
          look.current = { x: touch.clientX, y: touch.clientY };
        }
      }}
      onTouchEnd={() => { look.current = { x: 0, y: 0 }; }}>

      {/* Crosshair (Red Dot) */}
      {status === GameStatus.PLAYING && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-red-600 rounded-full z-50 shadow-[0_0_5px_rgba(220,38,38,0.8)] pointer-events-none" />
      )}

      {/* Noise Effect */}
      <div className="absolute inset-0 pointer-events-none z-10 opacity-20 bg-[url('https://upload.wikimedia.org/wikipedia/commons/b/b1/Static_noise.gif')]"
        style={{ opacity: 0.05 + staticAmount * 0.8 }} />

      {jumpscare && (
        <div className="absolute inset-0 z-[100] bg-white flex items-center justify-center animate-pulse">
          <img src="https://upload.wikimedia.org/wikipedia/commons/b/be/Slender_Man_screenshot.png" className="w-full h-full object-cover grayscale invert" referrerPolicy="no-referrer" />
        </div>
      )}

      {/* Crosshair - Red Dot */}
      {status === GameStatus.PLAYING && hasGun && (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50">
          <div className="w-1.5 h-1.5 bg-red-600 rounded-full shadow-[0_0_5px_rgba(220,38,38,0.8)]" />
        </div>
      )}

      {terminalOpen && (
        <Terminal 
          onClose={() => setTerminalOpen(false)} 
          setters={{ 
            setFreezeTemp, setStopKiller, setIsDay, setIsFlying, setKillerKilled, setHasMap, setPages, setGodMode, setKillerQuantity, setEspDoor, setEspMaps, setEspPapers, setHasGun, setPlayerSpeed, setIsInvisible, setRadarEnabled, setGravity, 
            teleportToDoor: () => { playerPos.current.set(0, 1.7, -190); },
            setIsRaining, setCollisionEnabled, setFlashlightIntensity,
            setNightVision, setFogDensity, setFov, setIsGrayscale, setIsPixelated, setJumpScareActive, setHighJump, setTimeScale, setShowCoords, setShowFps, setGameVolume, setBrightness,
            resetGame: () => window.location.reload()
          }}
          states={{ freezeTemp, stopKiller, isDay, isFlying, killerKilled, hasMap, pages, godMode, killerQuantity, espDoor, espMaps, espPapers, hasGun, playerSpeed, isInvisible, radarEnabled, gravity, isRaining, collisionEnabled, flashlightIntensity, nightVision, fogDensity, fov, isGrayscale, isPixelated, jumpScareActive, highJump, timeScale, showCoords, showFps, gameVolume, brightness }}
        />
      )}

      {/* Landscape Warning for Mobile */}
      {isMobile && (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center p-10 text-center pointer-events-none opacity-0 landscape:hidden transition-opacity duration-500" style={{ opacity: window.innerHeight > window.innerWidth ? 1 : 0, pointerEvents: window.innerHeight > window.innerWidth ? 'auto' : 'none' }}>
          <div className="w-20 h-20 border-2 border-white rounded-lg animate-bounce flex items-center justify-center mb-4">
            <div className="w-12 h-6 border border-white rounded-sm rotate-90" />
          </div>
          <h2 className="text-xl font-bold">POR FAVOR, GIRE O APARELHO</h2>
          <p className="text-sm opacity-60 mt-2">Este jogo é melhor aproveitado em modo paisagem.</p>
        </div>
      )}

      {/* JumpScare Overlay */}
      {jumpScareActive && (
        <div className="absolute inset-0 z-[100] bg-white flex items-center justify-center">
          <img src="https://upload.wikimedia.org/wikipedia/commons/b/be/Slender_Man_screenshot.png" className="w-full h-full object-cover grayscale invert" referrerPolicy="no-referrer" />
        </div>
      )}

      {(status === GameStatus.PLAYING || status === GameStatus.PAUSED) && (
        <Canvas shadows camera={{ fov }} style={{ filter: `${isGrayscale ? 'grayscale(1)' : ''} ${isPixelated ? 'contrast(1.5) brightness(1.2)' : ''}` }}>
          <fog attach="fog" args={[isDay ? '#87ceeb' : (nightVision ? '#003300' : '#000'), 0, isDay ? 100 : fogDensity]} />
          <Suspense fallback={null}>
            {!isDay && <Stars count={3000} factor={4} fade />}
            {isRaining && <Rain count={1500} volume={gameVolume} />}
            <ambientLight intensity={isDay ? 0.6 : (nightVision ? 0.4 : 0.02)} />
            {isDay && <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow shadow-mapSize={[1024, 1024]} />}
            <Forest 
              onCollect={handlePage} 
              onCollectMap={handleCollectMap} 
              collectedIndices={collectedIndices} 
              onGateReach={handleGateReach} 
              pagePositions={pagePositions}
              isGateOpen={timer !== null}
              espDoor={espDoor || timer !== null}
              espMaps={espMaps}
              espPapers={espPapers}
            />
            <GameController
              isMobile={isMobile} joy={joy} look={look} flashlight={flashlight}
              onDeath={handleDeath} setStatic={setStaticAmount} pages={pages} setAngle={setAngle}
              paused={status === GameStatus.PAUSED} playerPosRef={playerPos} playerAngleRef={playerAngle}
              isFlying={isFlying} stopKiller={stopKiller} killerKilled={killerKilled}
              godMode={godMode} killerQuantity={killerQuantity}
              hasGun={hasGun} isShooting={isShooting} setIsShooting={setIsShooting}
              playerSpeed={playerSpeed} isInvisible={isInvisible} radarEnabled={radarEnabled} gravity={gravity}
              setRadarIntensity={setRadarIntensity} collisionEnabled={collisionEnabled}
              flashlightIntensity={flashlightIntensity}
              highJump={highJump} timeScale={timeScale} volume={gameVolume}
              timer={timer}
            />
          </Suspense>
        </Canvas>
      )}

      {/* Timer UI */}
      {timer !== null && status === GameStatus.PLAYING && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 z-[70]">
          <TimerDisplay seconds={timer} />
        </div>
      )}

      {/* Map UI */}
      {showMap && (
        <div 
          className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center pointer-events-auto p-4 md:p-10"
          onClick={() => setShowMap(false)}
        >
          <div 
            className="relative flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12 max-w-7xl w-full h-full"
            onClick={(e) => e.stopPropagation()}
          >
            
            {/* Map Square (Left/Large) */}
            <div className="relative w-full md:flex-1 h-auto aspect-square max-h-[50vh] md:max-h-[85vh] border-2 border-white/20 bg-zinc-900/50 overflow-hidden shadow-2xl">
              <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
              
              {/* Page Marker */}
              {mapPageIndex !== null && (
                <div 
                  className="absolute w-2 h-2 md:w-4 md:h-4 bg-white rounded-sm shadow-[0_0_12px_rgba(255,255,255,1)] z-10 animate-pulse"
                  style={{ 
                    left: `${50 + (pagePositions[mapPageIndex][0] / 400) * 100}%`, 
                    top: `${50 + (pagePositions[mapPageIndex][2] / 400) * 100}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                />
              )}

              {/* Player Marker */}
              <div 
                className="absolute w-3 h-3 md:w-5 md:h-5 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,1)] z-10 border-2 border-white"
                style={{ 
                  left: `${50 + (playerPos.current.x / 400) * 100}%`, 
                  top: `${50 + (playerPos.current.z / 400) * 100}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              />

              {/* Gate Marker */}
              <div 
                className="absolute w-8 h-3 bg-red-500/50 border border-red-500 z-10 flex items-center justify-center text-[8px] text-white font-bold"
                style={{ left: '50%', top: '0%', transform: 'translate(-50%, 0%)' }}
              >
                PORTÃO
              </div>

              {/* Roads */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-0 w-full h-1 md:h-2 bg-white/10 -translate-y-1/2" />
                <div className="absolute left-1/2 top-0 h-full w-1 md:w-2 bg-white/10 -translate-x-1/2" />
                <div className="absolute top-[25%] left-0 w-full h-0.5 md:h-1 bg-white/5 -translate-y-1/2" />
                <div className="absolute top-[75%] left-0 w-full h-0.5 md:h-1 bg-white/5 -translate-y-1/2" />
                <div className="absolute left-[25%] top-0 h-full w-0.5 md:w-1 bg-white/5 -translate-x-1/2" />
                <div className="absolute left-[75%] top-0 h-full w-0.5 md:w-1 bg-white/5 -translate-x-1/2" />
              </div>

              <div className="absolute top-4 left-4 text-[10px] md:text-sm opacity-50 tracking-[0.4em] font-black">MAPA DA FLORESTA</div>
            </div>

            {/* Controls Side (Right) */}
            <div className="flex flex-col items-center justify-center gap-1.5 md:gap-6 md:w-64 flex-shrink-0">
              
              {/* FECHAR Button (Top) */}
              <button 
                onClick={() => setShowMap(false)} 
                className="w-14 md:w-full py-1 md:py-3 bg-zinc-800 text-zinc-400 font-bold text-[6px] md:text-lg tracking-[0.2em] md:tracking-[0.3em] hover:bg-zinc-700 transition-all rounded border border-white/10 shadow-lg flex items-center justify-center gap-1"
              >
                <X size={isMobile ? 6 : 20} strokeWidth={3} /> FECHAR
              </button>

              {/* Compass Panel (Bottom) */}
              <div className="flex flex-col items-center gap-0 md:gap-4 bg-black/60 p-0 md:p-8 rounded-lg md:rounded-3xl border border-white/20 backdrop-blur-xl w-full shadow-2xl">
                <div className="text-[0.00000000000000000000000000000000000000000001px] md:text-xs opacity-50 tracking-[0.4em] font-bold">ROSA DOS VENTOS</div>
                <div className="scale-[0.00000000000000000000000000000000000000000001] md:scale-125 py-0 md:py-4 -my-108 md:my-0">
                  <Compass angle={playerAngle.current} />
                </div>
                <div className="text-[0.00000000000000000000000000000000000000000001px] md:text-[11px] opacity-40 text-center leading-tight md:leading-relaxed font-medium">
                  O PONTEIRO VERMELHO INDICA A DIREÇÃO DA SUA VISÃO
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none z-50 p-6 md:p-10 flex flex-col justify-between text-white uppercase font-bold tracking-widest">
        {status === GameStatus.MENU ? (
          <div className="absolute inset-0 bg-zinc-950 flex flex-col md:flex-row items-center justify-center md:justify-between pointer-events-auto border-4 border-white/5 p-4 md:p-20 overflow-hidden">
            {/* Left Side: Menu Content */}
            <div className="flex flex-col items-center md:items-start z-20 text-center md:text-left scale-90 sm:scale-100">
              <motion.h1 
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 0.9 }}
                className="text-5xl md:text-9xl font-bold text-white mb-2 md:mb-4 tracking-[0.2em]"
              >
                SLENDER
              </motion.h1>
              <p className="text-zinc-500 text-[8px] md:text-xs mb-6 md:mb-10 tracking-[0.5em] md:ml-2">O DESPERTAR</p>
              
              <div className="flex flex-col items-center md:items-start gap-4 md:gap-8">
                <button 
                  onClick={startGame} 
                  className="bg-white text-black px-10 md:px-16 py-3 md:py-5 text-base md:text-xl hover:bg-zinc-200 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)] font-black tracking-widest"
                >
                  INICIAR JOGO
                </button>

                <div className="flex flex-wrap justify-center md:justify-start gap-2 md:gap-4">
                  <button 
                    onClick={() => setTerminalEnabled(!terminalEnabled)}
                    className={`text-[7px] md:text-[10px] tracking-[0.3em] px-3 md:px-4 py-1.5 md:py-2 border transition-all ${terminalEnabled ? 'border-white text-white opacity-100' : 'border-white/20 text-white/40 opacity-60'}`}
                  >
                    TERMINAL: {terminalEnabled ? 'ON' : 'OFF'}
                  </button>

                  {isMobile && (
                    <button 
                      onClick={() => {
                        const docEl = document.documentElement;
                        if (docEl.requestFullscreen) {
                          docEl.requestFullscreen().catch(() => {});
                        } else if ((docEl as any).webkitRequestFullscreen) {
                          (docEl as any).webkitRequestFullscreen();
                        } else if ((docEl as any).msRequestFullscreen) {
                          (docEl as any).msRequestFullscreen();
                        }
                      }}
                      className="text-[7px] md:text-[10px] tracking-[0.3em] px-3 md:px-4 py-1.5 md:py-2 border border-white/20 text-white/40 hover:border-white hover:text-white transition-all"
                    >
                      TELA CHEIA
                    </button>
                  )}
                </div>
                
                <div className="hidden sm:flex flex-col gap-2 md:gap-4 text-[7px] md:text-[10px] opacity-40 tracking-widest leading-loose">
                  <div>
                    <p className="font-bold text-white/60 mb-0.5 md:mb-1">PC:</p>
                    <p>WASD: MOVER | F: LANTERNA | MOUSE: OLHAR | ESC: MENU | G: MAPA</p>
                  </div>
                  <div>
                    <p className="font-bold text-white/60 mb-0.5 md:mb-1">CELULAR:</p>
                    <p>JOYSTICK ESQUERDO: MOVER | ARRASTAR DIREITA: OLHAR | BOTÃO F: LANTERNA</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side: 3D Slender Man Preview */}
            <div className="hidden md:block relative w-1/2 h-full pointer-events-none">
              <AnimatePresence>
                {menuSlenderVisible && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.6 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.1 }}
                    className="w-full h-full"
                  >
                    <Canvas camera={{ position: [0, 4, 12], fov: 45 }}>
                      <fog attach="fog" args={['#000', 5, 20]} />
                      <ambientLight intensity={0.05} />
                      <pointLight position={[2, 6, 5]} intensity={1} color="#fff" />
                      <SlenderMan position={new THREE.Vector3(0, 0, 0)} isMenu />
                      
                      {/* Mini Forest Background for Menu */}
                      {[...Array(15)].map((_, i) => (
                        <group key={i} position={[(Math.random() - 0.5) * 30, 0, -5 - Math.random() * 15]}>
                          <mesh position={[0, 3, 0]}>
                            <cylinderGeometry args={[0.2, 0.3, 6]} />
                            <meshStandardMaterial color="#0a0805" />
                          </mesh>
                          <mesh position={[0, 6, 0]}>
                            <coneGeometry args={[1.5, 4]} />
                            <meshStandardMaterial color="#050805" />
                          </mesh>
                        </group>
                      ))}

                      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
                        <planeGeometry args={[100, 100]} />
                        <meshStandardMaterial color="#020202" />
                      </mesh>
                    </Canvas>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Static/Noise overlay for the preview */}
              <div className="absolute inset-0 bg-[url('https://upload.wikimedia.org/wikipedia/commons/b/b1/Static_noise.gif')] opacity-[0.03] mix-blend-overlay" />
            </div>

            {/* Background Glitch Overlay */}
            <div className="absolute inset-0 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20" />
          </div>
        ) : status === GameStatus.PAUSED ? (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center pointer-events-auto backdrop-blur-sm">
            <h2 className="text-5xl mb-10 opacity-80">PAUSADO</h2>
            <div className="flex flex-col gap-4">
              <button onClick={() => setStatus(GameStatus.PLAYING)} className="border border-white/20 px-10 py-4 hover:bg-white hover:text-black transition-all">CONTINUAR</button>
              {hasMap && <button onClick={() => setShowMap(true)} className="border border-white/20 px-10 py-4 hover:bg-white hover:text-black transition-all">VER MAPA</button>}
              {terminalEnabled && <button onClick={() => setTerminalOpen(true)} className="border border-white/20 px-10 py-4 hover:bg-white hover:text-black transition-all text-green-500 border-green-500/30">TERMINAL</button>}
              <button onClick={() => setStatus(GameStatus.MENU)} className="border border-white/20 px-10 py-4 hover:bg-white/10 transition-all opacity-60">MENU PRINCIPAL</button>
            </div>
          </div>
        ) : status === GameStatus.GAME_OVER ? (
          <div className="absolute inset-0 bg-black flex flex-col items-center justify-center pointer-events-auto">
            <h2 className="text-6xl text-red-900 mb-6">FIM</h2>
            <p className="mb-10 text-zinc-500 italic text-center max-w-md">"{deathNote}"</p>
            <button onClick={startGame} className="border border-red-900 text-red-900 px-8 py-3 hover:bg-red-900 hover:text-white transition-all">REINICIAR</button>
          </div>
        ) : status === GameStatus.VICTORY ? (
          <div className="absolute inset-0 bg-white flex flex-col items-center justify-center pointer-events-auto">
            <h2 className="text-6xl text-black mb-6">VOCÊ ESCAPOU</h2>
            <button onClick={() => setStatus(GameStatus.MENU)} className="bg-black text-white px-8 py-3">VOLTAR</button>
          </div>
        ) : null}

        {(status === GameStatus.PLAYING || status === GameStatus.PAUSED) && (
          <>
            <div className="flex justify-between items-center">
              <div className="flex flex-col gap-1">
                <div className="text-sm md:text-base">PÁGINAS: {pages}/8</div>
                <div className="text-[8px] md:text-[10px] opacity-50">BATERIA: {flashlight ? 'OK' : 'OFF'}</div>
              </div>
              
              <div className="flex items-center gap-4 pointer-events-auto">
                {isMobile && hasMap && (
                  <button 
                    onClick={() => setShowMap(!showMap)}
                    className="w-10 h-10 flex items-center justify-center border border-white/10 rounded bg-black/20"
                  >
                    <MapIcon size={20} />
                  </button>
                )}
                
                {/* Hamburger Menu Button */}
                <button 
                  onClick={() => setStatus(status === GameStatus.PAUSED ? GameStatus.PLAYING : GameStatus.PAUSED)}
                  className="w-10 h-10 flex flex-col items-center justify-center gap-1.5 border border-white/10 rounded bg-black/20"
                >
                  <Menu size={20} />
                </button>
              </div>
            </div>
            
            {/* Debug Info */}
            {showCoords && (
              <div className="absolute top-32 left-10 text-[10px] font-mono opacity-60">
                X: {playerPos.current.x.toFixed(2)} | Z: {playerPos.current.z.toFixed(2)}
              </div>
            )}
            {showFps && (
              <div className="absolute top-36 left-10 text-[10px] font-mono opacity-60">
                FPS: 60
              </div>
            )}

            {/* Radar UI */}
            {radarEnabled && (
              <div className="absolute top-20 right-10 flex flex-col items-center gap-2">
                <div className="text-[10px] opacity-50 tracking-widest">RADAR PROXIMIDADE</div>
                <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden border border-white/5">
                  <motion.div 
                    className="h-full bg-red-500"
                    animate={{ width: `${radarIntensity * 100}%` }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                </div>
                {radarIntensity > 0.8 && <div className="text-[8px] text-red-500 animate-ping">PERIGO PRÓXIMO</div>}
              </div>
            )}

            {/* Click to Lock Message for PC */}
            {status === GameStatus.PLAYING && !isMobile && !document.pointerLockElement && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-black/60 backdrop-blur-sm px-6 py-3 rounded-full border border-white/10 animate-bounce">
                  <p className="text-sm tracking-widest">CLIQUE NA TELA PARA TRAVAR O MOUSE</p>
                </div>
              </div>
            )}
            
            <div className="flex justify-between items-end pointer-events-auto">
              <Joystick onMove={(f, s) => { joy.current = { front: f, side: s }; }} />
              {isMobile && (
                <div className="flex flex-col gap-4">
                  <button 
                    onClick={() => setFlashlight(!flashlight)} 
                    className={`w-16 h-16 rounded-full border border-white/20 flex items-center justify-center transition-all ${flashlight ? 'bg-white text-black' : 'bg-black/50 text-white'}`}
                  >
                    <Lightbulb size={24} />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const GameController = ({ isMobile, joy, look, flashlight, onDeath, setStatic, pages, setAngle, paused, playerPosRef, playerAngleRef, isFlying, stopKiller, killerKilled, godMode, killerQuantity, hasGun, isShooting, setIsShooting, playerSpeed, isInvisible, radarEnabled, gravity, setRadarIntensity, collisionEnabled, flashlightIntensity, highJump, timeScale, volume, timer }: any) => {
  const { camera, scene, gl } = useThree();
  const [slenderPositions, setSlenderPositions] = useState<THREE.Vector3[]>([]);
  const [slenderDead, setSlenderDead] = useState<boolean[]>([]);
  const lastTeleport = useRef(0);
  const light = useRef<THREE.SpotLight>(null!);
  const target = useRef(new THREE.Object3D());
  const gunRef = useRef<THREE.Group>(null!);
  const keys = useRef<Record<string, boolean>>({});
  const lastLook = useRef({ x: 0, y: 0 });
  const [pointerLocked, setPointerLocked] = useState(false);
  const lastThunder = useRef(0);
  const shotHandled = useRef(false);

  // Initialize Slender positions
  useEffect(() => {
    const initial = [];
    const initialDead = [];
    for (let i = 0; i < killerQuantity; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 20 + Math.random() * 20;
      initial.push(new THREE.Vector3(
        camera.position.x + Math.cos(angle) * dist,
        0,
        camera.position.z + Math.sin(angle) * dist
      ));
      initialDead.push(false);
    }
    setSlenderPositions(initial);
    setSlenderDead(initialDead);
  }, [killerQuantity]);
  
  const sounds = useRef<{
    footsteps: HTMLAudioElement;
    static: HTMLAudioElement;
    thunder: HTMLAudioElement;
    shot: HTMLAudioElement;
  } | null>(null);

  useEffect(() => {
    sounds.current = {
      footsteps: new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'),
      static: new Audio('https://www.soundjay.com/misc/white-noise-01.mp3'),
      thunder: new Audio('https://www.soundjay.com/nature/thunder-01.mp3'),
      shot: new Audio('https://www.soundjay.com/mechanical/gun-shot-01.mp3')
    };
    sounds.current.footsteps.loop = true;
    sounds.current.static.loop = true;
    sounds.current.static.volume = 0;
    
    const unlockAudio = () => {
      sounds.current?.static.play().catch(() => {});
      window.removeEventListener('click', unlockAudio);
    };
    window.addEventListener('click', unlockAudio);
    
    return () => {
      if (sounds.current) {
        Object.values(sounds.current).forEach(s => s.pause());
        sounds.current = null;
      }
      window.removeEventListener('click', unlockAudio);
    };
  }, []);

  useEffect(() => {
    if (sounds.current) {
      sounds.current.footsteps.volume = volume * 0.5;
      sounds.current.static.volume = volume * 0.3;
      sounds.current.thunder.volume = volume;
      sounds.current.shot.volume = volume;
    }
  }, [volume]);

  // Tree positions for collision (must match Forest)
  const treePositions = useMemo(() => {
    const pos: THREE.Vector3[] = [];
    const rng = (s: number) => {
      const x = Math.sin(s) * 10000;
      return x - Math.floor(x);
    };
    for (let i = 0; i < 400; i++) {
      const x = (rng(i * 1.5) - 0.5) * 400;
      const z = (rng(i * 2.5) - 0.5) * 400;
      if (Math.abs(x) < 10 && Math.abs(z) < 200) continue;
      if (Math.abs(z) < 10 && Math.abs(x) < 200) continue;
      pos.push(new THREE.Vector3(x, 0, z));
    }
    return pos;
  }, []);

  useEffect(() => {
    scene.add(target.current);
    const onKeyDown = (e: KeyboardEvent) => { keys.current[e.code] = true; };
    const onKeyUp = (e: KeyboardEvent) => { keys.current[e.code] = false; };
    const onBlur = () => { 
      keys.current = {}; 
      joy.current = { front: 0, side: 0 };
      look.current = { x: 0, y: 0 };
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    const onPointerLockChange = () => {
      setPointerLocked(!!document.pointerLockElement);
    };
    
    const onMouseDown = (e: MouseEvent) => {
      if (hasGun && !paused && e.button === 0) {
        setIsShooting(true);
        setTimeout(() => setIsShooting(false), 100);
      }
    };

    document.addEventListener('pointerlockchange', onPointerLockChange);
    window.addEventListener('mousedown', onMouseDown);

    return () => {
      scene.remove(target.current);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      window.removeEventListener('mousedown', onMouseDown);
    };
  }, [scene, hasGun, paused, setIsShooting]);

  useFrame((state, delta) => {
    if (paused) return;

    let f = joy.current.front || (keys.current['KeyW'] ? 1 : (keys.current['KeyS'] ? -1 : 0));
    let s = joy.current.side || (keys.current['KeyD'] ? 1 : (keys.current['KeyA'] ? -1 : 0));

    if (f || s) {
      const dir = new THREE.Vector3(); camera.getWorldDirection(dir); 
      if (!isFlying) dir.y = 0; 
      dir.normalize();
      const side = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
      const speedMult = 0.15 * playerSpeed;
      
      const nextPos = camera.position.clone();
      nextPos.addScaledVector(dir, f * speedMult);
      nextPos.addScaledVector(side, s * speedMult);

      // Collision check
      let canMove = true;
      if (collisionEnabled && !isFlying) {
        for (const tree of treePositions) {
          const d = new THREE.Vector2(nextPos.x, nextPos.z).distanceTo(new THREE.Vector2(tree.x, tree.z));
          if (d < 1.5) { canMove = false; break; }
        }
      }

      if (canMove) {
        camera.position.copy(nextPos);
        // HeadBob
        if (!isFlying) {
          camera.position.y = 1.7 + Math.sin(state.clock.elapsedTime * 10 * timeScale) * 0.05;
          if (sounds.current && sounds.current.footsteps.paused) sounds.current.footsteps.play().catch(() => {});
        }
      }
    } else {
      if (sounds.current) sounds.current.footsteps.pause();
    }
    
    if (isFlying) {
      if (keys.current['Space']) camera.position.y += 0.1 * playerSpeed * timeScale;
      if (keys.current['ShiftLeft']) camera.position.y -= 0.1 * playerSpeed * timeScale;
    } else {
      // Basic gravity simulation if not flying
      if (camera.position.y > 1.7) {
        camera.position.y -= 0.05 * gravity * timeScale;
        if (camera.position.y < 1.7) camera.position.y = 1.7;
      } else if (highJump && keys.current['Space']) {
        camera.position.y += 2; // Simple high jump
      } else {
        camera.position.y = 1.7;
      }
    }

    playerPosRef.current.copy(camera.position);
    
    // Track rotation for compass
    const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
    playerAngleRef.current = euler.y;

    // Mouse Look Fallback (when pointer lock is not active or on mobile)
    const currentLook = look.current;
    if (currentLook.x !== 0) {
      if (lastLook.current.x !== 0) {
        const dx = (currentLook.x - lastLook.current.x) * 0.005;
        const dy = (currentLook.y - lastLook.current.y) * 0.005;
        const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
        euler.y -= dx;
        euler.x -= dy;
        euler.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, euler.x));
        camera.quaternion.setFromEuler(euler);
      }
      lastLook.current = { x: currentLook.x, y: currentLook.y };
    } else {
      lastLook.current = { x: 0, y: 0 };
    }

    const lookDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    target.current.position.copy(camera.position).add(lookDir);
    if (light.current) { 
      light.current.position.copy(camera.position); 
      light.current.target = target.current; 
      light.current.intensity = flashlight ? flashlightIntensity : 0;
    }

    // Thunder logic
    if (state.clock.elapsedTime - lastThunder.current > 10 + Math.random() * 20) {
      lastThunder.current = state.clock.elapsedTime;
      scene.background = new THREE.Color('#fff');
      if (sounds.current) sounds.current.thunder.play().catch(() => {});
      setTimeout(() => { scene.background = new THREE.Color('#000'); }, 100);
    }

    // Shooting logic
    if (isShooting && hasGun) {
      if (!shotHandled.current) {
        shotHandled.current = true;
        if (sounds.current) {
          sounds.current.shot.currentTime = 0;
          sounds.current.shot.play().catch(() => {});
        }
        const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
        slenderPositions.forEach((pos, i) => {
          if (slenderDead[i]) return;
          const toKiller = pos.clone().sub(camera.position).normalize();
          const dot = dir.dot(toKiller);
          const dist = camera.position.distanceTo(pos);
          if (dot > 0.99 && dist < 30) {
            // Kill Slender (Move away)
            const newPos = pos.clone().set(1000, 0, 1000);
            const updated = [...slenderPositions];
            updated[i] = newPos;
            setSlenderPositions(updated);
            
            const updatedDead = [...slenderDead];
            updatedDead[i] = true;
            setSlenderDead(updatedDead);
            
            setTimeout(() => {
              // Respawn
              const angle = Math.random() * Math.PI * 2;
              const r = 20 + Math.random() * 20;
              const respawnPos = new THREE.Vector3(camera.position.x + Math.cos(angle) * r, 0, camera.position.z + Math.sin(angle) * r);
              setSlenderPositions(prev => {
                const next = [...prev];
                next[i] = respawnPos;
                return next;
              });
              setSlenderDead(prev => {
                const next = [...prev];
                next[i] = false;
                return next;
              });
            }, 5000);
          }
        });
      }
    } else {
      shotHandled.current = false;
    }

    let maxStatic = 0;
    let nearestDist = 999;
    if (!killerKilled) {
      slenderPositions.forEach(pos => {
        const dist = camera.position.distanceTo(pos);
        if (dist < nearestDist) nearestDist = dist;
        const s = dist < 30 ? (30 - dist) / 30 : 0;
        if (s > maxStatic) maxStatic = s;
        if (!godMode && !isInvisible && dist < 4) onDeath();
      });
    }
    setStatic(maxStatic);
    if (sounds.current) sounds.current.static.volume = maxStatic * volume * 0.5;

    // Radar logic
    if (radarEnabled && !killerKilled) {
      const intensity = Math.max(0, (50 - nearestDist) / 50);
      setRadarIntensity(intensity);
    } else {
      setRadarIntensity(0);
    }

    // Slender logic (Teleport and Movement)
    const teleportInterval = timer !== null ? 3.5 : (10 - pages);
    if (!stopKiller && !killerKilled && state.clock.elapsedTime - lastTeleport.current > teleportInterval) {
      const newPositions = slenderPositions.map((pos, i) => {
        if (slenderDead[i]) return pos;
        const a = Math.random() * Math.PI * 2;
        const d = timer !== null ? (12 + Math.random() * 8) : (15 + Math.random() * 20);
        return new THREE.Vector3(camera.position.x + Math.cos(a) * d, 0, camera.position.z + Math.sin(a) * d);
      });
      setSlenderPositions(newPositions);
      lastTeleport.current = state.clock.elapsedTime;
    }

    // Slender Walk Logic removed as per user request

    // Gun Viewmodel following camera with smoothing
    if (gunRef.current) {
      const cam = state.camera;
      const targetPos = cam.position.clone();
      const targetQuat = cam.quaternion.clone();
      
      // Offset gun from camera center
      const offset = new THREE.Vector3(0.4, -0.35, -0.6);
      offset.applyQuaternion(targetQuat);
      targetPos.add(offset);
      
      // Smoothly interpolate position and rotation
      gunRef.current.position.lerp(targetPos, 0.2);
      gunRef.current.quaternion.slerp(targetQuat, 0.2);
    }
  });

  return (
    <>
      {!isMobile && !paused && (
        <PointerLockControls 
          onLock={() => setPointerLocked(true)} 
          onUnlock={() => setPointerLocked(false)}
        />
      )}
      {!killerKilled && slenderPositions.map((pos, i) => (
        !slenderDead[i] && <SlenderMan key={i} position={pos} />
      ))}
      <spotLight ref={light} intensity={flashlight ? 50 : 0} distance={40} angle={0.5} penumbra={1} castShadow />
      
      {/* 3D Gun Viewmodel */}
      {hasGun && (
        <group ref={gunRef}>
          <group position={[0.3, -0.4, -0.6]} rotation={[0, Math.PI, 0]}>
            {/* Gun Body */}
            <mesh position={[0, 0, 0.2]}>
              <boxGeometry args={[0.1, 0.15, 0.5]} />
              <meshStandardMaterial color="#111" roughness={0.3} metalness={0.8} />
            </mesh>
            {/* Handle */}
            <mesh position={[0, -0.15, 0.35]} rotation={[0.3, 0, 0]}>
              <boxGeometry args={[0.08, 0.25, 0.1]} />
              <meshStandardMaterial color="#050505" />
            </mesh>
            {/* Barrel */}
            <mesh position={[0, 0.03, -0.1]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.02, 0.02, 0.4]} />
              <meshStandardMaterial color="#222" metalness={1} />
            </mesh>
            
            {/* Muzzle Flash */}
            {isShooting && (
              <pointLight position={[0, 0.03, -0.3]} intensity={5} color="#ffaa00" distance={5} />
            )}
            {isShooting && (
              <mesh position={[0, 0.03, -0.35]}>
                <sphereGeometry args={[0.05, 8, 8]} />
                <meshBasicMaterial color="#ffcc00" transparent opacity={0.8} />
              </mesh>
            )}
          </group>
        </group>
      )}
    </>
  );
};

export default App;
