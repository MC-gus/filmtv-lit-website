// 基礎攝影互動教室：場景模擬與各個互動區
// 場景由五個「距離圖層」組成，依光學公式計算每層的模糊、亮度與放大倍率

type LayerName = 'far' | 'mid' | 'mover' | 'subject' | 'near';
const LAYERS: LayerName[] = ['far', 'mid', 'mover', 'subject', 'near'];

// 各圖層與相機的距離（公尺）
const DIST: Record<LayerName, number> = { near: 1, subject: 3, mover: 5, mid: 9, far: Infinity };

export const APERTURES = [1.4, 2, 2.8, 4, 5.6, 8, 11, 16, 22];
export const SHUTTERS = [1 / 4000, 1 / 2000, 1 / 1000, 1 / 500, 1 / 250, 1 / 125, 1 / 60, 1 / 30, 1 / 15, 1 / 8, 1 / 4, 1 / 2, 1];
export const ISOS = [100, 200, 400, 800, 1600, 3200, 6400, 12800];

const SPEED = 520; // 單車在畫面中的速度（場景單位／秒，畫面寬 800）
const EPS = 1e-9;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const fmtShutter = (t: number) => (t >= 1 ? `${t}"` : `1/${Math.round(1 / t)}`);
const fmtM = (m: number) => (m === Infinity ? '∞' : m >= 10 ? `${m.toFixed(0)} m` : `${m.toFixed(1)} m`);

// ── 光學公式 ──
// 模糊圈直徑（換算成畫面寬 800 的單位），全片幅感光元件寬 36mm
function blurPx(fmm: number, N: number, focusM: number, distM: number) {
  const s = focusM * 1000;
  const ratio = distM === Infinity ? 1 : Math.abs(distM * 1000 - s) / (distM * 1000);
  const b = ((fmm * fmm) / (N * (s - fmm))) * ratio;
  return (b / 36) * 800;
}
// 景深（容許模糊圈 0.03mm）
function depthOfField(fmm: number, N: number, focusM: number) {
  const c = 0.03;
  const H = (fmm * fmm) / (N * c) + fmm;
  const s = focusM * 1000;
  const near = (s * (H - fmm)) / (H + s - 2 * fmm) / 1000;
  const far = s < H ? (s * (H - fmm)) / (H - s) / 1000 : Infinity;
  return { near, far, hyperfocal: H / 1000 };
}
// 曝光差（正值＝過曝），sceneEV 為 ISO100 下的場景亮度
function exposureDiff(sceneEV: number, N: number, t: number, iso: number) {
  return sceneEV + Math.log2(iso / 100) - Math.log2((N * N) / t);
}

