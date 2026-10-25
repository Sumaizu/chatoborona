import { cells } from './classes.js';
import { ASCEND_AT, ASSIST_COINS, KILL_COINS, OUTCOMES, PRICE, RARITIES, UPGRADE_PRICE } from './gacha.js';
import { BIOME_RULES, ELITE_ODDS, LEVEL_MAX, LIVES, MIGHT, REWARD, TERRAIN } from './balance.js';
import { coinUrl, commandUrl, effectUrl, heartUrl, heroUrl, mobUrl, prizeUrl } from './sprites.js';

const bold = (text) => ({ text, bold: true });
const tint = (text, color) => ({ text, color });
const share = (id) => Math.round(OUTCOMES.find((outcome) => outcome.id === id).chance * 100) + '%';
const rarities = () => RARITIES.flatMap((rarity, i) => [i ? ', ' : '', tint(rarity.name.toLowerCase(), rarity.color)]);

export const PAGES = [
  {
    id: 'how',
    title: 'Как играть',
    time: 28,
    points: () => [
      [heroUrl('hunter'), ['Напиши в чат ', bold('что угодно'), ' — и ты в отряде: у тебя свой защитник на карте, '
        + 'класс выпадает случайно.']],
      [heroUrl('gunner'), ['Защитник бьёт мобов ', bold('сам'), ' — команды для атаки не нужны. Мобы идут по дороге '
        + 'к сердцу, у него ' + LIVES + ' жизней.']],
      [coinUrl(), ['За мобов — монеты: ', bold('гача'), ' — оружие за ' + PRICE + ' монет, ', bold('улучшить'),
        ' — оружие сильнее.']],
      [mobUrl('zombie'), ['Волны бесконечные и всё сильнее. Цель — ', bold('новый рекорд канала'), '. Что делать '
        + 'дальше, игра подскажет по ходу.']],
    ],
  },
  {
    id: 'map',
    title: 'Карта',
    time: 28,
    points: () => [
      [heartUrl(), ['Мобы выходят из ', bold('двух тоннелей'), ' в горах. Посередине дороги сливаются и дальше идут '
        + 'к сердцу вместе.']],
      [heroUrl('sniper'), [bold('Горы'), ' и ', bold('руины'), ' закрывают выстрел: за ними и в тоннеле моба не '
        + 'достать. С ', bold('холма'), ' бьют на ' + cells(TERRAIN.hill) + ' дальше. На горы, руины, в озёра, реки '
        + 'и расщелины не встать.']],
      [heroUrl('frost'), ['Местность каждый раз случайная. ', bold(BIOME_RULES.grass.name), ' — обычная, ',
        bold(BIOME_RULES.volcano.name), ' — лёд слабее, ', bold(BIOME_RULES.snow.name), ' — огонь слабее, зато на '
        + 'лёд озёр и рек можно встать.']],
      [mobUrl('bat'), [bold(BIOME_RULES.swamp.name), ' — ходячие мобы медленнее, но их больше. ',
        bold(BIOME_RULES.desert.name), ' — летучие быстрее, и их тоже больше.']],
      [mobUrl('skeleton'), [bold(BIOME_RULES.graveyard.name), ' — павшие мобы с телом встают скелетами. Вместо '
        + 'воды — чёрные пруды, вместо гор — костяные.']],
    ],
  },
  { id: 'squad', title: 'Отряд', time: 18 },
  { id: 'classes', title: 'Классы', time: 22 },
  {
    id: 'coins',
    title: 'Монеты и гача',
    time: 28,
    points: () => [
      [coinUrl(), ['За убийство моба — ' + KILL_COINS + ' монеты, за помощь — ' + ASSIST_COINS + '. За каждую '
        + 'волну — ещё монеты, опыт и +' + Math.round(REWARD.income * 100) + '% к твоим монетам.']],
      [prizeUrl('weapon', RARITIES[RARITIES.length - 1].color), [bold('гача'), ' — крутка за ' + PRICE
        + ' монет: оружие под твой класс (', bold('гача 3'), ' — три, ', bold('гача все'), ' — на все монеты, '
        + 'до пяти за раз). Редкость видна по цвету: ']
        .concat(rarities(), ['. Чем реже, тем больше ', bold('мощь'), ', у легендарного — ещё и особое свойство.'])],
      [prizeUrl('chest', '#ffb020'), ['А может выпасть ', tint('пустота', '#9ca3af'), ' (' + share('void') + '), '
        + 'монеты: ', tint('горстка', '#facc15'), ' — до 50, ', tint('мешок', '#e8a33d'), ' — до 150, ',
        tint('сундук', '#ffb020'), ' — до 500, или редкая ', tint('руна способности', '#ff2e4d'), '.']],
      [prizeUrl('rune', '#ff2e4d'), ['У каждого класса две руны, их можно собрать обе. Оружие лучше твоего '
        + 'надевается само. Монеты, оружие и руны — на одну игру, уровни остаются.']],
      [commandUrl('upgrade'), [bold('улучшить'), ' — за ' + UPGRADE_PRICE + ' монет +' + MIGHT.upgrade
        + ' мощи оружию; ', bold('улучшить 5'), ' — пять раз, ', bold('улучшить все'), ' — на все монеты. Легендарное '
        + 'на +' + ASCEND_AT + ' становится божественным.']],
    ],
  },
  {
    id: 'levels',
    title: 'Уровни и роли',
    time: 28,
    points: () => [
      [effectUrl('buff', 'study'), ['Опыт — за каждого моба, которого ты помог убить: ударил, поджёг, замедлил или '
        + 'усилил того, кто ударил. Добил сам — убийство, нет — помощь.']],
      [heroUrl('earth'), ['Уровни копятся от игры к игре, до ' + LEVEL_MAX + '-го. Сила от уровня не растёт: '
        + 'её прибавляют мощь оружия и руны.']],
      [effectUrl('buff', 'fury'), ['На ', bold('10-м'), ', ', bold('30-м'), ' и ', bold('50-м'), ' уровне '
        + 'открываются три способности класса.']],
      [heroUrl('frost'), [bold('Мощь'), ' — во сколько раз сильнее ты бьёшь и обычными ударами, и способностями: '
        + 'мощь 150 — в полтора раза сильнее, чем без оружия. Скорость, дальность и крит у каждого класса свои.']],
      [commandUrl('card'), [bold('профиль'), ' — твоя карточка: класс, приёмы, оружие, клетка и радиус, ',
        bold('проф'), ' — короче. На поле твой ник мигает красным и видно, куда ты достаёшь.']],
    ],
  },
  {
    id: 'foes',
    title: 'Враги',
    time: 28,
    points: () => [
      [mobUrl('bat'), ['Каждая волна — один вид: нежить, звери, орда, слизни, демоны или стихии; какой следующий, '
        + 'видно вверху. С каждым десятком волн мобы закаляются. Летучих не держат стены, мины и лужи.']],
      [mobUrl('witch'), ['С ' + ELITE_ODDS.from + '-й волны выходят ', tint('золотые элитные', '#facc15'), ' со своим '
        + 'навыком, а любой моб может выйти ', tint('серебряным', '#e2e8f0'), ' — крепче и со свойством. Каждая 10-я '
        + 'волна — босс.']],
      [mobUrl('skeleton'), ['Скелеты встают после смерти, и яд их не берёт. Элементалей не берёт своя стихия, '
        + 'слизни при смерти делятся.']],
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
