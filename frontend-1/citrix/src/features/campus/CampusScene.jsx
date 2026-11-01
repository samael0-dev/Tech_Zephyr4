// src/features/campus/CampusScene.jsx
import React, { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { CAMPUS_BUILDINGS, CAMPUS_TREES } from '@/data/campusLayout';

// Enhanced palette for buildings inspired by stylized architectural low-poly models
const BUILDING_THEMES = {
  'academic-a': {
    wallColor: '#8C3D28', // Rich warm brick terracotta
    trimColor: '#D97706', // Warm amber sandstone columns
    roofColor: '#F1F5F9', // Crisp white cornice roof
    windowFrame: '#FEF08A', // Warm cream frame
    windowGlass: '#38BDF8', // Cyan sky reflective glass
    awning: true,
  },
  'academic-b': {
    wallColor: '#9A3412', // Warm amber-terracotta
    trimColor: '#EA580C', // Rich ochre column trim
    roofColor: '#F8FAFC',
    windowFrame: '#FDE047',
    windowGlass: '#38BDF8',
    awning: false,
  },
  'cs-block': {
    wallColor: '#1E293B', // Slate modern high-tech block
    trimColor: '#0EA5E9', // Electric sky cyan pillars
    roofColor: '#E2E8F0',
    windowFrame: '#67E8F9',
    windowGlass: '#06B6D4',
    awning: false,
  },
  'electronics-block': {
    wallColor: '#78350F', // Warm cedar brick
    trimColor: '#F59E0B', // Golden solar trim
    roofColor: '#F8FAFC',
    windowFrame: '#FDE68A',
    windowGlass: '#38BDF8',
    awning: true,
  },
  'mech-workshop': {
    wallColor: '#451A03', // Deep industrial brick
    trimColor: '#C2410C', // Copper rust structural columns
    roofColor: '#CBD5E1',
    windowFrame: '#FDBA74',
    windowGlass: '#67E8F9',
    awning: false,
  },
  'civil-block': {
    wallColor: '#334155', // Structural slate concrete
    trimColor: '#8B5CF6', // Purple architectural accent
    roofColor: '#F1F5F9',
    windowFrame: '#DDD6FE',
    windowGlass: '#38BDF8',
    awning: false,
  },
  auditorium: {
    wallColor: '#312E81', // Grand royal indigo
    trimColor: '#A855F7', // Luminous violet pillars
    roofColor: '#FFFFFF',
    windowFrame: '#FCD34D',
    windowGlass: '#38BDF8',
    awning: true,
  },
  'deans-block': {
    wallColor: '#0F172A', // Sovereign dark obsidian & marble
    trimColor: '#14B8A6', // Jade teal administrative columns
    roofColor: '#FFFFFF',
    windowFrame: '#CCFBF1',
    windowGlass: '#38BDF8',
    awning: false,
  },
};

// Stylized Tree with trunk and layered low-poly foliage
function StylizedTree({ position }) {
  return (
    <group position={position}>
      {/* Trunk */}
      <mesh position={[0, 0.45, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.14, 0.9, 7]} />
        <meshStandardMaterial color="#6B4423" roughness={0.9} />
      </mesh>
      {/* Foliage Layers */}
      <mesh position={[0, 1.15, 0]} castShadow>
        <coneGeometry args={[0.65, 1.1, 7]} />
        <meshStandardMaterial color="#1E6B37" roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.65, 0]} castShadow>
        <coneGeometry args={[0.5, 0.9, 7]} />
        <meshStandardMaterial color="#2B8A48" roughness={0.7} />
      </mesh>
      <mesh position={[0, 2.05, 0]} castShadow>
        <coneGeometry args={[0.32, 0.7, 7]} />
        <meshStandardMaterial color="#3CB368" roughness={0.7} />
      </mesh>
    </group>
  );
}