// ── 場景插畫（座標以 800×450 為標準畫面，左右延伸給廣角使用）──
const ART: Record<LayerName, (id: string) => string> = {
  far: (id) => `
    <rect x="-1200" y="-900" width="3200" height="2400" fill="url(#${id}-sky)"/>
    <circle cx="610" cy="140" r="34" fill="#ffe9b8"/>
    <path d="M-1200 290 L-860 210 L-640 270 L-420 200 L-200 268 L60 215 L170 265 L300 185 L430 270 L540 215 L680 268 L800 225 L960 262 L1150 205 L1380 270 L1600 222 L2000 280 L2000 1500 L-1200 1500Z" fill="#6b5876"/>
    <path d="M-1200 322 L-900 282 L-600 308 L-300 270 L90 270 L240 305 L390 262 L560 310 L720 275 L900 300 L1150 268 L1450 306 L2000 282 L2000 1500 L-1200 1500Z" fill="#4c4060"/>`,
  mid: () => `
    <rect x="-1200" y="318" width="3200" height="1500" fill="#3b4031"/>
    <rect x="-1200" y="380" width="3200" height="34" fill="#4d4943"/>
    <g fill="#2a3346">
      <rect x="-420" y="190" width="90" height="135"/><rect x="-320" y="225" width="70" height="100"/>
      <rect x="40" y="200" width="90" height="125"/><rect x="140" y="160" width="70" height="165"/>
      <rect x="620" y="180" width="80" height="145"/><rect x="710" y="215" width="110" height="110"/>
      <rect x="1020" y="170" width="85" height="155"/><rect x="1115" y="215" width="70" height="110"/>
    </g>
    <g fill="#ffd27a" opacity=".85">
      <rect x="55" y="215" width="12" height="12"/><rect x="85" y="215" width="12" height="12"/><rect x="55" y="245" width="12" height="12"/><rect x="100" y="270" width="12" height="12"/>
      <rect x="155" y="180" width="10" height="12"/><rect x="185" y="210" width="10" height="12"/><rect x="155" y="240" width="10" height="12"/>
      <rect x="635" y="200" width="12" height="12"/><rect x="670" y="230" width="12" height="12"/><rect x="730" y="235" width="14" height="12"/><rect x="775" y="265" width="14" height="12"/>
      <rect x="-400" y="210" width="12" height="12"/><rect x="1040" y="190" width="12" height="12"/><rect x="1070" y="240" width="12" height="12"/>
    </g>
    <g fill="#24402f">
      <circle cx="275" cy="268" r="46"/><circle cx="520" cy="262" r="52"/><circle cx="-130" cy="268" r="48"/><circle cx="930" cy="265" r="50"/>
    </g>
    <g fill="#3b2a1e"><rect x="270" y="295" width="10" height="35"/><rect x="515" y="292" width="10" height="38"/><rect x="-135" y="295" width="10" height="35"/><rect x="925" y="292" width="10" height="38"/></g>`,
  mover: () => `
    <g data-mover>
      <circle cx="-38" cy="392" r="22" fill="none" stroke="#e8e2d6" stroke-width="5"/>
      <circle cx="38" cy="392" r="22" fill="none" stroke="#e8e2d6" stroke-width="5"/>
      <path d="M-38 392 L-8 352 L22 392 Z M-8 352 L30 352 L38 392" fill="none" stroke="#c9a84c" stroke-width="5" stroke-linejoin="round"/>
      <path d="M0 314 L-10 350 M0 314 L24 340 L30 352" stroke="#2d6cdf" stroke-width="11" stroke-linecap="round" fill="none"/>
      <path d="M-10 350 L6 378 M-10 350 L-22 380" stroke="#1c2433" stroke-width="8" stroke-linecap="round"/>
      <circle cx="2" cy="300" r="13" fill="#f1c7a1"/>
      <path d="M-11 296 Q2 280 15 296Z" fill="#c9a84c"/>
    </g>`,
  subject: () => `
    <path d="M380 330 L372 440 M420 330 L428 440" stroke="#1f2533" stroke-width="22" stroke-linecap="round"/>
    <path d="M360 250 L332 300" stroke="#b8322a" stroke-width="18" stroke-linecap="round"/>
    <path d="M440 250 L468 290" stroke="#b8322a" stroke-width="18" stroke-linecap="round"/>
    <path d="M352 236 Q400 220 448 236 L440 340 L360 340 Z" fill="#b8322a"/>
    <g transform="translate(450 262) rotate(-8)">
      <rect width="72" height="50" fill="#111"/><rect y="-14" width="72" height="14" fill="#f2f0ea"/>
      <path d="M8 -14 L18 0 M28 -14 L38 0 M48 -14 L58 0" stroke="#111" stroke-width="6"/>
      <text x="8" y="31" font-size="12" fill="#f2f0ea" font-family="monospace">LIT 01</text>
    </g>
    <circle cx="400" cy="200" r="27" fill="#f1c7a1"/>
    <path d="M373 197 Q375 166 402 168 Q428 168 428 197 Q418 182 400 182 Q384 182 373 197Z" fill="#2b1d14"/>`,
  near: () => `
    <g fill="#18261a">
      <path d="M-60 460 Q-30 330 -5 460Z"/><path d="M-20 460 Q20 300 45 460Z"/><path d="M30 460 Q70 350 85 460Z"/><path d="M70 460 Q110 380 130 460Z"/>
      <path d="M660 460 Q690 360 705 460Z"/><path d="M700 460 Q740 300 765 460Z"/><path d="M745 460 Q790 340 810 460Z"/><path d="M790 460 Q830 320 860 460Z"/>
    </g>
    <path d="M95 455 L92 380 M725 455 L722 370" stroke="#2e4a2c" stroke-width="5"/>
    <circle cx="92" cy="372" r="14" fill="#e9b949"/><circle cx="92" cy="372" r="5" fill="#a86a1c"/>
    <circle cx="722" cy="360" r="16" fill="#d9574a"/><circle cx="722" cy="360" r="6" fill="#7a2a22"/>`,
};

