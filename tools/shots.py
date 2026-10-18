import argparse
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from browser import NO_NETWORK, ROOT, Browser, serve

DOCS = ROOT / "docs"
WIDTH, HEIGHT = 1920, 1080
USUAL = ["overlay", "lobby", "over", "page"]
PREPARE = {
    "lobby": """(() => {
      const api = window.chatoborona, game = api.game;
      api.start();
      const names = ['Ветерок', 'kotoboy', 'Mira_Lis', 'Тихоня', 'pixel_hunter', 'Сова', 'dr_Groove', 'Лёша_К',
        'Марго'];
      names.forEach((name, i) => {
        game.profiles.data.set(name.toLowerCase(), { name, xp: [3000, 400, 9000, 50, 1500, 14000, 0, 6000, 2200][i],
          kills: 10, assists: 20 });
        game.feed(name, 'привет', { login: name.toLowerCase() });
      });
      game.left = game.s.lobby - 9;
      return true;
    })()""",
    "battle": """(() => {
      const api = window.chatoborona, game = api.game;
      api.start();
      const names = ['Ветерок', 'kotoboy', 'Mira_Lis', 'Тихоня', 'pixel_hunter', 'Сова', 'dr_Groove', 'Лёша_К',
        'NightOwl77', 'Марго', 'bublik', 'Gera'];
      names.forEach((name, i) => {
        game.profiles.data.set(name.toLowerCase(), { name, xp: [3000, 400, 9000, 50, 1500, 14000, 0, 6000, 800,
          2200, 120, 20000][i], kills: 10, assists: 20 });
        game.feed(name, 'привет', { login: name.toLowerCase() });
      });
      game.next();
      game.step(0.1);
      game.next();
      game.step(0.1);
      for (let i = 0; i < 8; i++) {
        while (game.state === 'wave') game.step(0.05);
        game.next();
        game.step(0.1);
      }
      return game.wave;
    })()""",
    "boss": """(() => {
      const api = window.chatoborona, game = api.game;
      api.start();
      const names = ['Ветерок', 'kotoboy', 'Mira_Lis', 'Тихоня', 'pixel_hunter', 'Сова', 'dr_Groove', 'Лёша_К'];
      names.forEach((name, i) => {
        game.profiles.data.set(name.toLowerCase(), { name, xp: [9000, 4000, 12000, 3000, 6500, 14000, 2000, 8000][i],
          kills: 10, assists: 20 });
        game.feed(name, 'привет', { login: name.toLowerCase() });
      });
      game.next();
      game.step(0.1);
      game.next();
      game.step(0.1);
      for (let i = 0; i < 9; i++) {
        while (game.state === 'wave') game.step(0.05);
        game.next();
        game.step(0.1);
      }
      for (let i = 0; i < 2000 && !game.battle.mobs.some((m) => m.type === 'boss'); i++) game.step(0.05);
      for (let i = 0; i < 30; i++) game.step(0.05);
      game.members.get('сова').coins = 37;
      game.feed('Сова', 'профиль', { login: 'сова' });
      return game.wave;
    })()""",
    "showcase": """(() => {
      const api = window.chatoborona, game = api.game;
      api.start();
      const team = [['Ветерок', 'earth'], ['kotoboy', 'miner'], ['Mira_Lis', 'pyro'], ['Тихоня', 'frost'],
        ['pixel_hunter', 'alchemist'], ['Сова', 'parasite'], ['dr_Groove', 'earth'], ['Лёша_К', 'gunner'],
        ['NightOwl77', 'thunder'], ['Марго', 'miner']];
      team.forEach(([name, cls], i) => {
        game.profiles.data.set(name.toLowerCase(), { name, xp: 2500 + i * 900, kills: 10, assists: 20 });
        game.feed(name, 'привет', { login: name.toLowerCase() });
        game.members.get(name.toLowerCase()).cls = cls;
      });
      game.next();
      game.step(0.1);
      game.next();
      game.step(0.1);
      for (let i = 0; i < 11; i++) {
        while (game.state === 'wave') game.step(0.05);
        game.next();
        game.step(0.1);
      }
      return game.wave;
    })()""",
    "pause": """(() => {
      const api = window.chatoborona, game = api.game;
      api.start();
      const names = ['Ветерок', 'kotoboy', 'Mira_Lis', 'Тихоня', 'pixel_hunter', 'Сова', 'dr_Groove', 'Лёша_К'];
      names.forEach((name, i) => {
        game.profiles.data.set(name.toLowerCase(), { name, xp: [9000, 4000, 12000, 3000, 6500, 14000, 2000, 8000][i],
          kills: [420, 180, 610, 90, 300, 750, 40, 380][i], assists: [900, 640, 1200, 410, 800, 1500, 150, 700][i] });
        game.feed(name, 'привет', { login: name.toLowerCase() });
      });
      game.profiles.best = { waves: 38, at: 0, players: 12 };
      game.next();
      game.step(0.1);
      game.next();
      game.step(0.1);
      game.pause();
      return game.paused;
    })()""",
    "over": """(() => {
      const api = window.chatoborona, game = api.game;
      api.start();
      ['Ветерок', 'kotoboy', 'Mira_Lis', 'Тихоня', 'Сова', 'Марго'].forEach((name) =>
        game.feed(name, 'привет', { login: name.toLowerCase() }));
      game.next();
      for (let i = 0; i < 40 * 60 * 20 && game.state !== 'over'; i++) game.step(0.05);
      game.left = 12;
      return game.state;
    })()""",
}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default=str(DOCS))
    parser.add_argument("only", nargs="*")
    args = parser.parse_args()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    server = serve(ROOT / "site")
    base = f"http://127.0.0.1:{server.server_address[1]}/overlay.html?embed=1"
    try:
        with Browser(WIDTH, HEIGHT) as browser:
            browser.run_in_every_page(NO_NETWORK)
            wanted = args.only or USUAL
            for name in ["overlay"] + list(PREPARE):
                if name not in wanted:
                    continue
                browser.navigate(base)
                browser.wait_for("Boolean(window.chatoborona)", 20)
                if name in PREPARE:
                    browser.evaluate(PREPARE[name])
                time.sleep(16 if name == "showcase" else 9 if name == "battle" else 1.5)
                browser.screenshot(out / f"{name}.png")
                print("снято:", out / f"{name}.png")
            if "page" in wanted:
                browser.navigate(f"http://127.0.0.1:{server.server_address[1]}/index.html")
                browser.wait_for("(() => { const f = document.getElementById('game'); "
                                 "return Boolean(f && f.contentWindow && f.contentWindow.chatoborona); })()", 20)
                time.sleep(1.5)
                if "rules" in wanted:
                    browser.screenshot(out / "rules.png")
                    print("снято:", out / "rules.png")
                browser.evaluate("document.getElementById('rules').close()")
                time.sleep(0.3)
                browser.screenshot(out / "page.png")
                print("снято:", out / "page.png")
            if "settings" in wanted:
                browser.evaluate("document.getElementById('toggle-settings').click()")
                time.sleep(0.8)
                browser.screenshot(out / "settings.png")
                print("снято:", out / "settings.png")
            for error in browser.errors:
                print("ошибка на странице:", error)
    finally:
        server.shutdown()
        server.server_close()


if __name__ == "__main__":
    for stream in (sys.stdout, sys.stderr):
        stream.reconfigure(encoding="utf-8", errors="replace")
    main()
