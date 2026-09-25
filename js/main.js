// Mobile navigation
const navToggle = document.getElementById('nav-toggle');
const siteNav = document.getElementById('site-nav');

navToggle.addEventListener('click', () => {
    const open = siteNav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', open);
});

// Smooth scrolling for anchor links (and close mobile nav)
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href');
        if (targetId === '#') {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                targetElement.scrollIntoView({ behavior: 'smooth' });
            }
        }
        siteNav.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
    });
});

// Photo carousel
const images = [
    { src: "assets/photos/upperbound-2026.jpeg", title: "Talk at Upper Bound 2026, Edmonton" },
    { src: "assets/photos/group-2023-cvpr.jpg", title: "CVPR 2023 Group Photo" },
    { src: "assets/photos/group-2022-sfu.jpg", title: "SFU Lab Group Photo 2022" },
];
let currentImageIndex = 0;
let autoSlideInterval;

const carouselImage = document.getElementById('carousel-image');
const photoTitleElement = document.getElementById('photo-title');
const carouselCounter = document.getElementById('carousel-counter');
const prevButton = document.getElementById('prev-button');
const nextButton = document.getElementById('next-button');

function showImage(index) {
    currentImageIndex = (index + images.length) % images.length;
    carouselImage.src = images[currentImageIndex].src;
    photoTitleElement.textContent = images[currentImageIndex].title;
    carouselCounter.textContent = `${currentImageIndex + 1} / ${images.length}`;
}

function resetAutoSlide() {
    clearInterval(autoSlideInterval);
    autoSlideInterval = setInterval(() => showImage(currentImageIndex + 1), 6000);
}

prevButton.addEventListener('click', () => {
    showImage(currentImageIndex - 1);
    resetAutoSlide();
});
nextButton.addEventListener('click', () => {
    showImage(currentImageIndex + 1);
    resetAutoSlide();
});

if (images.length > 0) {
    showImage(0);
    resetAutoSlide();
}

// Lightbox for publication thumbnails
const imageModal = document.getElementById('image-modal');
const modalImage = document.getElementById('modal-image');
const closeImageModalButton = document.getElementById('close-image-modal');

function openImageModal(src) {
    modalImage.src = src;
    imageModal.hidden = false;
    document.body.style.overflow = 'hidden';
}

function closeImageModal() {
    imageModal.hidden = true;
    document.body.style.overflow = '';
}

closeImageModalButton.addEventListener('click', closeImageModal);
imageModal.addEventListener('click', (e) => {
    if (e.target === imageModal) closeImageModal();
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !imageModal.hidden) closeImageModal();
});

document.querySelectorAll('.pub-thumb').forEach(img => {
    img.addEventListener('click', () => openImageModal(img.src));
});

