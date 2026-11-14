/** 직접 그린 붕어빵 SVG 하나. 색만 바꿔 익힘 정도를 보여 준다(외부 그림 안 씀). 만화처럼 진한 테두리. */
export function BbangFish({ fill, className }: { fill: string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 80" role="img" aria-hidden="true">
      {/* 몸통 */}
      <path
        d="M70 12 C40 12 18 28 18 40 C18 52 40 68 70 68 C92 68 104 58 110 40 C104 22 92 12 70 12 Z"
        fill={fill}
        stroke="#3b2314"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      {/* 꼬리 */}
      <path d="M110 40 L118 27 L115 40 L118 53 Z" fill={fill} stroke="#3b2314" strokeWidth="4" strokeLinejoin="round" />
      {/* 등·배 지느러미 격자(붕어빵 무늬) */}
      <g stroke="rgba(59,35,20,0.35)" strokeWidth="3" fill="none" strokeLinecap="round">
        <path d="M44 24 L52 40 L44 56" />
        <path d="M60 22 L68 40 L60 58" />
        <path d="M76 24 L84 40 L76 56" />
      </g>
      {/* 눈 */}
      <circle cx="34" cy="34" r="4.5" fill="#3b2314" />
    </svg>
  );
}