let uid = 0;
const scenes: Scene[] = [];

export class Scene {
  el: HTMLElement;
  frame: HTMLElement;
  svgs = {} as Record<LayerName, SVGSVGElement>;
  blurs = {} as Record<LayerName, SVGFEGaussianBlurElement>;
  scale = {} as Record<LayerName, number>;
  mover: SVGGElement;
  noise: HTMLCanvasElement;
  zebra: HTMLElement;
  tint: HTMLElement;
  moverX = 250;
  moving = true;
  panning = false;
  noiseLevel = 0;
  visible = false;
  private lastNoise = 0;

  constructor(el: HTMLElement, opts: { hide?: LayerName[]; tint?: 'night' | 'dusk' | '' } = {}) {
    const id = `ph${uid++}`;
    this.el = el;
    el.innerHTML = `
      <div data-frame class="absolute inset-0">
        ${LAYERS.map((n) => `
          <svg data-layer="${n}" class="absolute inset-0 w-full h-full${opts.hide?.includes(n) ? ' hidden' : ''}" viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <defs>
              ${n === 'far' ? `<linearGradient id="${id}-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1e3a5f"/><stop offset=".62" stop-color="#e8a86b"/><stop offset="1" stop-color="#f3c98b"/></linearGradient>` : ''}
              <filter id="${id}-${n}" x="-50%" y="-50%" width="200%" height="200%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="0.001 0.001"/></filter>
            </defs>
            <g filter="url(#${id}-${n})">${ART[n](id)}</g>
          </svg>`).join('')}
      </div>
      <div data-tint class="absolute inset-0 pointer-events-none mix-blend-multiply transition-colors duration-500"></div>
      <canvas data-noise width="320" height="180" class="absolute inset-0 w-full h-full pointer-events-none" style="image-rendering:pixelated;mix-blend-mode:overlay;opacity:0"></canvas>
      <div data-zebra class="absolute inset-0 pointer-events-none opacity-0 transition-opacity duration-200" style="background:repeating-linear-gradient(45deg,rgba(255,255,255,.4) 0 6px,transparent 6px 14px)"></div>`;
    this.frame = el.querySelector('[data-frame]')!;
    for (const n of LAYERS) {
      this.svgs[n] = el.querySelector(`[data-layer="${n}"]`)!;
      this.blurs[n] = this.svgs[n].querySelector('feGaussianBlur')!;
      this.scale[n] = 1;
    }
    this.mover = el.querySelector('[data-mover]')!;
    this.noise = el.querySelector('[data-noise]')!;
    this.zebra = el.querySelector('[data-zebra]')!;
    this.tint = el.querySelector('[data-tint]')!;
    this.setTint(opts.tint ?? '');
    new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; }).observe(el);
    scenes.push(this);
    this.placeMover();
  }

  // 以畫面中心偏下 (400,300) 為基準縮放，s=1 為標準 50mm 視角
  setScale(n: LayerName, s: number) {
    this.scale[n] = s;
    const w = 800 / s, h = 450 / s;
    this.svgs[n].setAttribute('viewBox', `${400 - w / 2} ${300 - (2 / 3) * h} ${w} ${h}`);
  }
  // 模糊量以「標準畫面寬 800」為單位，會依該層縮放換算
  setBlur(n: LayerName, sx: number, sy = sx) {
    const k = 1 / this.scale[n];
    this.blurs[n].setAttribute('stdDeviation', `${Math.max(0.001, sx * k)} ${Math.max(0.001, sy * k)}`);
  }
  // 場景氣氛：夜晚、傍晚
  setTint(t: '' | 'night' | 'dusk') {
    this.tint.style.background = t === 'night' ? 'rgba(20,32,90,.6)' : t === 'dusk' ? 'rgba(90,50,80,.35)' : 'transparent';
  }
  setExposure(diff: number) {
    const b = clamp(2 ** (0.9 * diff), 0.03, 6);
    const c = diff > 0 ? 1 + diff * 0.12 : 1;
    this.frame.style.filter = `brightness(${b.toFixed(3)}) contrast(${c.toFixed(3)})`;
    this.zebra.style.opacity = diff >= 1.5 ? '0.75' : '0';
  }
  setNoise(level: number) {
    this.noiseLevel = clamp(level, 0, 1);
    this.noise.style.opacity = String(this.noiseLevel * 0.85);
  }
  placeMover() {
    this.mover.setAttribute('transform', `translate(${this.moverX} 0)`);
  }
  tick(dt: number, now: number) {
    if (!this.visible) return;
    if (this.panning) { this.moverX = 400; this.placeMover(); }
    else if (this.moving) {
      this.moverX += SPEED * dt;
      if (this.moverX > 1100) this.moverX = -300;
      this.placeMover();
    }
    if (this.noiseLevel > 0.02 && now - this.lastNoise > 80) {
      this.lastNoise = now;
      const ctx = this.noise.getContext('2d')!;
      const img = ctx.createImageData(320, 180);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = Math.random() * 255;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
    }
  }
}

