import type { ReactNode } from 'react';
import { getBreed, getCoat, type Coat, type Look, type Mood, type Size, type Stage } from '../engine';
import { isDark, mix } from './color';

export type DogPortraitProps = {
  breedId: string;
  coatId: string;
  look: Look;
  stage: Stage;
  mood: Mood;
  /** 화면 낭독기용 설명. */
  label: string;
  className?: string;
};

const SCALE: Record<Size, number> = { toy: 0.72, small: 0.82, medium: 0.92, large: 1 };

const INK = '#2b2724';
const TONGUE = '#f08a8a';
const EAR_INNER = '#f2b8b0';
const OUTLINE = 'rgba(28, 27, 25, 0.14)';

type Palette = { main: string; light: string; accent: string; muzzle: string; chest: string };

function paletteFor(coat: Coat): Palette {
  const accent = coat.accent ?? mix(coat.main, '#ffffff', 0.45);
  const light = mix(coat.main, '#ffffff', 0.35);
  const usesAccentFace = coat.pattern === 'chest' || coat.pattern === 'tan-points';
  return {
    main: coat.main,
    light,
    accent,
    muzzle: usesAccentFace ? accent : light,
    chest: coat.pattern === 'chest' ? accent : light,
  };
}

/** 털 모양에 따라 머리와 몸 테두리에 붙는 털 뭉치. */
function Fluff({ look, color }: { look: Look; color: string }) {
  if (look.coatType === 'curly') {
    const head = Array.from({ length: 12 }, (_, i) => {
      const angle = (i / 12) * Math.PI * 2;
      return [100 + Math.cos(angle) * 40, 86 + Math.sin(angle) * 38] as const;
    });
    const body = [
      [58, 150],
      [64, 172],
      [142, 150],
      [136, 172],
      [100, 116],
    ] as const;
    return (
      <g fill={color} stroke={OUTLINE} strokeWidth={1.2}>
        {[...head, ...body].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={13} />
        ))}
      </g>
    );
  }
  if (look.coatType === 'long') {
    return (
      <g fill={color}>
        {[
          [66, 108],
          [74, 120],
          [126, 120],
          [134, 108],
          [86, 128],
          [114, 128],
        ].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={11} />
        ))}
      </g>
    );
  }
  return null;
}

function Ears({ look, color, inner }: { look: Look; color: string; inner: string }) {
  const long = look.coatType === 'long' || look.coatType === 'curly';
  if (look.ears === 'erect') {
    return (
      <g stroke={OUTLINE} strokeWidth={1.2} strokeLinejoin="round">
        <path d="M64 74 L68 28 L96 54 Z" fill={color} />
        <path d="M136 74 L132 28 L104 54 Z" fill={color} />
        <path d="M70 66 L72 40 L88 55 Z" fill={inner} stroke="none" />
        <path d="M130 66 L128 40 L112 55 Z" fill={inner} stroke="none" />
      </g>
    );
  }
  if (look.ears === 'folded') {
    return (
      <g fill={color} stroke={OUTLINE} strokeWidth={1.2} strokeLinejoin="round">
        <path d="M62 70 L70 38 L96 54 Q84 66 74 70 Z" />
        <path d="M138 70 L130 38 L104 54 Q116 66 126 70 Z" />
      </g>
    );
  }
  const ry = long ? 30 : 24;
  return (
    <g fill={color} stroke={OUTLINE} strokeWidth={1.2}>
      <ellipse cx={60} cy={96} rx={13} ry={ry} transform="rotate(14 60 96)" />
      <ellipse cx={140} cy={96} rx={13} ry={ry} transform="rotate(-14 140 96)" />
    </g>
  );
}

function Tail({ look, color }: { look: Look; color: string }) {
  if (look.tail === 'curled') {
    return (
      <path
        d="M140 156 C170 152 172 118 150 116 C136 115 138 134 150 132"
        fill="none"
        stroke={color}
        strokeWidth={13}
        strokeLinecap="round"
      />
    );
  }
  if (look.tail === 'straight') {
    return (
      <path
        d="M140 164 Q166 150 176 120"
        fill="none"
        stroke={color}
        strokeWidth={11}
        strokeLinecap="round"
      />
    );
  }
  return <ellipse cx={148} cy={162} rx={9} ry={7} fill={color} />;
}

