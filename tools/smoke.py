#!/usr/bin/env python3
"""Behavioural smoke test of index.html in headless Chrome (DevTools protocol):
theme toggle, lightbox focus management, keyboard tabs, carousel autoplay,
skip link, nav toggle. Exit 1 on any failure."""
import json, os, subprocess, sys, time, urllib.request, tempfile, shutil
import websocket

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 9334
profile = tempfile.mkdtemp(prefix="chrome-smoke-")
proc = subprocess.Popen([CHROME, "--headless=new", "--disable-gpu", f"--remote-debugging-port={PORT}",
                         "--remote-allow-origins=*", f"--user-data-dir={profile}", "about:blank"],
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
fails = []
def check(name, cond, detail=""):
    print(("PASS " if cond else "FAIL ") + name + (f"  [{detail}]" if detail and not cond else ""))
    if not cond: fails.append(name)
try:
    for _ in range(50):
        try:
            page = next(t for t in json.load(urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json")) if t["type"] == "page"); break
        except Exception: time.sleep(0.2)
    ws = websocket.create_connection(page["webSocketDebuggerUrl"], suppress_origin=True)
    mid = [0]; exceptions = []
    def send(method, **params):
        mid[0] += 1; ws.send(json.dumps({"id": mid[0], "method": method, "params": params}))
        while True:
            m = json.loads(ws.recv())
            if m.get("method") == "Runtime.exceptionThrown":
                exceptions.append(m["params"]["exceptionDetails"].get("text", "exception"))
            if m.get("id") == mid[0]:
                if "error" in m: raise RuntimeError(m["error"])
                return m.get("result", {})
    def js(expr):
        r = send("Runtime.evaluate", expression=expr, returnByValue=True, awaitPromise=True)
        if "exceptionDetails" in r: raise RuntimeError(r["exceptionDetails"]["text"] + " :: " + expr[:80])
        return r["result"].get("value")
    def key(k, code=None):
        for t in ("keyDown", "keyUp"):
            send("Input.dispatchKeyEvent", type=t, key=k, code=code or k, windowsVirtualKeyCode={"Escape":27,"Tab":9,"ArrowRight":39,"ArrowLeft":37,"Home":36,"End":35}.get(k,0))

    send("Page.enable"); send("Runtime.enable")
    send("Emulation.setDeviceMetricsOverride", width=1280, height=900, deviceScaleFactor=1, mobile=False)
    url = "file://" + os.path.join(ROOT, "index.html")

    # --- light scheme, no reduced motion
    send("Emulation.setEmulatedMedia", features=[{"name": "prefers-color-scheme", "value": "light"}])
    send("Page.navigate", url=url); time.sleep(1.5)
    check("no uncaught exceptions on load", not exceptions, "; ".join(exceptions))
    check("skip link is first focusable", js("document.body.firstElementChild.classList.contains('skip-link')"))
    check("carousel autoplays (no reduced motion)", js("document.getElementById('carousel').dataset.autoplay") == "on")
    js("document.getElementById('carousel-toggle').click()")
    check("carousel pause button stops autoplay", js("document.getElementById('carousel').dataset.autoplay") == "off"
          and js("document.getElementById('carousel-toggle').getAttribute('aria-pressed')") == "true")

    # lightbox
    js("document.querySelector('.pub-thumb-btn').focus(); document.querySelector('.pub-thumb-btn').click()")
    check("lightbox opens with focus on close", js("!document.getElementById('image-modal').hidden && document.activeElement.id === 'close-image-modal'"))
    check("lightbox alt copied from figure", bool(js("document.getElementById('modal-image').alt")))
    key("Tab")
    check("Tab stays trapped on close button", js("document.activeElement.id === 'close-image-modal'"))
    key("Escape")
    check("Escape closes and restores focus to thumb", js("document.getElementById('image-modal').hidden && document.activeElement.classList.contains('pub-thumb-btn')"))

    # tabs
    js("document.getElementById('tab-puzzle').focus()")
    key("ArrowRight")
    check("ArrowRight activates forecast tab", js("document.getElementById('tab-forecast').getAttribute('aria-selected') === 'true' && !document.getElementById('panel-forecast').hidden && document.activeElement.id === 'tab-forecast'"))
    check("forecast canvas sized after keyboard activation", js("document.getElementById('fc-canvas').width") > 0)
    key("Home")
    check("Home returns to puzzle tab", js("document.getElementById('tab-puzzle').getAttribute('aria-selected') === 'true' && document.getElementById('tab-forecast').tabIndex === -1"))

    # publication topic tabs
    js("document.querySelector('.pub-tab[data-filter=theory]').click()")
    check("topic tab filters publications", js("Array.from(document.querySelectorAll('#pubs-list .pub')).filter(p => !p.hidden).every(p => p.dataset.topic === 'theory')")
          and js("document.querySelectorAll('#pubs-list .pub:not([hidden])').length") == 2)
    js("document.querySelector('.pub-tab[data-filter=theory]').focus()")
    key("Home")
    check("Home on topic tabs returns to All", js("document.querySelector('.pub-tab[data-filter=all]').getAttribute('aria-selected') === 'true' && document.querySelectorAll('#pubs-list .pub[hidden]').length === 0"))
    js("document.querySelector('.pub-tab[data-filter=llm]').click()")
    js("document.querySelector('a[href=\"#pub-vlc\"]').click()")
    check("link to a filtered-out paper switches back to All", not js("document.getElementById('pub-vlc').hidden"))

    # theme toggle
    check("light scheme by default", js("getComputedStyle(document.body).backgroundColor") == "rgb(253, 253, 252)")
    js("document.getElementById('theme-toggle').click()")
    check("toggle switches to dark and persists", js("document.documentElement.dataset.theme") == "dark"
          and js("localStorage.getItem('theme')") == "dark"
          and js("getComputedStyle(document.body).backgroundColor") == "rgb(20, 26, 32)")
    check("theme-color metas pinned", js("Array.from(document.querySelectorAll('meta[name=theme-color]')).every(m => m.content === '#141a20')"))
    check("toggle label flips", js("document.getElementById('theme-toggle').getAttribute('aria-label')") == "Switch to light theme")
    send("Page.navigate", url=url); time.sleep(1.2)
    check("dark persists across reload", js("getComputedStyle(document.body).backgroundColor") == "rgb(20, 26, 32)")
    js("document.getElementById('theme-toggle').click()")
    check("toggling back to system clears override", js("localStorage.getItem('theme')") is None and js("!document.documentElement.dataset.theme"))

    # --- reduced motion
    send("Emulation.setEmulatedMedia", features=[{"name": "prefers-reduced-motion", "value": "reduce"}, {"name": "prefers-color-scheme", "value": "light"}])
    send("Page.navigate", url=url); time.sleep(1.2)
    check("carousel does not autoplay under reduced motion", js("document.getElementById('carousel').dataset.autoplay") == "off")
    check("sections visible without reveal animation", js("getComputedStyle(document.querySelector('#publications .wrap')).opacity") == "1")
    check("no uncaught exceptions during the run", not exceptions, "; ".join(exceptions))
    ws.close()
finally:
    proc.terminate(); shutil.rmtree(profile, ignore_errors=True)
print(f"\n{len(fails)} failure(s)")
sys.exit(1 if fails else 0)