let last = performance.now();
function loop(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  scenes.forEach((s) => s.tick(dt, now));
  requestAnimationFrame(loop);
}

// ── 小工具 ──
const q = <T extends Element = HTMLElement>(root: Element, sel: string) => root.querySelector(sel) as T;
const out = (root: Element, key: string, txt: string) => root.querySelectorAll(`[data-out="${key}"]`).forEach((e) => (e.textContent = txt));
const ctl = (root: Element, name: string) => q<HTMLInputElement>(root, `[data-ctl="${name}"]`);
const onInput = (els: (HTMLElement | null)[], fn: () => void) => els.forEach((e) => e?.addEventListener('input', fn));
const setNeedle = (root: Element, diff: number) => {
  const n = q(root, '[data-needle]');
  if (n) n.style.left = `${50 + (clamp(diff, -3, 3) / 3) * 50}%`;
};
const expText = (diff: number) =>
  Math.abs(diff) <= 0.35 ? '曝光正確 ✓'
  : diff > 0 ? `過曝 +${diff.toFixed(1)} EV：縮小光圈、加快快門或降低 ISO`
  : `欠曝 ${diff.toFixed(1)} EV：開大光圈、放慢快門或提高 ISO`;

// ── 01 曝光三角＋任務 ──
type Snap = { N: number; t: number; iso: number; diff: number; tripod: boolean };
const MISSIONS: { name: string; ev: number; tint: '' | 'night' | 'dusk'; desc: string; checks: [string, (s: Snap) => boolean][] }[] = [
  { name: '自由練習', ev: 13, tint: '', desc: '陰天的戶外。試著用不同組合，把曝光指針調到 0。', checks: [] },
  { name: '凍結飛馳的單車', ev: 14, tint: '', desc: '晴天下，拍出完全清楚、沒有拖影的單車騎士。',
    checks: [['快門 1/1000 或更快', (s) => s.t <= 1 / 1000 + EPS], ['曝光正確（±0.7 EV）', (s) => Math.abs(s.diff) <= 0.7]] },
  { name: '奶油散景人像', ev: 12, tint: '', desc: '人物清楚、背景柔和散開，而且畫面乾淨沒有雜訊。',
    checks: [['光圈 f/2.8 或更大', (s) => s.N <= 2.8], ['ISO 400 以下', (s) => s.iso <= 400], ['曝光正確（±0.7 EV）', (s) => Math.abs(s.diff) <= 0.7]] },
  { name: '夜市手持不手震', ev: 5, tint: 'night', desc: '晚上沒帶腳架，要拍清楚又不能太暗。',
    checks: [['不使用腳架', (s) => !s.tripod], ['快門 1/60 或更快（安全快門）', (s) => s.t <= 1 / 60 + EPS], ['曝光正確（±1 EV）', (s) => Math.abs(s.diff) <= 1]] },
  { name: '拍出速度感', ev: 10, tint: 'dusk', desc: '傍晚架好腳架，讓單車拉出有速度感的拖影。',
    checks: [['使用腳架', (s) => s.tripod], ['快門 1/30 或更慢', (s) => s.t >= 1 / 30 - EPS], ['曝光正確（±0.7 EV）', (s) => Math.abs(s.diff) <= 0.7]] },
];

