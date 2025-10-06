'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Suspense } from 'react';
import * as THREE from 'three';

interface Wall {
  start: [number, number];
  end: [number, number];
}

interface Door {
  position: [number, number];
  type: string;
}

interface Room {
  name: string;
  center: [number, number];
}

interface Camera {
  type: string;
  position: [number, number, number];
  coverage_radius?: number;
  coverage_angle?: number;
  reasoning?: string;
}

interface FloorPlanData {
  walls: Wall[];
  doors: Door[];
  windows: Array<{ position: [number, number] }>;
  rooms?: Room[];
  height: number;
  cameras?: Camera[];
}

export default function FloorPlanViewer3D({
  floorPlanData,
  showCameras = false
}: {
  floorPlanData: FloorPlanData;
  showCameras?: boolean;
}) {
  // Scale down coordinates for better view (floor plans are often in pixels)
  const scale = 0.1;

  // Validate data before rendering
  if (!floorPlanData || typeof floorPlanData !== 'object') {
    return (
      <div className="w-full h-[600px] bg-gray-900 rounded-lg overflow-hidden border border-purple-600/30 flex items-center justify-center">
        <p className="text-white">No floor plan data available</p>
      </div>
    );
  }

  return (
    <div className="w-full h-[600px] bg-gray-900 rounded-lg overflow-hidden border border-purple-600/30">
      <Canvas
        camera={{ position: [30, 30, 30], fov: 50 }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={0.8} />
        <directionalLight position={[-10, -10, -5]} intensity={0.3} />

        {/* Simple floor plane instead of Grid */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[100, 100]} />
          <meshStandardMaterial color="#1F2937" />
        </mesh>

        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={10}
          maxDistance={100}
        />

        <Suspense fallback={null}>
          {/* Render walls */}
          {floorPlanData.walls && floorPlanData.walls.length > 0 ? (
            floorPlanData.walls.map((wall, index) => (
              <Wall3D
                key={`wall-${index}`}
                wall={wall}
                height={floorPlanData.height}
                scale={scale}
              />
            ))
          ) : (
            <group>
              {/* Demo walls if none detected */}
              <Wall3D wall={{ start: [0, 0], end: [50, 0] }} height={10} scale={1} />
              <Wall3D wall={{ start: [50, 0], end: [50, 40] }} height={10} scale={1} />
              <Wall3D wall={{ start: [50, 40], end: [0, 40] }} height={10} scale={1} />
              <Wall3D wall={{ start: [0, 40], end: [0, 0] }} height={10} scale={1} />
            </group>
          )}

          {/* Render doors */}
          {floorPlanData.doors && floorPlanData.doors.map((door, index) => (
            <Door3D key={`door-${index}`} door={door} scale={scale} />
          ))}

          {/* Render windows */}
          {floorPlanData.windows && floorPlanData.windows.map((window, index) => (
            <Window3D key={`window-${index}`} window={window} scale={scale} />
          ))}

          {/* Render room labels */}
          {floorPlanData.rooms && floorPlanData.rooms.map((room, index) => (
            <RoomLabel key={`room-${index}`} room={room} scale={scale} />
          ))}

          {/* Render cameras if enabled */}
          {showCameras && floorPlanData.cameras && floorPlanData.cameras.map((camera, index) => (
            <CameraMarker key={`camera-${index}`} camera={camera} scale={scale} />
          ))}
        </Suspense>
      </Canvas>
    </div>
  );
}

// Wall component - draws a 3D wall between two points
function Wall3D({ wall, height, scale }: { wall: Wall; height: number; scale: number }) {
  const [x1, y1] = wall.start.map(v => v * scale);
  const [x2, y2] = wall.end.map(v => v * scale);

  const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const centerX = (x1 + x2) / 2;
  const centerY = (y1 + y2) / 2;

  return (
    <mesh position={[centerX, height / 2, centerY]} rotation={[0, angle, 0]}>
      <boxGeometry args={[length, height, 0.3]} />
      <meshStandardMaterial color="#4B5563" />
    </mesh>
  );
}

// Door component - draws a door opening
function Door3D({ door, scale }: { door: Door; scale: number }) {
  const [x, y] = door.position.map(v => v * scale);

  return (
    <group position={[x, 0, y]}>
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[1, 2, 0.1]} />
        <meshStandardMaterial
          color={door.type === 'entry' ? '#92400E' : '#78350F'}
        />
      </mesh>
      {/* Door indicator - small sphere above door */}
      <mesh position={[0, 3, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color="#FCD34D" emissive="#FCD34D" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

// Window component - draws a window
function Window3D({ window, scale }: { window: { position: [number, number] }; scale: number }) {
  const [x, y] = window.position.map(v => v * scale);

  return (
    <mesh position={[x, 5, y]}>
      <boxGeometry args={[1, 1.5, 0.1]} />
      <meshStandardMaterial
        color="#60A5FA"
        transparent
        opacity={0.6}
      />
    </mesh>
  );
}

// Room label component - uses colored sphere marker instead of text
function RoomLabel({ room, scale }: { room: Room; scale: number }) {
  const [x, y] = room.center.map(v => v * scale);

  return (
    <mesh position={[x, 0.5, y]}>
      <sphereGeometry args={[0.5, 16, 16]} />
      <meshStandardMaterial color="#9333EA" emissive="#9333EA" emissiveIntensity={0.3} />
    </mesh>
  );
}

// Camera marker component with coverage cone
function CameraMarker({ camera, scale }: { camera: Camera; scale: number }) {
  const [x, y, z] = camera.position.map(v => v * scale);

  return (
    <group position={[x, z, y]}>
      {/* Camera body */}
      <mesh>
        <boxGeometry args={[0.5, 0.5, 0.8]} />
        <meshStandardMaterial color="#EF4444" emissive="#EF4444" emissiveIntensity={0.5} />
      </mesh>

      {/* Camera lens */}
      <mesh position={[0, 0, 0.5]}>
        <cylinderGeometry args={[0.2, 0.2, 0.2, 16]} />
        <meshStandardMaterial color="#1F2937" />
      </mesh>

      {/* Coverage cone (if radius provided) */}
      {camera.coverage_radius && (
        <mesh position={[0, -1, 2]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[camera.coverage_radius * scale * 0.3, camera.coverage_radius * scale * 0.5, 16, 1, true]} />
          <meshStandardMaterial
            color="#EF4444"
            transparent
            opacity={0.1}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Camera indicator sphere */}
      <mesh position={[0, 2, 0]}>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshStandardMaterial color="#EF4444" emissive="#EF4444" emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
}
