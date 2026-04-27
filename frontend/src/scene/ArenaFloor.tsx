// Single huge ground covering hub + zones — deep purple-black to push the
// neon-night vibe. Per-zone discs sit on top.
export function ArenaFloor() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <circleGeometry args={[160, 96]} />
        <meshStandardMaterial color="#1a1226" roughness={1} metalness={0.05} />
      </mesh>

      {/* Subtle ring suggesting the district perimeter */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.012, 0]}>
        <ringGeometry args={[20, 26, 96]} />
        <meshStandardMaterial color="#2a1a3e" roughness={1} />
      </mesh>

      {/* Faint magenta neon accent ring far out */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]}>
        <ringGeometry args={[34, 34.18, 128]} />
        <meshBasicMaterial color="#ff44dd" transparent opacity={0.45} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]}>
        <ringGeometry args={[36, 36.16, 128]} />
        <meshBasicMaterial color="#44ddff" transparent opacity={0.35} />
      </mesh>
    </group>
  )
}
