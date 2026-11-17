import { BADGED, ICON_SOURCES, type IconName } from './icons';

/**
 * 게임 아이콘. 이모지처럼 글자 크기를 따라 커지고, 꾸밈용이라 화면 읽기 프로그램에는 숨긴다:
 * 뜻은 옆 글자나 부모의 aria-label이 전한다.
 */
export function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  return (
    <img
      src={ICON_SOURCES[name]}
      alt=""
      aria-hidden="true"
      draggable={false}
      width={144}
      height={144}
      className={`icon ${BADGED.has(name) ? 'icon--badge' : ''} ${className}`}
    />
  );
}
