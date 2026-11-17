import type { FillingId } from '../engine';
import cart from '../assets/icons/cart.png';
import coin from '../assets/icons/coin.png';
import custard from '../assets/icons/custard.png';
import ghost from '../assets/icons/ghost.png';
import heart from '../assets/icons/heart.png';
import moneyBag from '../assets/icons/money-bag.png';
import party from '../assets/icons/party.png';
import redBean from '../assets/icons/red-bean.png';
import sweetPotato from '../assets/icons/sweet-potato.png';
import trash from '../assets/icons/trash.png';

/** 게임 아이콘 이미지(Flaticon, 출처는 시작 화면 맨 아래). */
export const ICON_SOURCES = {
  cart,
  coin,
  custard,
  ghost,
  heart,
  'money-bag': moneyBag,
  party,
  'red-bean': redBean,
  'sweet-potato': sweetPotato,
  trash,
} as const;

export type IconName = keyof typeof ICON_SOURCES;

/** 선으로만 그린 아이콘. 색칠된 아이콘들 사이에서 튀지 않게 크림색 동그라미 배지에 담는다. */
export const BADGED: ReadonlySet<IconName> = new Set(['cart', 'ghost']);

export const FILLING_ICON: Record<FillingId, IconName> = {
  'red-bean': 'red-bean',
  custard: 'custard',
  'sweet-potato': 'sweet-potato',
};