function initExposure(root: HTMLElement) {
  const sceneEl = q(root, '[data-scene]');
  const scene = new Scene(sceneEl);
  let mission = 0;
  const [a, s, i, tripod] = ['aperture', 'shutter', 'iso', 'tripod'].map((n) => ctl(root, n));
  const missionBtns = root.querySelectorAll<HTMLButtonElement>('[data-mission]');
  const checksEl = q(root, '[data-checks]');

  function update() {
    const N = APERTURES[+a.value], t = SHUTTERS[+s.value], iso = ISOS[+i.value];
    const m = MISSIONS[mission];
    const diff = exposureDiff(m.ev, N, t, iso);
    const shake = !tripod.checked && t > 1 / 50 + EPS ? Math.min(10, 1.5 + 2.2 * Math.log2(t * 50)) : 0;
    for (const n of LAYERS) {
      const d = blurPx(50, N, 3, DIST[n]) * 0.5 + shake;
      scene.setBlur(n, n === 'mover' ? d + Math.min(160, SPEED * t) / 2 : d, d);
    }
    scene.setExposure(diff);
    scene.setNoise(Math.log2(iso / 100) / 7);
    out(root, 'aperture', `f/${N}`);
    out(root, 'shutter', fmtShutter(t));
    out(root, 'iso', String(iso));
    out(root, 'ev', `${diff >= 0 ? '+' : ''}${diff.toFixed(1)} EV`);
    out(root, 'status', expText(diff));
    out(root, 'shake', shake ? '⚠ 快門比安全快門（約 1/50）慢，手持會手震：打開腳架或加快快門' : '');
    setNeedle(root, diff);

    const snap: Snap = { N, t, iso, diff, tripod: tripod.checked };
    out(root, 'mission-desc', m.desc);
    checksEl.innerHTML = m.checks.map(([label, ok]) =>
      `<li class="flex items-center gap-2 ${ok(snap) ? 'text-film-gold' : 'text-film-light/50'}"><span>${ok(snap) ? '✓' : '○'}</span>${label}</li>`).join('');
    const done = m.checks.length > 0 && m.checks.every(([, ok]) => ok(snap));
    q(root, '[data-done]').classList.toggle('hidden', !done);
  }

  missionBtns.forEach((btn) => btn.addEventListener('click', () => {
    mission = +btn.dataset.mission!;
    missionBtns.forEach((b) => b.classList.toggle('lab-chip-on', b === btn));
    scene.setTint(MISSIONS[mission].tint);
    update();
  }));
  onInput([a, s, i, tripod], update);
  update();
}

// ── 02 光圈與景深 ──
function initDof(root: HTMLElement) {
  const scene = new Scene(q(root, '[data-scene]'));
  scene.moving = false;
  scene.moverX = 600;
  scene.placeMover();
  const [a, f, focus] = ['aperture', 'focal', 'focus'].map((n) => ctl(root, n));
  const pos = (d: number) => (d === Infinity ? 100 : clamp((Math.log(d / 0.5) / Math.log(100 / 0.5)) * 94, 0, 94));
  const marks: [string, number][] = [['花', 1], ['人', 3], ['單車', 5], ['樹', 9], ['山', Infinity]];
  q(root, '[data-marks]').innerHTML = marks.map(([label, d]) =>
    `<span class="absolute -translate-x-1/2 text-[11px] text-film-light/60" style="left:${pos(d)}%">${label}</span>`).join('');

  function update() {
    const N = APERTURES[+a.value], fmm = +f.value, s = 0.5 * 40 ** (+focus.value / 100);
    for (const n of LAYERS) { scene.setScale(n, fmm / 50); scene.setBlur(n, blurPx(fmm, N, s, DIST[n]) * 0.5); }
    const { near, far } = depthOfField(fmm, N, s);
    out(root, 'aperture', `f/${N}`);
    out(root, 'focal', `${fmm} mm`);
    out(root, 'focus', fmtM(s));
    out(root, 'range', `${fmtM(near)} – ${fmtM(far)}`);
    out(root, 'depth', far === Infinity ? '到無限遠都清楚' : `清晰範圍約 ${(far - near) < 1 ? `${((far - near) * 100).toFixed(0)} 公分` : `${(far - near).toFixed(1)} 公尺`}`);
    const band = q(root, '[data-band]');
    band.style.left = `${pos(near)}%`;
    band.style.width = `${Math.max(0.8, pos(far) - pos(near))}%`;
    q(root, '[data-focus-mark]').style.left = `${pos(s)}%`;
  }
  onInput([a, f, focus], update);
  update();
}