// PuzzleFusion mini-game: tap two tiles to swap, or solve via "reverse diffusion"
const puzzleBoard = document.getElementById('puzzle-board');
if (puzzleBoard) {
    const N = 3;
    const statusEl = document.getElementById('puzzle-status');
    const shuffleBtn = document.getElementById('puzzle-shuffle');
    const solveBtn = document.getElementById('puzzle-solve');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let slotOf = [];        // tile index -> current slot on the board
    let selected = null;
    let moves = 0;
    let solving = false;

    const tiles = [];
    for (let i = 0; i < N * N; i++) {
        const tile = document.createElement('button');
        tile.type = 'button';
        tile.className = 'puzzle-tile';
        tile.setAttribute('aria-label', `Puzzle tile ${i + 1}`);
        tile.style.backgroundPosition =
            `${(i % N) * 100 / (N - 1)}% ${Math.floor(i / N) * 100 / (N - 1)}%`;
        tile.addEventListener('click', () => onTileClick(i));
        puzzleBoard.appendChild(tile);
        tiles.push(tile);
    }

    const slotXY = slot => ({ x: (slot % N) * 100, y: Math.floor(slot / N) * 100 });
    const isSolved = () => slotOf.every((slot, i) => slot === i);

    function render() {
        tiles.forEach((tile, i) => {
            const p = slotXY(slotOf[i]);
            tile.style.transform = `translate(${p.x}%, ${p.y}%)`;
        });
    }

    function clearSelection() {
        if (selected !== null) tiles[selected].classList.remove('selected');
        selected = null;
    }

    function onTileClick(i) {
        if (solving || isSolved()) return;
        if (selected === null) {
            selected = i;
            tiles[i].classList.add('selected');
        } else if (selected === i) {
            clearSelection();
        } else {
            [slotOf[selected], slotOf[i]] = [slotOf[i], slotOf[selected]];
            moves++;
            clearSelection();
            render();
            if (isSolved()) {
                puzzleBoard.classList.add('solved');
                statusEl.textContent = `solved in ${moves} swaps — human beats diffusion ✓`;
            } else {
                statusEl.textContent = `${moves} ${moves === 1 ? 'swap' : 'swaps'}`;
            }
        }
    }

    function shuffle() {
        if (solving) return;
        clearSelection();
        puzzleBoard.classList.remove('solved');
        moves = 0;
        do {
            for (let i = slotOf.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [slotOf[i], slotOf[j]] = [slotOf[j], slotOf[i]];
            }
        } while (isSolved());
        render();
        statusEl.textContent = 'tap two tiles to swap them';
    }

    function diffusionSolve() {
        if (solving || isSolved()) return;
        clearSelection();
        solving = true;

        if (reduceMotion) {
            slotOf = tiles.map((_, i) => i);
            render();
            finishSolve();
            return;
        }

        puzzleBoard.classList.add('solving');
        const startPos = tiles.map((_, i) => slotXY(slotOf[i]));
        const phase = tiles.map((_, i) => i * 2.4);
        const duration = 2200;
        const t0 = performance.now();

        function frame(now) {
            const u = Math.min(1, (now - t0) / duration);
            const ease = u * u * (3 - 2 * u);
            const noise = Math.pow(1 - u, 1.6) * 38;
            tiles.forEach((tile, i) => {
                const home = slotXY(i);
                const x = startPos[i].x + (home.x - startPos[i].x) * ease
                    + (Math.sin(now / 90 + phase[i] * 7) + 0.6 * Math.sin(now / 41 + phase[i] * 3)) * noise;
                const y = startPos[i].y + (home.y - startPos[i].y) * ease
                    + (Math.cos(now / 110 + phase[i] * 5) + 0.6 * Math.cos(now / 53 + phase[i])) * noise;
                const rot = Math.sin(now / 130 + phase[i]) * (1 - ease) * 16;
                tile.style.transform = `translate(${x}%, ${y}%) rotate(${rot}deg)`;
            });
            statusEl.textContent = `reverse diffusion · t = ${Math.round(1000 * (1 - u))}`;
            if (u < 1) {
                requestAnimationFrame(frame);
            } else {
                slotOf = tiles.map((_, i) => i);
                puzzleBoard.classList.remove('solving');
                render();
                finishSolve();
            }
        }
        requestAnimationFrame(frame);
    }

    function finishSolve() {
        solving = false;
        puzzleBoard.classList.add('solved');
        statusEl.textContent = 'denoised · x₀ recovered ✓';
    }

    shuffleBtn.addEventListener('click', shuffle);
    solveBtn.addEventListener('click', diffusionSolve);

    slotOf = tiles.map((_, i) => i);
    shuffle();
}

// Fun section tabs
const funTabs = document.querySelectorAll('.fun-tab');
funTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        funTabs.forEach(t => {
            const active = t === tab;
            t.classList.toggle('active', active);
            t.setAttribute('aria-selected', active);
            document.getElementById(t.getAttribute('aria-controls')).hidden = !active;
        });
    });
});

