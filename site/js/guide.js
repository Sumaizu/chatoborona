import { LIVES } from './balance.js';
import { coinIconUrl, heartIconUrl, heroUrl, mobUrl } from './sprites.js';

const bold = (text) => ({ text, bold: true });

export const PAGES = [
  {
    id: 'how',
    title: 'Как играть',
    time: 45,
    points: () => [
      [heroUrl('hunter', 80), ['Напиши в чат ', bold('что угодно'), ' — и ты в отряде: у тебя свой защитник на карте, '
        + 'класс выпадает случайно.']],
      [heroUrl('gunner', 80), ['Защитник бьёт мобов ', bold('сам'), '. Хочешь на другую клетку — напиши её, например ',
        bold('к7'), '.']],
      [heartIconUrl(), ['Мобы идут по дороге к сердцу, у него ' + LIVES + ' жизней.']],
      [coinIconUrl(), ['За мобов — монеты: ', bold('гача'), ' — оружие, ', bold('улучшить'), ' — оружие сильнее.']],
      [mobUrl('zombie'), ['Волны бесконечные и всё сильнее. Цель — ', bold('новый рекорд канала'), '.']],
    ],
  },
  { id: 'classes', title: 'Классы', time: 45 },
];

export function pageAt(seconds) {
  const cycle = PAGES.reduce((sum, page) => sum + page.time, 0);
  let left = ((seconds % cycle) + cycle) % cycle;
  for (const page of PAGES) {
    if (left < page.time) return { page, part: left / page.time };
    left -= page.time;
  }
  return { page: PAGES[0], part: 0 };
}