// ── 03 快門與動態模糊 ──
function initShutter(root: HTMLElement) {
  const scene = new Scene(q(root, '[data-scene]'), { hide: ['subject'] });
  const s = ctl(root, 'shutter'), pan = ctl(root, 'pan');
  function update() {
    const t = SHUTTERS[+s.value];
    const streak = Math.min(160, SPEED * t) / 2;
    scene.panning = pan.checked;
    for (const n of LAYERS) {
      const dof = blurPx(50, 4, 5, DIST[n]) * 0.5;
      const moving = scene.panning ? n !== 'mover' : n === 'mover';
      scene.setBlur(n, dof + (moving ? streak : 0), dof);
    }
    out(root, 'shutter', fmtShutter(t));
    const cm = 5.56 * t * 100; // 時速 20 公里 ≈ 每秒 5.56 公尺
    out(root, 'travel', cm < 1 ? `${(cm * 10).toFixed(1)} 公釐` : cm < 100 ? `${cm.toFixed(0)} 公分` : `${(cm / 100).toFixed(1)} 公尺`);
    out(root, 'verdict',
      scene.panning ? (t >= 1 / 60 - EPS ? '追焦成功：騎士清楚、背景拉出速度線' : '快門太快，背景沒有流動感，試試 1/30 以下')
      : t <= 1 / 1000 + EPS ? '完全凍結：連輪子都清楚'
      : t <= 1 / 250 + EPS ? '大致清楚，有一點點模糊'
      : '拖出動態模糊，速度感出現了');
  }
  onInput([s, pan], update);
  update();
}

// ── 04 ISO 與雜訊 ──
function initIso(root: HTMLElement) {
  const scene = new Scene(q(root, '[data-scene]'), { tint: 'night' });
  const i = ctl(root, 'iso');
  const N = 2.8, t = 1 / 60, EV = 6;
  function update() {
    const iso = ISOS[+i.value];
    const diff = exposureDiff(EV, N, t, iso);
    for (const n of LAYERS) scene.setBlur(n, blurPx(50, N, 3, DIST[n]) * 0.5);
    scene.setExposure(diff);
    scene.setNoise(Math.log2(iso / 100) / 7);
    out(root, 'iso', String(iso));
    out(root, 'ev', `${diff >= 0 ? '+' : ''}${diff.toFixed(1)} EV`);
    out(root, 'status', expText(diff));
    out(root, 'grain', iso <= 400 ? '幾乎看不到雜訊' : iso <= 1600 ? '有些微雜訊，一般用途可接受' : iso <= 3200 ? '雜訊明顯，細節開始流失' : '雜訊很重，畫面變得粗糙');
    setNeedle(root, diff);
  }
  onInput([i], update);
  update();
}

