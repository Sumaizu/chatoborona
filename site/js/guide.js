import { CLASSES } from './classes.js';
import { ASSIST_COINS, KILL_COINS, OUTCOMES, PRICE, RARITIES, UPGRADE_PRICE, UPGRADE_SHARE } from './gacha.js';
import { ELITE_ODDS, LEVEL_MAX, LIVES, MOBS } from './balance.js';
import { coinUrl, commandUrl, effectUrl, heartUrl, heroUrl, mobUrl, prizeUrl } from './sprites.js';

const bold = (text) => ({ text, bold: true });
const tint = (text, color) => ({ text, color });
const role = (id) => ({ role: id });
const share = (id) => Math.round(OUTCOMES.find((outcome) => outcome.id === id).chance * 100) + '%';
const rarities = () => RARITIES.flatMap((rarity, i) => [i ? ', ' : '', tint(rarity.name.toLowerCase(), rarity.color)]);

export const PAGES = [
  {
    id: 'how',
    title: 'Как играть',
    time: 18,
    points: () => [
      [heroUrl('banner'), ['Напиши в чат ', bold('что угодно'), ' — и ты в отряде. Класс выпадает случайно и не '
        + 'повторяется, пока не разойдутся все ' + CLASSES.length + '.']],
      [heroUrl('gunner'), ['Потом появится карта с дорогой. Ты — защитник на клетке у дороги и бьёшь мобов ',
        bold('сам'), ': команды для атаки не нужны.']],
      [commandUrl('move'), ['Хочешь в другое место — напиши клетку: букву столбца и номер строки, например ',
        bold('к7'), '. Во время волны перебежишь, когда она кончится.']],
      [heartUrl(), ['Мобы идут от портала к сердцу. Дошедший отнимает жизни: обычный — ' + MOBS.normal.leak
        + ', крепкий — ' + MOBS.tough.leak + ', элитный — ' + MOBS.elite.leak + ', босс — ' + MOBS.boss.leak
        + '. У сердца ' + LIVES + ' жизней.']],
      [mobUrl('zombie'), ['Волны бесконечные, и каждая сильнее прошлой. Игра идёт, пока сердце не падёт. Цель — ',
        bold('новый рекорд канала'), '.']],
    ],
  },
  { id: 'squad', title: 'Отряд', time: 10 },
  { id: 'classes', title: 'Классы', time: 14 },
  {
    id: 'coins',
    title: 'Монеты и гача',
    time: 18,
    points: () => [
      [coinUrl(), ['За убийство моба — ' + KILL_COINS + ' монеты, за помощь — ' + ASSIST_COINS + '. За каждую '
        + 'пройденную волну всем ещё монеты и опыт.']],
      [prizeUrl('weapon', RARITIES[RARITIES.length - 1].color), [bold('гача'), ' — крутка за ' + PRICE
        + ' монет: оружие под твой класс. Редкость видна по цвету: '].concat(rarities(),
        ['. Чем реже, тем больше плюсов, у легендарного ещё и особое свойство.'])],
      [prizeUrl('coins', '#facc15'), ['А может выпасть ', tint('пустота', '#9ca3af'), ' (' + share('void') + ') или ',
        tint('удвоение', '#facc15'), ' (' + share('coins') + '): потраченные ' + PRICE + ' монет вернутся вдвое.']],
      [prizeUrl('weapon', RARITIES[1].color), ['Оружие не хуже твоего надевается само и действует до конца игры. '
        + 'Монеты и оружие — на одну игру, уровни остаются.']],
      [commandUrl('upgrade'), [bold('улучшить'), ' — за ' + UPGRADE_PRICE + ' монет +' + Math.round(UPGRADE_SHARE * 100)
        + '% к случайному свойству оружия. Улучшать можно сколько угодно.']],
    ],
  },
  {
    id: 'levels',
    title: 'Уровни и роли',
    time: 18,
    points: () => [
      [effectUrl('buff', 'study'), ['Опыт — за каждого моба, которого ты помог убить: ударил, поджёг, замедлил или '
        + 'усилил того, кто ударил. Добил сам — убийство, нет — помощь.']],
      [heroUrl('sage'), ['Уровни копятся от игры к игре, до ' + LEVEL_MAX + '-го. С уровнем растут урон, скорость '
        + 'атаки и главное умение класса.']],
      [effectUrl('buff', 'fury'), ['На ', bold('10-м'), ' и ', bold('50-м'), ' уровне открываются особые приёмы '
        + 'класса.']],
      [heroUrl('frost'), [role('damage'), ' убивает, ', role('control'), ' замедляет и держит, ', role('support'),
        ' усиливает соседей, лечит базу или даёт опыт. Сильнее всего отряд, где есть все три.']],
      [commandUrl('card'), [bold('профиль'), ' — твоя карточка: класс с точными числами, приёмы и оружие. '
        + 'На поле заодно виден радиус твоей атаки.']],
    ],
  },
  {
    id: 'foes',
    title: 'Враги',
    time: 18,
    points: () => [
      [mobUrl('bat'), ['С каждым десятком волн приходят новые мобы. Летучих не держат стены, мины, капканы и '
        + 'лужи.']],
      [mobUrl('witch'), ['С ' + ELITE_ODDS.from + '-й волны выходят элитные, бывает по нескольку, у каждого свой '
        + 'навык. Каждая 10-я волна — босс.']],
      [mobUrl('skeleton'), ['Скелеты встают после смерти. Насовсем их упокаивает только лекарь. Элементалей не '
        + 'берёт своя стихия, слизни при смерти делятся.']],
      [mobUrl('mimic'), [tint('Мимик', '#facc15'), ' — сундук на ножках. Убьёте — золото всем, кто бил, и двойные '
        + 'монеты в следующей волне.']],
      [effectUrl('buff', 'haste'), ['Перед волной может выпасть событие: бафф или дебафф на волну, благословение '
        + 'или проклятие до конца игры.']],
    ],
  },
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
