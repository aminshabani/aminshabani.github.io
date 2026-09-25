#!/usr/bin/env python3
"""Render index.html in headless Chrome at several device widths, in light and
dark schemes, assert no horizontal overflow, and save full-page screenshots.

Usage: python3 tools/check.py [out_dir] [--widths 1440,400] [--themes light,dark]
Uses the DevTools protocol so narrow widths are real device emulation
(macOS Chrome clamps --window-size to 500px, which is not).
"""
import base64, json, os, subprocess, sys, time, urllib.request, tempfile, shutil, argparse
import websocket

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 9333

ap = argparse.ArgumentParser()
ap.add_argument("out", nargs="?", default=os.path.join(tempfile.gettempdir(), "site-check"))
ap.add_argument("--widths", default="1440,1024,400,360")
ap.add_argument("--themes", default="light,dark")
ap.add_argument("--page", default="index.html")
ap.add_argument("--reduced-motion", action="store_true")
args = ap.parse_args()
os.makedirs(args.out, exist_ok=True)

profile = tempfile.mkdtemp(prefix="chrome-check-")
proc = subprocess.Popen([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
                         f"--remote-debugging-port={PORT}", "--remote-allow-origins=*",
                         f"--user-data-dir={profile}", "about:blank"],
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    for _ in range(50):
        try:
            targets = json.load(urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json"))
            page = next(t for t in targets if t["type"] == "page")
            break
        except Exception:
            time.sleep(0.2)
    ws = websocket.create_connection(page["webSocketDebuggerUrl"], suppress_origin=True)
    mid = [0]

    def send(method, **params):
        mid[0] += 1
        ws.send(json.dumps({"id": mid[0], "method": method, "params": params}))
        while True:
            msg = json.loads(ws.recv())
            if msg.get("id") == mid[0]:
                if "error" in msg:
                    raise RuntimeError(msg["error"])
                return msg.get("result", {})

    def js(expr):
        r = send("Runtime.evaluate", expression=expr, returnByValue=True)
        return r["result"].get("value")

    send("Page.enable")
    failures = 0
    url = "file://" + os.path.join(ROOT, args.page)
    for theme in args.themes.split(","):
        for w in [int(x) for x in args.widths.split(",")]:
            send("Emulation.setDeviceMetricsOverride", width=w, height=900,
                 deviceScaleFactor=1, mobile=w < 800)
            feats = [{"name": "prefers-color-scheme", "value": theme}]
            if args.reduced_motion:
                feats.append({"name": "prefers-reduced-motion", "value": "reduce"})
            send("Emulation.setEmulatedMedia", features=feats)
            send("Page.navigate", url=url)
            time.sleep(2.5)  # fonts + reveal animations
            # Scroll-reveal is IntersectionObserver-driven; force it so full-page captures show every section.
            js("document.querySelectorAll('.reveal').forEach(e => e.classList.add('in'))")
            js("window.scrollTo(0, 0)"); time.sleep(0.8)
            sw, iw, bg = js("[document.documentElement.scrollWidth, innerWidth, getComputedStyle(document.body).backgroundColor]")
            wide = js("""(() => { const out=[]; document.querySelectorAll('body *').forEach(el => {
                const r = el.getBoundingClientRect();
                if (r.right > innerWidth + 1 && r.width > 0) out.push(el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : '') + ' right=' + Math.round(r.right));
            }); return out.slice(0, 8); })()""")
            ok = sw <= iw and not wide
            failures += 0 if ok else 1
            print(f"{theme:5s} {w:5d}px  scrollWidth={sw} innerWidth={iw} bg={bg} {'OK' if ok else 'OVERFLOW ' + str(wide)}")
            shot = send("Page.captureScreenshot", format="png", captureBeyondViewport=True)
            name = os.path.join(args.out, f"{os.path.splitext(os.path.basename(args.page))[0]}-{theme}-{w}.png")
            open(name, "wb").write(base64.b64decode(shot["data"]))
    ws.close()
    sys.exit(1 if failures else 0)
finally:
    proc.terminate()
    shutil.rmtree(profile, ignore_errors=True)
