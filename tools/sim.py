import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from browser import NO_NETWORK, ROOT, Browser, serve


class Sim:
    def __enter__(self):
        self.server = serve(ROOT)
        self.browser = Browser()
        self.browser.run_in_every_page(NO_NETWORK)
        self.browser.navigate(f"http://127.0.0.1:{self.server.server_address[1]}/tools/sim.html")
        self.browser.wait_for("window.__simReady === true", 30)
        return self

    def __exit__(self, *error):
        self.browser.close()
        self.server.shutdown()
        self.server.server_close()

    def batch(self, **config):
        return self.browser.evaluate(f"window.sim.batch({json.dumps(config)})")

    def run(self, expression):
        return self.browser.evaluate(expression)


def calibrate(sim, sizes=(1, 3, 10, 30), levels=(1, 25, 50, 100), seeds=8, changes=None):
    print(f"{'игроков':>8} {'уровень':>8} {'волн':>10} {'минут':>7} {'опыт/ч':>8} {'+ур.':>6} {'мс':>6}")
    for size in sizes:
        for level in levels:
            r = sim.batch(seeds=list(range(1, seeds + 1)), levels=[level] * size, changes=changes)
            spread = f"{r['passedMin']:>2}-{r['passedMax']:<2}"
            print(f"{size:>8} {level:>8} {r['passed']:>5.1f} {spread} {r['minutes']:>7.1f} "
                  f"{r['xpPerHour']:>8.0f} {r['levelUp']:>6.1f} {r['ms']:>6.0f}")


if __name__ == "__main__":
    for stream in (sys.stdout, sys.stderr):
        stream.reconfigure(errors="replace", line_buffering=True)
    with Sim() as sim:
        calibrate(sim)
        for error in sim.browser.errors:
            print("ошибка на странице: " + error)