// Campus ground with stylized roads, quad plaza, and warm grass
function CampusGround() {
  return (
    <group>
      {/* Rich Campus Lawn Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[42, 42]} />
        <meshStandardMaterial color="#1E382B" roughness={0.85} metalness={0.05} />
      </mesh>

      {/* Main East-West Boulevard */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[38, 2.8]} />
        <meshStandardMaterial color="#475569" roughness={0.6} />
      </mesh>

      {/* Main North-South Promenade */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[2.8, 38]} />
        <meshStandardMaterial color="#475569" roughness={0.6} />
      </mesh>

      {/* Road curbs / stone edges */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, -1.45]} receiveShadow>
        <planeGeometry args={[38, 0.1]} />
        <meshStandardMaterial color="#94A3B8" roughness={0.5} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 1.45]} receiveShadow>
        <planeGeometry args={[38, 0.1]} />
        <meshStandardMaterial color="#94A3B8" roughness={0.5} />
      </mesh>

      {/* Central Campus Courtyard / Quad Plaza */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <circleGeometry args={[4.2, 32]} />
        <meshStandardMaterial color="#64748B" roughness={0.5} />
      </mesh>
      {/* Central Fountain / Monument Ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]} receiveShadow>
        <ringGeometry args={[1.6, 1.85, 32]} />
        <meshStandardMaterial color="#CBD5E1" roughness={0.4} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} receiveShadow>
        <circleGeometry args={[1.5, 32]} />
        <meshStandardMaterial color="#0284C7" roughness={0.1} metalness={0.2} />
      </mesh>
    </group>
  );
}

// Striped Awning (like the red-and-white awning in the reference image)
function Awning({ width, position }) {
  const stripeCount = 6;
  const stripeWidth = width / stripeCount;

  return (
    <group position={position} rotation={[0.4, 0, 0]}>
      {/* Canopy body */}
      <mesh position={[0, 0, 0.35]}>
        <boxGeometry args={[width, 0.08, 0.7]} />
        <meshStandardMaterial color="#DC2626" roughness={0.6} />
      </mesh>
      {/* White Stripes */}
      {Array.from({ length: Math.floor(stripeCount / 2) }).map((_, i) => (
        <mesh
          key={i}
          position={[-width / 2 + stripeWidth * (2 * i + 1) + stripeWidth / 2, 0.045, 0.35]}
        >
          <planeGeometry args={[stripeWidth, 0.7]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

// Window with frame and glossy glass
function WindowComponent({ position, width = 0.55, height = 0.8, theme }) {
  return (
    <group position={position}>
      {/* Outer Window Frame / Border */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[width + 0.1, height + 0.1, 0.08]} />
        <meshStandardMaterial color={theme.windowFrame} roughness={0.4} />
      </mesh>
      {/* Glossy Reflective Glass Pane */}
      <mesh position={[0, 0, 0.03]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial
          color={theme.windowGlass}
          roughness={0.15}
          metalness={0.3}
          emissive={theme.windowGlass}
          emissiveIntensity={0.2}
        />
      </mesh>
    </group>
  );
}

// Beautiful Stylized 3D Building matching reference image
function StylizedBuilding({ building, isSelected, isHovered, onSelect, onHover }) {
  const [posX, , posZ] = building.position;
  const [width, height, depth] = building.size;
  const floorCount = building.floors?.length || 2;
  const theme = BUILDING_THEMES[building.id] || BUILDING_THEMES['academic-a'];

  const colThickness = 0.35;
  const colHeight = height + 0.05;

  // Compute window positions for front facade
  const windowSpacingX = width / 3;
  const floorHeight = height / floorCount;

  return (
    <group
      position={[posX, 0, posZ]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(building);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(building.id);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        onHover(null);
      }}
      className="cursor-pointer"
    >
      {/* Plinth / Base Platform */}
      <mesh position={[0, 0.1, 0]} receiveShadow>
        <boxGeometry args={[width + 0.4, 0.2, depth + 0.4]} />
        <meshStandardMaterial color="#334155" roughness={0.7} />
      </mesh>

      {/* Main Wall Core */}
      <mesh position={[0, height / 2 + 0.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          color={isSelected ? '#2563EB' : isHovered ? '#3B82F6' : theme.wallColor}
          roughness={0.5}
        />
      </mesh>

      {/* 4 Architectural Corner Columns (Reference Style) */}
      {[
        [-width / 2, depth / 2],
        [width / 2, depth / 2],
        [-width / 2, -depth / 2],
        [width / 2, -depth / 2],
      ].map(([cx, cz], idx) => (
        <group key={`col-${idx}`} position={[cx, colHeight / 2 + 0.1, cz]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[colThickness, colHeight, colThickness]} />
            <meshStandardMaterial
              color={isSelected ? '#60A5FA' : theme.trimColor}
              roughness={0.4}
            />
          </mesh>
          {/* Column Capital / Stepped Top Trim */}
          <mesh position={[0, colHeight / 2 - 0.05, 0]}>
            <boxGeometry args={[colThickness + 0.1, 0.15, colThickness + 0.1]} />
            <meshStandardMaterial color={theme.roofColor} roughness={0.3} />
          </mesh>
        </group>
      ))}

      {/* Roof Slab with Cornice Overhang (Reference Style) */}
      <group position={[0, height + 0.2, 0]}>
        {/* Main crisp white cornice slab */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[width + 0.45, 0.2, depth + 0.45]} />
          <meshStandardMaterial color={theme.roofColor} roughness={0.3} />
        </mesh>
        {/* Upper parapet rim */}
        <mesh position={[0, 0.15, 0]}>
          <boxGeometry args={[width + 0.25, 0.12, depth + 0.25]} />
          <meshStandardMaterial color="#CBD5E1" roughness={0.4} />
        </mesh>
        {/* Rooftop mechanical / stair penthouse */}
        <mesh position={[0, 0.35, 0]}>
          <boxGeometry args={[width * 0.4, 0.3, depth * 0.4]} />
          <meshStandardMaterial color="#64748B" roughness={0.6} />
        </mesh>
      </group>

      {/* Floor Divider Ledges */}
      {Array.from({ length: floorCount - 1 }).map((_, fIdx) => (
        <mesh
          key={`trim-${fIdx}`}
          position={[0, floorHeight * (fIdx + 1) + 0.1, depth / 2 + 0.02]}
        >
          <boxGeometry args={[width - colThickness, 0.08, 0.06]} />
          <meshStandardMaterial color={theme.trimColor} roughness={0.4} />
        </mesh>
      ))}

      {/* Front Windows (Per floor & column) */}
      {Array.from({ length: floorCount }).map((_, fIdx) => {
        const floorY = floorHeight * fIdx + floorHeight / 2 + 0.1;
        const isGroundFloor = fIdx === 0;

        return (
          <group key={`floor-win-${fIdx}`}>
            {/* Left window */}
            <WindowComponent
              position={[-windowSpacingX * 0.65, floorY, depth / 2 + 0.03]}
              width={width > 3 ? 0.65 : 0.45}
              height={floorHeight * 0.55}
              theme={theme}
            />
            {/* Right window */}
            <WindowComponent
              position={[windowSpacingX * 0.65, floorY, depth / 2 + 0.03]}
              width={width > 3 ? 0.65 : 0.45}
              height={floorHeight * 0.55}
              theme={theme}
            />
            {/* Center window on upper floors */}
            {!isGroundFloor && width >= 2.5 && (
              <WindowComponent
                position={[0, floorY, depth / 2 + 0.03]}
                width={0.55}
                height={floorHeight * 0.55}
                theme={theme}
              />
            )}
          </group>
        );
      })}

      {/* Side Windows (Left & Right walls) */}
      {Array.from({ length: floorCount }).map((_, fIdx) => {
        const floorY = floorHeight * fIdx + floorHeight / 2 + 0.1;
        return (
          <group key={`side-win-${fIdx}`}>
            {/* Left Wall Window */}
            <group position={[-width / 2 - 0.03, floorY, 0]} rotation={[0, -Math.PI / 2, 0]}>
              <WindowComponent
                position={[0, 0, 0]}
                width={depth * 0.4}
                height={floorHeight * 0.55}
                theme={theme}
              />
            </group>
            {/* Right Wall Window */}
            <group position={[width / 2 + 0.03, floorY, 0]} rotation={[0, Math.PI / 2, 0]}>
              <WindowComponent
                position={[0, 0, 0]}
                width={depth * 0.4}
                height={floorHeight * 0.55}
                theme={theme}
              />
            </group>
          </group>
        );
      })}

      {/* Ground Floor Entrance Door & Awning */}
      <group position={[0, 0.4, depth / 2 + 0.02]}>
        {/* Double Entrance Glass Door */}
        <mesh position={[0, 0.15, 0]}>
          <boxGeometry args={[width * 0.35, 0.7, 0.05]} />
          <meshStandardMaterial color="#0284C7" roughness={0.1} metalness={0.4} />
        </mesh>
        <mesh position={[0, 0.15, 0.01]}>
          <boxGeometry args={[width * 0.38, 0.76, 0.02]} />
          <meshStandardMaterial color={theme.trimColor} roughness={0.5} />
        </mesh>
      </group>

      {/* Optional Striped Awning above entrance (as in reference image) */}
      {theme.awning && (
        <Awning
          width={width * 0.55}
          position={[0, 0.95, depth / 2 + 0.05]}
        />
      )}

      {/* Floating Modern Information Label */}
      <Html
        position={[0, height + 1.1, 0]}
        center
        distanceFactor={18}
        className="pointer-events-none select-none"
      >
        <div
          className={`px-3 py-1.5 rounded-xl backdrop-blur-md text-center transition-all duration-300 shadow-xl ${
            isSelected
              ? 'bg-indigo-600 text-white font-bold ring-2 ring-indigo-400 scale-110 shadow-indigo-500/50'
              : isHovered
              ? 'bg-slate-900/95 text-cyan-300 font-semibold ring-1 ring-cyan-500/50 scale-105'
              : 'bg-[#080A09]/90 text-slate-200 border border-slate-700/80'
          }`}
        >
          <div className="text-xs whitespace-nowrap font-bold flex items-center justify-center gap-1.5">
            <span>{building.icon}</span>
            <span>{building.shortName}</span>
          </div>
          <div className="text-[10px] text-cyan-400 font-mono font-semibold mt-0.5">
            {building.floors.length} {building.floors.length === 1 ? 'Floor' : 'Floors'}
          </div>
        </div>
      </Html>
    </group>
  );
}

// Smooth camera movement toward selected building
function CameraRig({ selectedBuilding }) {
  useFrame((state) => {
    if (selectedBuilding) {
      const [bx, by, bz] = selectedBuilding.position;
      const targetPos = new THREE.Vector3(bx + 4.5, 7.5, bz + 8);
      state.camera.position.lerp(targetPos, 0.05);
      state.camera.lookAt(bx, 1.2, bz);
    }
  });
  return null;
}

export default function CampusScene({
  selectedBuilding,
  onSelectBuilding,
}) {
  const [hoveredId, setHoveredId] = useState(null);

  return (
    <div className="w-full h-full relative cursor-grab active:cursor-grabbing bg-[#0F172A]">
      {/* 3D Static Geometry vs Dynamic Telemetry Badge (stacked cleanly above the Legend overlay) */}
      <div className="absolute bottom-16 left-4 z-10 pointer-events-none bg-[#121614]/90 backdrop-blur-md border border-[#1F2420] rounded-xl px-3 py-1.5 text-[11px] text-slate-300 flex items-center gap-2 shadow-lg max-w-md">
        <span className="w-2 h-2 rounded-full bg-[#B8F36B] animate-pulse shrink-0 shadow-[0_0_8px_rgba(184,243,107,0.6)]" />
        <span>
          <strong className="text-white">3D Digital Twin:</strong> Building geometries represent static architectural models; venue occupancy is synchronized live via backend API (<code className="text-[#B8F36B] font-mono">/rooms/&#123;id&#125;/availability</code>).
        </span>
      </div>

      <Canvas
        shadows
        camera={{ position: [10, 14, 16], fov: 40 }}
        className="w-full h-full"
      >
        <color attach="background" args={['#0F172A']} />
        
        {/* Soft atmospheric distance fog that doesn't obscure buildings */}
        <fog attach="fog" args={['#0F172A', 25, 60]} />

        {/* Crisp Architectural Studio Lighting for high visibility */}
        {/* Warm Sun / Key Light */}
        <directionalLight
          position={[18, 28, 14]}
          intensity={2.2}
          color="#FFF8EE"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-bias={-0.0001}
        />

        {/* Cool Sky Fill Light to illuminate shadowed building walls */}
        <ambientLight intensity={1.2} color="#E0F2FE" />

        {/* Opposite Rim Light for architectural edge definition */}
        <directionalLight
          position={[-18, 15, -14]}
          intensity={0.9}
          color="#BAE6FD"
        />

        {/* Soft Central Warmth */}
        <pointLight position={[0, 8, 0]} intensity={0.5} color="#FDE68A" />

        {/* Ground with Promenades, Boulevards, and Quad */}
        <CampusGround />

        {/* Stylized Low-Poly Campus Trees */}
        {CAMPUS_TREES.map((t, idx) => (
          <StylizedTree key={idx} position={t.position} />
        ))}

        {/* Architectural Low-Poly 3D Buildings */}
        {CAMPUS_BUILDINGS.map((b) => (
          <StylizedBuilding
            key={b.id}
            building={b}
            isSelected={selectedBuilding?.id === b.id}
            isHovered={hoveredId === b.id}
            onSelect={onSelectBuilding}
            onHover={setHoveredId}
          />
        ))}

        {/* Camera interpolation */}
        <CameraRig selectedBuilding={selectedBuilding} />

        {/* Orbit Controls */}
        <OrbitControls
          enableDamping
          dampingFactor={0.06}
          maxPolarAngle={Math.PI / 2.15}
          minDistance={5}
          maxDistance={35}
        />
      </Canvas>
    </div>
  );
}