// ── 05 焦段與視角 ──
function initFocal(root: HTMLElement) {
  const scene = new Scene(q(root, '[data-scene]'));
  const f = ctl(root, 'focal');
  const modeBtns = root.querySelectorAll<HTMLButtonElement>('[data-mode]');
  let dolly = false;
  function update() {
    const fmm = +f.value;
    const camD = dolly ? (3 * fmm) / 50 : 3; // 推軌變焦：相機後退讓人物大小不變
    for (const n of LAYERS) {
      const d = DIST[n];
      const off = d - 3;
      const s = d === Infinity ? fmm / 50 : (fmm / 50) * (d / (camD + off));
      scene.setScale(n, s);
      scene.setBlur(n, 0);
    }
    scene.svgs.near.classList.toggle('hidden', dolly);
    const fov = (2 * Math.atan(36 / (2 * fmm)) * 180) / Math.PI;
    out(root, 'focal', `${fmm} mm`);
    out(root, 'fov', `${fov.toFixed(0)}°`);
    out(root, 'type', fmm < 35 ? '廣角' : fmm <= 60 ? '標準' : fmm <= 135 ? '中望遠' : '望遠');
    out(root, 'distance', `相機距離人物 ${camD.toFixed(1)} m`);
    const half = (fov / 2) * (Math.PI / 180);
    const L = 150;
    q(root, '[data-cone]').setAttribute('d', `M100 175 L${100 - Math.sin(half) * L} ${175 - Math.cos(half) * L} A${L} ${L} 0 0 1 ${100 + Math.sin(half) * L} ${175 - Math.cos(half) * L} Z`);
  }
  modeBtns.forEach((btn) => btn.addEventListener('click', () => {
    dolly = btn.dataset.mode === 'dolly';
    modeBtns.forEach((b) => b.classList.toggle('lab-chip-on', b === btn));
    root.querySelectorAll('[data-dolly-only]').forEach((e) => e.classList.toggle('hidden', !dolly));
    update();
  }));
  onInput([f], update);
  update();
}

// ── 06 呼吸效應 ──
function initBreathing(root: HTMLElement) {
  const scene = new Scene(q(root, '[data-scene]'));
  scene.moving = false;
  scene.moverX = 600;
  scene.placeMover();
  const focus = ctl(root, 'focus');
  const lensBtns = root.querySelectorAll<HTMLButtonElement>('[data-lens]');
  const rackBtn = q<HTMLButtonElement>(root, '[data-rack]');
  let k = 0.1; // 呼吸強度：一般相機鏡頭明顯、電影鏡頭幾乎沒有
  let racking = 0;

  const focusM = () => 0.8 * 40 ** (+focus.value / 100);
  function update() {
    const s = focusM();
    const breathe = 1 + k * (0.8 / s);
    for (const n of LAYERS) { scene.setScale(n, breathe); scene.setBlur(n, blurPx(50, 1.4, s, DIST[n]) * 0.5); }
    out(root, 'focus', fmtM(s));
    out(root, 'zoom', `畫面放大 +${((breathe - 1) * 100).toFixed(1)}%`);
  }
  lensBtns.forEach((btn) => btn.addEventListener('click', () => {
    k = btn.dataset.lens === 'cine' ? 0.008 : 0.1;
    lensBtns.forEach((b) => b.classList.toggle('lab-chip-on', b === btn));
    update();
  }));
  // 自動來回拉焦：在花（1m）與樹（9m）之間緩慢移動
  rackBtn.addEventListener('click', () => {
    if (racking) { cancelAnimationFrame(racking); racking = 0; rackBtn.textContent = '▶ 自動拉焦'; return; }
    rackBtn.textContent = '■ 停止';
    const v1 = (100 * Math.log(1 / 0.8)) / Math.log(40), v2 = (100 * Math.log(9 / 0.8)) / Math.log(40);
    const start = performance.now();
    const step = (now: number) => {
      const p = (Math.sin(((now - start) / 2600) * Math.PI) + 1) / 2;
      focus.value = String(v1 + (v2 - v1) * p);
      update();
      racking = requestAnimationFrame(step);
    };
    racking = requestAnimationFrame(step);
  });
  onInput([focus], update);
  update();
}

const INIT: Record<string, (root: HTMLElement) => void> = {
  exposure: initExposure, dof: initDof, shutter: initShutter, iso: initIso, focal: initFocal, breathing: initBreathing,
};

export function initPhotoLab() {
  document.querySelectorAll<HTMLElement>('[data-lab]').forEach((root) => INIT[root.dataset.lab!]?.(root));
  requestAnimationFrame(loop);
}
