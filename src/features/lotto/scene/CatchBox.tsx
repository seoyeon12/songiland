export type CatchBoxProps = {
  accent: string;
  accentEmissive: string;
};

const HW = 0.58; // half width
const H = 0.6; // wall height
const TH = 0.05; // panel thickness
const Y_OFFSET = -0.45; // sink the box so the ball nestles inside

// Five glass panels (floor + four walls) forming an open-top box.
const PANELS: { pos: [number, number, number]; size: [number, number, number] }[] =
  [
    { pos: [0, 0, 0], size: [HW * 2, TH, HW * 2] },
    { pos: [0, H / 2, HW], size: [HW * 2, H, TH] },
    { pos: [0, H / 2, -HW], size: [HW * 2, H, TH] },
    { pos: [HW, H / 2, 0], size: [TH, H, HW * 2] },
    { pos: [-HW, H / 2, 0], size: [TH, H, HW * 2] },
  ];

// Four neon bars along the open top rim.
const RIM: { pos: [number, number, number]; size: [number, number, number] }[] = [
  { pos: [0, H, HW], size: [HW * 2 + TH, TH, TH] },
  { pos: [0, H, -HW], size: [HW * 2 + TH, TH, TH] },
  { pos: [HW, H, 0], size: [TH, TH, HW * 2 + TH] },
  { pos: [-HW, H, 0], size: [TH, TH, HW * 2 + TH] },
];

/** A neon-rimmed glass box that catches the drawn ball at the slide end. */
export function CatchBox({ accent, accentEmissive }: CatchBoxProps) {
  return (
    <group position={[0, Y_OFFSET, 0]}>
      {PANELS.map((panel, i) => (
        <mesh key={`panel-${i}`} position={panel.pos}>
          <boxGeometry args={panel.size} />
          <meshPhysicalMaterial
            color="#dbeafe"
            transparent
            opacity={0.22}
            transmission={0.85}
            roughness={0.12}
            thickness={0.3}
          />
        </mesh>
      ))}
      {RIM.map((bar, i) => (
        <mesh key={`rim-${i}`} position={bar.pos}>
          <boxGeometry args={bar.size} />
          <meshStandardMaterial
            color={accent}
            emissive={accentEmissive}
            emissiveIntensity={0.7}
            roughness={0.35}
            metalness={0.2}
          />
        </mesh>
      ))}
    </group>
  );
}
