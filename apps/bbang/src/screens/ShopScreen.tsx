import { maxLevel, nextCost, UPGRADE_IDS, UPGRADES, type UpgradeId, type Wallet } from '../engine';

/** 상점: 포인트로 '내 가게' 업그레이드를 산다. 오늘의 장사(랭킹)에는 적용되지 않는다. */
export function ShopScreen({
  wallet,
  onBuy,
  onBack,
}: {
  wallet: Wallet;
  onBuy: (id: UpgradeId) => void;
  onBack: () => void;
}) {
  return (
    <div className="app">
      <main className="app__main">
        <section className="app__card shop" aria-labelledby="shop-title">
          <p className="app__subtitle">내 가게 키우기</p>
          <h1 id="shop-title" className="app__title">
            상점
          </h1>
          <p className="shop__points">
            보유 <strong>{wallet.points.toLocaleString('ko-KR')}P</strong>
          </p>
          <p className="shop__note">
            업그레이드는 <strong>내 가게</strong> 영업에만 적용돼요. 오늘의 장사(랭킹)는 모두 같은 기본
            가게로 겨뤄요.
          </p>

          <ul className="shop__list">
            {UPGRADE_IDS.map((id) => {
              const upgrade = UPGRADES[id];
              const level = wallet.upgrades[id];
              const max = maxLevel(id);
              const cost = nextCost(id, level);
              const affordable = cost !== null && wallet.points >= cost;
              return (
                <li key={id} className="shop__item">
                  <span className="shop__emoji" aria-hidden="true">
                    {upgrade.emoji}
                  </span>
                  <div className="shop__body">
                    <p className="shop__name">
                      {upgrade.label}{' '}
                      <span className="shop__level" aria-label={`${max}단계 중 ${level}단계`}>
                        {'●'.repeat(level)}
                        {'○'.repeat(max - level)}
                      </span>
                    </p>
                    <p className="shop__effect">지금: {upgrade.levels[level]}</p>
                    {cost !== null && <p className="shop__effect">다음: {upgrade.levels[level + 1]}</p>}
                  </div>
                  {cost === null ? (
                    <span className="shop__done">완료</span>
                  ) : (
                    <button
                      type="button"
                      className="btn btn--primary shop__buy"
                      disabled={!affordable}
                      onClick={() => onBuy(id)}
                      aria-label={`${upgrade.label} ${cost}P에 사기`}
                    >
                      {cost.toLocaleString('ko-KR')}P
                    </button>
                  )}
                </li>
              );
            })}
          </ul>

          <button type="button" className="btn btn--large shop__back" onClick={onBack}>
            돌아가기
          </button>
        </section>
      </main>
    </div>
  );
}