// Scaleformer mini-game: draw your forecast, then reveal the future
const fcCanvas = document.getElementById('fc-canvas');
if (fcCanvas) {
    const ctx = fcCanvas.getContext('2d');
    const fcStatus = document.getElementById('fc-status');
    const fcNew = document.getElementById('fc-new');
    const fcReveal = document.getElementById('fc-reveal');
    const fcReduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const HIST = 84, HORIZON = 36, PERIOD = 24;
    const TOTAL = HIST + HORIZON;
    const COLOR = {
        hist: '#1d2126', you: '#235a83', model: '#969ea6',
        truth: '#b2593a', grid: '#e3e3de', wash: 'rgba(35, 90, 131, 0.07)',
    };

    let series = [], modelFc = [], pred = [];
    let revealed = false, revealProgress = 0;
    let lastIdx = null;
    let yMin = 0, yMax = 1;
    let plot = { x: 0, y: 0, w: 1, h: 1 };

    function generateSeries() {
        const slope = (Math.random() - 0.5) * 0.5;
        const amp = 8 + Math.random() * 8;
        const amp2 = 3 + Math.random() * 4;
        const phase = Math.random() * Math.PI * 2;
        let noise = 0;
        series = [];
        for (let t = 0; t < TOTAL; t++) {
            noise = noise * 0.65 + (Math.random() - 0.5) * 3.5;
            series.push(
                60 + slope * t
                + amp * Math.sin(2 * Math.PI * t / PERIOD + phase)
                + amp2 * Math.sin(4 * Math.PI * t / PERIOD + phase * 1.7)
                + noise
            );
        }
    }

    // The opponent: linear trend + per-phase seasonal average, lightly smoothed.
    function buildModelForecast() {
        const n = HIST;
        let sx = 0, sy = 0, sxx = 0, sxy = 0;
        for (let t = 0; t < n; t++) {
            sx += t; sy += series[t]; sxx += t * t; sxy += t * series[t];
        }
        const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx);
        const intercept = (sy - slope * sx) / n;
        const seasonal = new Array(PERIOD).fill(0);
        const counts = new Array(PERIOD).fill(0);
        for (let t = 0; t < n; t++) {
            seasonal[t % PERIOD] += series[t] - (intercept + slope * t);
            counts[t % PERIOD]++;
        }
        for (let p = 0; p < PERIOD; p++) seasonal[p] /= counts[p] || 1;
        const raw = [];
        for (let t = 0; t < HORIZON; t++) {
            const g = HIST + t;
            raw.push(intercept + slope * g + seasonal[g % PERIOD]);
        }
        modelFc = raw.map((v, i) => {
            const a = raw[Math.max(0, i - 1)], b = raw[Math.min(HORIZON - 1, i + 1)];
            return (a + v + b) / 3;
        });
    }

    function sizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const w = fcCanvas.clientWidth || fcCanvas.parentElement.clientWidth;
        const h = Math.round(w * 0.62);
        fcCanvas.width = Math.round(w * dpr);
        fcCanvas.height = Math.round(h * dpr);
        fcCanvas.style.height = `${h}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        plot = { x: 6, y: 8, w: w - 12, h: h - 16 };
    }

    const xPx = t => plot.x + plot.w * t / (TOTAL - 1);
    const yPx = v => plot.y + plot.h * (1 - (v - yMin) / (yMax - yMin));
    const pxToIdx = x => Math.round((x - plot.x) / plot.w * (TOTAL - 1));
    const pxToVal = y => yMin + (yMax - yMin) * (1 - (y - plot.y) / plot.h);

    function setScale() {
        const all = series.concat(modelFc);
        const lo = Math.min(...all), hi = Math.max(...all);
        const pad = (hi - lo) * 0.18;
        yMin = lo - pad; yMax = hi + pad;
    }

    function drawLine(points, color, width, dash) {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.setLineDash(dash || []);
        let started = false;
        points.forEach(p => {
            if (p === null) { started = false; return; }
            if (!started) { ctx.moveTo(p.x, p.y); started = true; }
            else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
        ctx.setLineDash([]);
    }

    function label(text, x, y, color) {
        ctx.font = '10px "IBM Plex Mono", monospace';
        ctx.fillStyle = color;
        ctx.fillText(text, x, y);
    }

    function draw() {
        const w = fcCanvas.clientWidth, h = parseFloat(fcCanvas.style.height);
        ctx.clearRect(0, 0, w, h);

        // forecast region wash
        const splitX = xPx(HIST - 1);
        ctx.fillStyle = COLOR.wash;
        ctx.fillRect(splitX, plot.y, plot.x + plot.w - splitX, plot.h);

        // grid
        ctx.strokeStyle = COLOR.grid;
        ctx.lineWidth = 1;
        for (let g = 1; g <= 3; g++) {
            const y = plot.y + plot.h * g / 4;
            ctx.beginPath();
            ctx.moveTo(plot.x, y);
            ctx.lineTo(plot.x + plot.w, y);
            ctx.stroke();
        }

        // history
        drawLine(series.slice(0, HIST).map((v, t) => ({ x: xPx(t), y: yPx(v) })), COLOR.hist, 2);

        // user forecast, anchored to last history point
        const userPts = [{ x: xPx(HIST - 1), y: yPx(series[HIST - 1]) }];
        pred.forEach((v, i) => userPts.push(v === null ? null : { x: xPx(HIST + i), y: yPx(v) }));
        drawLine(userPts, COLOR.you, 2.5);

        if (revealed) {
            const shown = Math.max(2, Math.ceil(HORIZON * revealProgress));
            const clip = (arr, start) => arr.slice(0, shown)
                .map((v, i) => ({ x: xPx(start + i), y: yPx(v) }));
            drawLine([{ x: xPx(HIST - 1), y: yPx(series[HIST - 1]) }, ...clip(modelFc, HIST)],
                COLOR.model, 2, [4, 4]);
            drawLine([{ x: xPx(HIST - 1), y: yPx(series[HIST - 1]) }, ...clip(series.slice(HIST), HIST)],
                COLOR.truth, 2);
        }

        // direct labels at line ends, nudged apart if they collide
        const labels = [];
        const lastPred = [...pred].reverse().find(v => v !== null);
        if (lastPred !== undefined && lastPred !== null) {
            labels.push({ text: 'you', y: yPx(lastPred), color: COLOR.you });
        }
        if (revealed && revealProgress >= 1) {
            labels.push({ text: 'model', y: yPx(modelFc[HORIZON - 1]), color: COLOR.model });
            labels.push({ text: 'truth', y: yPx(series[TOTAL - 1]), color: COLOR.truth });
        }
        labels.sort((a, b) => a.y - b.y);
        for (let i = 1; i < labels.length; i++) {
            if (labels[i].y - labels[i - 1].y < 12) labels[i].y = labels[i - 1].y + 12;
        }
        const lx = plot.x + plot.w - 34;
        labels.forEach(l => label(l.text, lx, l.y - 5, l.color));
    }

    function coverage() {
        return pred.filter(v => v !== null).length / HORIZON;
    }

    // Forgiving completion: bridge from the history anchor to the first drawn
    // point, interpolate interior gaps, and snap the tail if close to the edge.
    function fillGaps() {
        const first = pred.findIndex(v => v !== null);
        if (first === -1) return;
        const anchor = series[HIST - 1];
        for (let i = 0; i < first; i++) {
            pred[i] = anchor + (pred[first] - anchor) * (i + 1) / (first + 1);
        }
        let last = HORIZON - 1;
        while (pred[last] === null) last--;
        if (last >= HORIZON - 4) {
            for (let i = last + 1; i < HORIZON; i++) pred[i] = pred[last];
        }
        let i = first;
        while (i < HORIZON) {
            if (pred[i] === null) {
                let j = i;
                while (j < HORIZON && pred[j] === null) j++;
                if (j >= HORIZON) break;
                const a = pred[i - 1], b = pred[j];
                for (let k = i; k < j; k++) {
                    pred[k] = a + (b - a) * (k - i + 1) / (j - i + 1);
                }
                i = j;
            } else i++;
        }
    }

    function setPrediction(idx, val) {
        idx = Math.max(0, Math.min(HORIZON - 1, idx));
        val = Math.max(yMin, Math.min(yMax, val));
        if (lastIdx !== null && Math.abs(idx - lastIdx.idx) > 1) {
            const step = idx > lastIdx.idx ? 1 : -1;
            for (let i = lastIdx.idx; i !== idx; i += step) {
                const f = (i - lastIdx.idx) / (idx - lastIdx.idx);
                pred[i] = lastIdx.val + (val - lastIdx.val) * f;
            }
        }
        pred[idx] = val;
        lastIdx = { idx, val };
    }

    let drawing = false;
    fcCanvas.addEventListener('pointerdown', e => {
        if (revealed) return;
        const rect = fcCanvas.getBoundingClientRect();
        const idx = pxToIdx(e.clientX - rect.left) - HIST;
        if (idx < -2) return;
        drawing = true;
        lastIdx = null;
        fcCanvas.setPointerCapture(e.pointerId);
        setPrediction(idx, pxToVal(e.clientY - rect.top));
        draw();
    });
    fcCanvas.addEventListener('pointermove', e => {
        if (!drawing || revealed) return;
        const rect = fcCanvas.getBoundingClientRect();
        setPrediction(pxToIdx(e.clientX - rect.left) - HIST, pxToVal(e.clientY - rect.top));
        draw();
        updateDrawStatus();
    });
    const endDraw = () => {
        if (!drawing) return;
        drawing = false;
        lastIdx = null;
        fillGaps();
        draw();
        updateDrawStatus();
    };
    fcCanvas.addEventListener('pointerup', endDraw);
    fcCanvas.addEventListener('pointercancel', endDraw);

    function updateDrawStatus() {
        if (revealed) return;
        if (coverage() >= 1) {
            fcStatus.textContent = 'forecast locked — reveal when ready';
        } else if (coverage() > 0) {
            fcStatus.textContent =
                `keep drawing to the right edge → ${Math.round(coverage() * 100)}% drawn`;
        }
    }

    // Clicked "reveal" too early: explain, and flash the undrawn region
    function flashMissing() {
        const pct = Math.round(coverage() * 100);
        fcStatus.textContent = pct === 0
            ? 'draw your forecast in the shaded region first'
            : `almost — draw across the whole shaded region (${pct}% so far)`;
        if (fcReduceMotion) return;
        const firstNull = pred.findIndex(v => v === null);
        const x0 = firstNull <= 0 ? xPx(HIST - 1) : xPx(HIST + firstNull - 1);
        const t0 = performance.now();
        const duration = 900;
        function frame(now) {
            if (revealed || drawing) return;
            const u = Math.min(1, (now - t0) / duration);
            draw();
            ctx.fillStyle = `rgba(178, 89, 58, ${(0.18 * (1 - u)).toFixed(3)})`;
            ctx.fillRect(x0, plot.y, plot.x + plot.w - x0, plot.h);
            if (u < 1) requestAnimationFrame(frame);
            else draw();
        }
        requestAnimationFrame(frame);
    }

    const mae = arr => arr.reduce((s, v, i) => s + Math.abs(v - series[HIST + i]), 0) / HORIZON;

    function reveal() {
        if (revealed) return;
        if (coverage() < 1) {
            flashMissing();
            return;
        }
        revealed = true;
        fcReveal.disabled = true;

        function finish() {
            revealProgress = 1;
            draw();
            const yours = mae(pred), models = mae(modelFc);
            const verdict = yours <= models
                ? 'you beat the model ✓'
                : 'the model wins — try a new series';
            fcStatus.textContent =
                `your MAE ${yours.toFixed(1)} · model ${models.toFixed(1)} — ${verdict}`;
        }

        if (fcReduceMotion) { finish(); return; }
        const t0 = performance.now();
        const duration = 900;
        function frame(now) {
            revealProgress = Math.min(1, (now - t0) / duration);
            draw();
            if (revealProgress < 1) requestAnimationFrame(frame);
            else finish();
        }
        requestAnimationFrame(frame);
    }

    function newSeries() {
        generateSeries();
        buildModelForecast();
        setScale();
        pred = new Array(HORIZON).fill(null);
        revealed = false;
        revealProgress = 0;
        lastIdx = null;
        fcReveal.disabled = false;
        fcStatus.textContent = 'draw your forecast in the shaded region';
        draw();
    }

    fcNew.addEventListener('click', newSeries);
    fcReveal.addEventListener('click', reveal);

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => { sizeCanvas(); draw(); }, 150);
    });

    // The panel starts hidden, so size once it becomes visible.
    document.getElementById('tab-forecast').addEventListener('click', () => {
        if (!fcCanvas.clientWidth) return;
        sizeCanvas();
        draw();
    });

    sizeCanvas();
    newSeries();
}

// Scroll reveal
const revealTargets = document.querySelectorAll('.section .wrap, .hero-grid');
revealTargets.forEach(el => el.classList.add('reveal'));

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('in');
            observer.unobserve(entry.target);
        }
    });
}, { threshold: 0.08 });

revealTargets.forEach(el => observer.observe(el));