function Face({
  mood,
  stage,
  muzzle,
  fur,
}: {
  mood: Mood;
  stage: Stage;
  muzzle: string;
  fur: string;
}) {
  const gray = stage === 'elderly' ? 0.75 : stage === 'senior' ? 0.4 : 0;
  const sad = mood === 'low';
  let mouth: ReactNode;
  if (mood === 'great') {
    mouth = (
      <g>
        <path d="M90 104 Q100 118 110 104 Z" fill={INK} />
        <ellipse cx={100} cy={112} rx={5} ry={4} fill={TONGUE} />
      </g>
    );
  } else if (mood === 'good') {
    mouth = <path d="M91 104 Q100 112 109 104" fill="none" stroke={INK} strokeWidth={2.4} strokeLinecap="round" />;
  } else if (mood === 'okay') {
    mouth = <path d="M93 107 L107 107" fill="none" stroke={INK} strokeWidth={2.4} strokeLinecap="round" />;
  } else {
    mouth = <path d="M92 110 Q100 104 108 110" fill="none" stroke={INK} strokeWidth={2.4} strokeLinecap="round" />;
  }
  return (
    <g>
      <ellipse cx={100} cy={102} rx={21} ry={16} fill={muzzle} />
      {gray > 0 && <ellipse cx={100} cy={102} rx={21} ry={16} fill="#ece8e1" opacity={gray} />}
      {isDark(fur) && (
        <g fill={mix(fur, '#ffffff', 0.28)}>
          <circle cx={84} cy={84} r={7.5} />
          <circle cx={116} cy={84} r={7.5} />
        </g>
      )}
      <circle cx={84} cy={84} r={4.6} fill={INK} />
      <circle cx={116} cy={84} r={4.6} fill={INK} />
      <circle cx={82.6} cy={82.4} r={1.5} fill="#ffffff" />
      <circle cx={114.6} cy={82.4} r={1.5} fill="#ffffff" />
      {(sad || gray > 0) && (
        <g stroke={gray > 0 ? '#d8d3ca' : INK} strokeWidth={2.2} strokeLinecap="round">
          <path d={sad ? 'M78 77 L89 72' : 'M78 75 L89 75'} />
          <path d={sad ? 'M122 77 L111 72' : 'M122 75 L111 75'} />
        </g>
      )}
      <ellipse cx={100} cy={95} rx={6.5} ry={4.8} fill={INK} />
      {mouth}
    </g>
  );
}

function Pattern({ coat, palette }: { coat: Coat; palette: Palette }) {
  switch (coat.pattern) {
    case 'spots':
      return (
        <g fill={palette.accent}>
          <circle cx={80} cy={146} r={9} />
          <circle cx={122} cy={164} r={7} />
          <circle cx={114} cy={64} r={9} />
        </g>
      );
    case 'patch':
      return <ellipse cx={84} cy={82} rx={13} ry={11} fill={palette.accent} />;
    case 'tan-points':
      return (
        <g fill={palette.accent}>
          <circle cx={84} cy={74} r={4} />
          <circle cx={116} cy={74} r={4} />
        </g>
      );
    case 'chest':
      return <path d="M100 52 L94 80 L106 80 Z" fill={palette.accent} opacity={0.9} />;
    case 'saddle':
      return (
        <g fill={palette.accent}>
          <ellipse cx={66} cy={146} rx={12} ry={22} />
          <ellipse cx={134} cy={146} rx={12} ry={22} />
        </g>
      );
    default:
      return null;
  }
}

/**
 * 견종 정보로 그리는 강아지 한 마리(정면, 앉은 자세). 외부 그림을 쓰지 않는 자체 SVG다.
 * 체급·귀·털·털색·무늬·꼬리·다리를 견종대로, 노년에는 주둥이가 하얗게, 표정은 행복도대로 바뀐다.
 */
export function DogPortrait({ breedId, coatId, look, stage, mood, label, className }: DogPortraitProps) {
  const breed = getBreed(breedId);
  const coat = getCoat(breed, coatId);
  const palette = paletteFor(coat);
  const scale = SCALE[breed.size] * (stage === 'puppy' ? 0.86 : 1);
  const legTop = look.legs === 'short' ? 172 : 156;
  const earColor = coat.pattern === 'patch' ? palette.accent : palette.main;
  const pawColor = coat.pattern === 'tan-points' ? palette.accent : palette.light;

  return (
    <svg
      className={className}
      viewBox="0 0 200 200"
      role="img"
      aria-label={label}
      xmlns="http://www.w3.org/2000/svg"
    >
      <ellipse cx={100} cy={192} rx={58} ry={6} fill="rgba(28, 27, 25, 0.08)" />
      <g transform={`translate(100 190) scale(${scale}) translate(-100 -190)`}>
        <Tail look={look} color={palette.main} />
        <ellipse cx={100} cy={152} rx={46} ry={38} fill={palette.main} stroke={OUTLINE} strokeWidth={1.2} />
        <ellipse cx={100} cy={150} rx={22} ry={26} fill={palette.chest} />
        {coat.pattern === 'saddle' && <Pattern coat={coat} palette={palette} />}
        <rect x={78} y={legTop} width={16} height={190 - legTop} rx={8} fill={palette.main} />
        <rect x={106} y={legTop} width={16} height={190 - legTop} rx={8} fill={palette.main} />
        <ellipse cx={86} cy={188} rx={11} ry={6} fill={pawColor} />
        <ellipse cx={114} cy={188} rx={11} ry={6} fill={pawColor} />
        <Fluff look={look} color={palette.main} />
        <Ears look={look} color={earColor} inner={EAR_INNER} />
        <circle cx={100} cy={86} r={40} fill={palette.main} stroke={OUTLINE} strokeWidth={1.2} />
        {coat.pattern !== 'saddle' && <Pattern coat={coat} palette={palette} />}
        {look.coatType === 'wire' && (
          <g fill={palette.light}>
            <rect x={76} y={70} width={16} height={6} rx={3} />
            <rect x={108} y={70} width={16} height={6} rx={3} />
            <path d="M82 104 Q100 132 118 104 Z" />
          </g>
        )}
        <Face mood={mood} stage={stage} muzzle={palette.muzzle} fur={palette.main} />
      </g>
    </svg>
  );
}
