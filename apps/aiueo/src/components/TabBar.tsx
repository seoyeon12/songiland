import type { MouseEvent } from 'react';
import { routeUrl, type Tab } from '../app/router';

const TABS: ReadonlyArray<{ tab: Tab; label: string; icon: string }> = [
  { tab: 'chart', label: '문자표', icon: 'あ' },
  { tab: 'study', label: '학습', icon: '📖' },
  { tab: 'mine', label: '내 문자', icon: '★' },
];

export type TabBarProps = {
  current: Tab;
  /** 내 문자 탭 옆에 보여 줄 담은 문자 수. */
  mineCount: number;
  onSelect: (tab: Tab) => void;
};

/** 엄지가 닿는 하단 탭. 링크라서 새 탭으로 열기도 된다. */
export function TabBar({ current, mineCount, onSelect }: TabBarProps) {
  function onClick(event: MouseEvent<HTMLAnchorElement>, tab: Tab) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) {
      return;
    }
    event.preventDefault();
    onSelect(tab);
  }

  return (
    <nav className="tabbar" aria-label="화면">
      {TABS.map(({ tab, label, icon }) => (
        <a
          key={tab}
          href={routeUrl({ screen: tab })}
          className="tabbar__tab"
          aria-current={tab === current ? 'page' : undefined}
          // 숫자가 이름에 붙어 "내 문자2"로 읽히지 않게 이름을 따로 준다.
          aria-label={tab === 'mine' && mineCount > 0 ? `${label} ${mineCount}자` : undefined}
          onClick={(event) => onClick(event, tab)}
        >
          <span className="tabbar__icon" aria-hidden lang={tab === 'chart' ? 'ja' : undefined}>
            {icon}
          </span>
          <span className="tabbar__label">
            {label}
            {tab === 'mine' && mineCount > 0 && <span className="tabbar__count">{mineCount}</span>}
          </span>
        </a>
      ))}
    </nav>
  );
}
