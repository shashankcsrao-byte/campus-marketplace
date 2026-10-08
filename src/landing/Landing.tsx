import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router';
import './engine/scrollcraft.js';
import './landing.css';
import { CATEGORIES, type Category } from '../utils/constants';
import { formatPrice } from '../utils/format';
import { DEFAULT_FILTERS } from '../utils/filters';
import { getCategoryCounts, getListings } from '../services/listingService';
import CategoryIcon, { CATEGORY_SLUG } from '../components/listings/CategoryIcon';
import ListingImage from '../components/listings/ListingImage';
import { buttonClasses } from '../components/ui/Button';
import { ArrowRightIcon, ChatIcon, HeartIcon, MapPinIcon, PlusIcon, UploadIcon } from '../components/ui/Icons';
import { CATEGORY_SHAPE, SHAPES, blob, morph, pathFrom } from './shapes';
import type { ListingWithSeller } from '../types';

/* ============================================================================
   Campus Marketplace landing ("Toybox" grammar, see scrollcraft/builds/
   campus-landing/BRIEF.md). Six distinct scenes on Material 3 colour grounds,
   hard cuts between them. The engine drives cues, pins, the pan and the
   reveal; everything bespoke (hero depth + pointer, the tidy-up, the drawn
   path) runs in one rAF loop below that reads each act's --sc-p.
   ========================================================================== */

const color = (c: Category, role: 'bright' | 'container' | '' = 'bright') =>
  `var(--color-cat-${CATEGORY_SLUG[c]}${role ? '-' + role : ''})`;
const onContainer = (c: Category) => `var(--color-on-cat-${CATEGORY_SLUG[c]}-container)`;
const readP = (el: Element | null) => (el ? parseFloat((el as HTMLElement).style.getPropertyValue('--sc-p')) || 0 : 0);
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const backOut = (t: number) => {
  const c1 = 1.55, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/* A category sticker: Material shape in the category's custom colour, ink
   outline, offset shadow, icon in the on-container colour. */
function Sticker({ category, shape, size, style, className = '', faceRef, fill, elRef }: {
  category: Category;
  shape?: string;
  size: number | string;
  style?: CSSProperties;
  className?: string;
  faceRef?: (el: SVGPathElement | null) => void;
  fill?: string;
  elRef?: (el: HTMLSpanElement | null) => void;
}) {
  const d = shape ?? pathFrom(CATEGORY_SHAPE[category]);
  return (
    <span ref={elRef} className={`lp-sticker ${className}`} style={{ '--s': typeof size === 'number' ? `${size}px` : size, ...style } as CSSProperties} aria-hidden="true">
      <svg viewBox="0 0 100 100">
        <path className="lp-sticker__shadow" d={d} />
        <path className="lp-sticker__face" d={d} fill={fill ?? color(category)} ref={faceRef} />
      </svg>
      <span className="lp-sticker__icon" style={{ color: onContainer(category) }}>
        <CategoryIcon category={category} className="" />
      </span>
    </span>
  );
}

/* Hero sticker layout: desktop x/y and phone x/y (percent of the stage). */
const HERO_MID: { c: Category; x: number; y: number; mx: number; my: number; s: number; r: number; phone?: boolean }[] = [
  { c: 'Electronics', x: 64, y: 17, mx: 66, my: 74, s: 140, r: -8, phone: true },
  { c: 'Vehicles', x: 82, y: 33, mx: 6, my: 79, s: 156, r: 6, phone: true },
  { c: 'Books', x: 57, y: 47, mx: 38, my: 84, s: 124, r: 10, phone: true },
  { c: 'Clothing', x: 74, y: 58, mx: 0, my: 0, s: 136, r: -12 },
  { c: 'Sports', x: 56, y: 72, mx: 0, my: 0, s: 108, r: 14 },
  { c: 'Hostel Essentials', x: 87, y: 66, mx: 0, my: 0, s: 104, r: -6 },
  { c: 'Academic', x: 43, y: 79, mx: 0, my: 0, s: 92, r: 8 },
  { c: 'Accessories', x: 70, y: 80, mx: 0, my: 0, s: 88, r: -10 },
];

/* Tidy-up: where each item lies on the "floor" before it is put away
   (fractions of the free floor region), its tilt, and when it starts moving. */
const SCATTER: { fx: number; fy: number; r: number }[] = [
  { fx: 0.62, fy: 0.08, r: -28 }, { fx: 0.14, fy: 0.62, r: 32 }, { fx: 0.83, fy: 0.55, r: -14 },
  { fx: 0.36, fy: 0.3, r: 46 }, { fx: 0.92, fy: 0.14, r: 18 }, { fx: 0.05, fy: 0.24, r: -40 },
  { fx: 0.5, fy: 0.72, r: 24 }, { fx: 0.72, fy: 0.86, r: -52 }, { fx: 0.27, fy: 0.95, r: 12 },
  { fx: 0.46, fy: 0.42, r: -20 },
];
const ORDER = [3, 0, 7, 5, 1, 9, 4, 8, 2, 6]; // landing order: feels hand-tidied, not left-to-right
const START = ORDER.map((_, i) => 0.14 + ORDER.indexOf(i) * 0.05);
const DUR = 0.3;

const SCENES = [
  { id: 'lp-start', label: 'Start', chip: 'var(--color-m3-surface-container-highest)' },
  { id: 'lp-chat', label: 'The problem', chip: 'var(--color-m3-outline-variant)' },
  { id: 'lp-tidy', label: 'Tidy-up', chip: 'var(--color-m3-primary-container)' },
  { id: 'lp-fresh', label: 'Fresh drops', chip: 'var(--color-m3-secondary-container)' },
  { id: 'lp-how', label: 'How it works', chip: 'var(--color-sun)' },
  { id: 'lp-join', label: 'Join', chip: 'var(--color-m3-primary)' },
];

export default function Landing({ onBrowse }: { onBrowse: () => void }) {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<{ layout: () => void; destroy: () => void } | null>(null);
  const [counts, setCounts] = useState<Partial<Record<Category, number>> | null>(null);
  const [fresh, setFresh] = useState<ListingWithSeller[] | null>(null);
  const [active, setActive] = useState('lp-start');
  const [railVisible, setRailVisible] = useState(false);

  // Live data: real counts and the newest real listings. Nothing invented.
  useEffect(() => {
    let alive = true;
    getCategoryCounts().then((c) => alive && setCounts(c)).catch(() => alive && setCounts({}));
    getListings(DEFAULT_FILTERS, 0, 5).then((r) => alive && setFresh(r.data)).catch(() => alive && setFresh([]));
    return () => { alive = false; };
  }, []);

  // Mount the engine on this subtree; tear it down on route change.
  useEffect(() => {
    const api = window.ScrollCraft.mount(rootRef.current!);
    engineRef.current = api;
    document.fonts?.ready.then(() => api.layout());
    return () => { api.destroy(); engineRef.current = null; };
  }, []);
  // The rail's width depends on the listings, so re-measure once they land.
  useEffect(() => { engineRef.current?.layout(); }, [fresh]);

  /* ------------------------------------------------ bespoke motion loop -- */
  const heroAct = useRef<HTMLElement>(null);
  const planes = useRef<(HTMLDivElement | null)[]>([]);
  const heroCopy = useRef<HTMLDivElement>(null);
  const tidyAct = useRef<HTMLElement>(null);
  const tidyStage = useRef<HTMLDivElement>(null);
  const items = useRef<(HTMLSpanElement | null)[]>([]);
  const faces = useRef<(SVGPathElement | null)[]>([]);
  const slots = useRef<(HTMLButtonElement | null)[]>([]);
  const howAct = useRef<HTMLElement>(null);
  const howInk = useRef<SVGPathElement>(null);
  const howBase = useRef<SVGPathElement>(null);
  const howSvg = useRef<SVGSVGElement>(null);
  const badges = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const reduce = window.ScrollCraft.reduce;
    const fine = matchMedia('(hover: hover) and (pointer: fine)');
    const blobs = CATEGORIES.map((_, i) => blob(i * 1.7 + 0.4));
    let raf = 0;
    let running = true;
    let pointer = { x: 0, y: 0 }; // -0.5..0.5 target
    let lean = { x: 0, y: 0 };
    let geo: { size: number; start: { x: number; y: number }[]; end: { x: number; y: number }[] } | null = null;
    let pathLen = 0;
    const lastT: number[] = CATEGORIES.map(() => -1);

    function measureTidy() {
      const stage = tidyStage.current;
      if (!stage) return;
      const sr = stage.getBoundingClientRect();
      const phone = innerWidth < 768;
      const size = phone ? Math.min(56, sr.width * 0.14) : Math.min(92, sr.width * 0.07);
      const shelf = slots.current[0]?.getBoundingClientRect();
      const navH = phone ? 124 : 68;
      const floorTop = navH + (phone ? 64 : 84);
      const floorBottom = Math.max(floorTop + 80, (shelf ? shelf.top - sr.top : sr.height * 0.55) - size * 0.55);
      const start = SCATTER.map((s) => ({
        x: 16 + s.fx * (sr.width - size - 32),
        y: floorTop + s.fy * (floorBottom - floorTop),
      }));
      const end = slots.current.map((slot) => {
        if (!slot) return { x: 0, y: 0 };
        const r = slot.getBoundingClientRect();
        return phone
          ? { x: r.left - sr.left + 10, y: r.top - sr.top + (r.height - size) / 2 }
          : { x: r.left - sr.left + (r.width - size) / 2, y: r.top - sr.top + 10 };
      });
      geo = { size, start, end };
      items.current.forEach((el) => el?.style.setProperty('--s', `${size}px`));
      slots.current.forEach((el) => el?.style.setProperty('--s', `${size}px`));
      lastT.fill(-1);
    }

    function measureHow() {
      const svg = howSvg.current;
      if (!svg) return;
      const box = svg.getBoundingClientRect();
      const pts = badges.current.map((b) => {
        const r = b?.getBoundingClientRect();
        return r ? { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2 } : { x: 0, y: 0 };
      });
      if (pts.length < 3) return;
      const [a, b, c] = pts;
      const d = `M${a.x} ${a.y} C ${a.x + 140} ${a.y + 10}, ${b.x - 160} ${b.y - 40}, ${b.x} ${b.y} S ${c.x + 160} ${c.y - 60}, ${c.x} ${c.y}`;
      svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
      howBase.current?.setAttribute('d', d);
      howInk.current?.setAttribute('d', d);
      pathLen = howInk.current?.getTotalLength() ?? 0;
      if (howInk.current) howInk.current.style.strokeDasharray = `${pathLen}`;
    }

    function frame() {
      raf = 0;
      if (!running) return;

      // Hero: planes separate at different rates; the world leans toward the pointer.
      const hp = reduce ? 0 : readP(heroAct.current);
      lean.x += (pointer.x - lean.x) * 0.08;
      lean.y += (pointer.y - lean.y) * 0.08;
      const rates = [
        { s: 50, l: 10 },
        { s: 150, l: 22 },
        { s: 300, l: 38 },
      ];
      planes.current.forEach((pl, i) => {
        if (!pl) return;
        const r = rates[i];
        pl.style.transform = `translate3d(${(lean.x * r.l).toFixed(1)}px, ${(-hp * r.s + lean.y * r.l).toFixed(1)}px, 0)`;
      });
      if (heroCopy.current) heroCopy.current.style.transform = `scale(${(1 - hp * 0.05).toFixed(4)})`;

      // The tidy-up: each item flies from the floor to its shelf, overshoots,
      // settles, and its blob becomes its category's Material shape.
      if (geo) {
        const p = reduce ? 1 : readP(tidyAct.current);
        CATEGORIES.forEach((c, i) => {
          const el = items.current[i];
          if (!el || !geo) return;
          const t = clamp01((p - START[i]) / DUR);
          if (t === lastT[i]) return;
          lastT[i] = t;
          const e = backOut(t);
          const s = geo.start[i], f = geo.end[i];
          const x = s.x + (f.x - s.x) * e;
          const y = s.y + (f.y - s.y) * e - Math.sin(t * Math.PI) * 60;
          const rot = SCATTER[i].r * (1 - easeOut(t));
          const sc = 1.45 - 0.45 * easeOut(t);
          el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${rot.toFixed(1)}deg) scale(${sc.toFixed(3)})`;
          const d = morph(blobs[i], CATEGORY_SHAPE[c], easeOut(t));
          faces.current[i]?.setAttribute('d', d);
          (faces.current[i]?.previousSibling as SVGPathElement | null)?.setAttribute('d', d);
          faces.current[i]?.setAttribute('fill', t > 0.55 ? color(c) : color(c, 'container'));
          const slot = slots.current[i];
          if (slot) {
            slot.style.setProperty('--lit', clamp01((t - 0.75) / 0.25).toFixed(3));
            if (t >= 1) slot.setAttribute('data-landed', '');
            else slot.removeAttribute('data-landed');
          }
        });
      }

      // How it works: the route draws itself as the section passes.
      if (howInk.current && pathLen) {
        const k = reduce ? 1 : clamp01((readP(howAct.current) - 0.18) / 0.42);
        howInk.current.style.strokeDashoffset = `${(pathLen * (1 - k)).toFixed(1)}`;
      }

      raf = requestAnimationFrame(frame);
    }

    const onPointer = (e: PointerEvent) => {
      if (!fine.matches || reduce) return;
      pointer = { x: e.clientX / innerWidth - 0.5, y: e.clientY / innerHeight - 0.5 };
    };
    const relayout = () => { measureTidy(); measureHow(); };
    const ro = new ResizeObserver(relayout);
    if (tidyStage.current) ro.observe(tidyStage.current);
    if (howSvg.current) ro.observe(howSvg.current);
    document.fonts?.ready.then(relayout);
    relayout();

    // Run only while the landing is on screen.
    const io = new IntersectionObserver(([entry]) => {
      running = entry.isIntersecting;
      if (running && !raf) raf = requestAnimationFrame(frame);
    });
    if (rootRef.current) io.observe(rootRef.current);
    // The chip rail belongs to the landing: show it only while the landing still
    // fills the middle of the screen, so it never sits on top of the listings.
    const railIo = new IntersectionObserver(([entry]) => setRailVisible(entry.isIntersecting), { rootMargin: '-50% 0px -50% 0px' });
    if (rootRef.current) railIo.observe(rootRef.current);
    addEventListener('pointermove', onPointer, { passive: true });
    raf = requestAnimationFrame(frame);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      railIo.disconnect();
      removeEventListener('pointermove', onPointer);
    };
  }, []);

  // Which scene is current (for the chip rail).
  useEffect(() => {
    const els = SCENES.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: '-45% 0px -45% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const jump = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    window.scrollTo({ top: el.getBoundingClientRect().top + scrollY, behavior: window.ScrollCraft.reduce ? 'auto' : 'smooth' });
  }, []);

  const openCategory = (c: Category) => {
    navigate(`/?category=${encodeURIComponent(c)}`);
    window.scrollTo({ top: 0 });
  };

  /* ------------------------------------------------------------- markup -- */
  return (
    <div className="lp" ref={rootRef}>
      {/* 1 · HERO: three planes, pointer lean, headline between planes */}
      <section id="lp-start" ref={heroAct} className="lp-hero" data-sc-act="pin" data-sc-span="1.7">
        <div data-sc-stage>
          <div className="lp-hero__plane" ref={(el) => { planes.current[0] = el; }} aria-hidden="true">
            <span className="lp-hero__blob" style={{ width: '46vw', height: '46vw', right: '-12vw', top: '-8vw', background: 'var(--color-m3-primary-container)', opacity: 0.16 }} />
            <span className="lp-hero__blob" style={{ width: '30vw', height: '30vw', left: '-10vw', bottom: '-12vw', background: 'var(--color-sun)', opacity: 0.35 }} />
            <span className="lp-hero__blob" style={{ width: '18vw', height: '18vw', left: '46vw', top: '58%', background: 'var(--color-m3-secondary-container)', opacity: 0.45 }} />
          </div>

          <div className="lp-hero__plane" ref={(el) => { planes.current[1] = el; }}>
            {HERO_MID.map((h) => (
              <button
                key={h.c}
                type="button"
                onClick={() => openCategory(h.c)}
                aria-label={`Browse ${h.c}`}
                className={`lp-hop lp-hero__sticker ${h.phone ? '' : 'max-md:hidden'}`}
                style={{ '--x': `${h.x}%`, '--y': `${h.y}%`, '--mx': `${h.mx}%`, '--my': `${h.my}%`, '--hs': `${h.s}px` } as CSSProperties}
              >
                <Sticker category={h.c} size="var(--hs)" style={{ position: 'relative', transform: `rotate(${h.r}deg)` }} />
              </button>
            ))}
          </div>

          <div className="lp-wrap lp-hero__copy" data-sc-cue="0 0.82 0">
            <div className="lp-hero__copy-inner" ref={heroCopy}>
              <h1 className="text-m3-on-surface">Everything you need is already on campus.</h1>
              <p className="mt-5 max-w-md text-lg font-semibold text-m3-on-surface-variant sm:text-xl">
                Buy and sell with students near you. Chat in the app, meet on campus, pay in person.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button type="button" onClick={onBrowse} className={buttonClasses('primary', 'lg', '!bg-m3-primary hover:!bg-brand-700')}>
                  Browse listings <ArrowRightIcon className="size-5" />
                </button>
                <Link to="/register?redirect=%2Fcreate" className={buttonClasses('secondary', 'lg', '!bg-m3-surface-container-lowest')}>
                  <PlusIcon className="size-5" /> Sell an item
                </Link>
              </div>
            </div>
          </div>

          <div className="lp-hero__plane" ref={(el) => { planes.current[2] = el; }} aria-hidden="true">
            <span className="lp-tag lp-hero__sticker rounded-2xl rounded-bl-sm bg-m3-surface-container-lowest px-4 py-2 text-base text-m3-on-surface max-md:hidden" style={{ '--x': '72%', '--y': '12%', rotate: '-4deg' } as CSSProperties}>
              Is it still available?
            </span>
            <span className="lp-tag lp-hero__sticker rounded-xl bg-sun px-3 py-1 text-2xl text-ink" style={{ '--x': '57%', '--y': '31%', '--mx': '72%', '--my': '64%', rotate: '8deg' } as CSSProperties}>₹350</span>
            <span className="lp-tag lp-hero__sticker grid size-14 place-items-center rounded-full bg-bubblegum text-ink" style={{ '--x': '47%', '--y': '64%', '--mx': '79%', '--my': '84%', rotate: '-10deg' } as CSSProperties}>
              <HeartIcon filled className="size-7" />
            </span>
            <span className="lp-tag lp-hero__sticker rounded-xl border-red-700 bg-white/90 px-3 py-1 text-xl tracking-[0.2em] text-red-700 max-md:hidden" style={{ '--x': '84%', '--y': '84%', rotate: '-12deg', boxShadow: '3px 4px 0 0 #b91c1c' } as CSSProperties}>
              SOLD!
            </span>
          </div>
        </div>
      </section>

      {/* 2 · THE PROBLEM: quiet. One line assembles; a post sinks. */}
      <section id="lp-chat" className="lp-chat" data-sc-act="flow">
        <div className="lp-wrap grid items-center gap-10 py-20 md:grid-cols-[1.2fr_1fr] md:py-28">
          <div>
            <h2 className="font-display text-4xl leading-tight font-bold text-m3-on-surface sm:text-5xl" data-sc-cue="0.12 0.95 0.18 0.1" data-sc-kinetic="lines">
              Selling in the group chat?
            </h2>
            <p className="mt-5 max-w-lg text-lg font-semibold text-m3-on-surface-variant" data-sc-cue="0.2 0.95 0.18 0.1">
              Your post sinks under good-morning stickers by lunch. Nobody can search it, and nobody knows it is already sold.
            </p>
          </div>
          <div className="lp-chat__stack" aria-hidden="true">
            <div className="lp-chat__head">
              <span className="grid size-9 place-items-center rounded-full bg-m3-secondary-container font-display font-bold text-m3-on-secondary-container">C</span>
              <span>
                <span className="block font-bold text-m3-on-surface">Class group</span>
                <span className="block text-xs font-semibold text-m3-on-surface-variant">everyone, all day</span>
              </span>
            </div>
            <div className="lp-chat__bubbles px-5 pt-5">
              <span className="lp-chat__bubble">Good morning everyone</span>
              <span className="lp-chat__bubble">Who has the DBMS notes?</span>
              <span className="lp-chat__bubble lp-chat__bubble--mine">Selling my cycle, ₹2,800. DM me</span>
              <span className="lp-chat__bubble">Good morning</span>
              <span className="lp-chat__bubble">Is the canteen open today?</span>
              <span className="lp-chat__bubble">Forwarded: motivational quote</span>
              <span className="lp-chat__bubble">Good morning to all</span>
              <span className="lp-chat__bubble">Anyone going to the fest?</span>
              <span className="lp-chat__bubble">Forwarded: good morning image</span>
              <span className="lp-chat__bubble">Good night</span>
            </div>
            <div className="lp-chat__fade" />
          </div>
        </div>
      </section>

      {/* 3 · THE TIDY-UP (peak, signature move) */}
      <section id="lp-tidy" ref={tidyAct} className="lp-tidy" data-sc-act="pin" data-sc-span="3">
        <div data-sc-stage ref={tidyStage}>
          <div className="lp-tidy__floor" aria-hidden="true" />
          <div className="lp-wrap relative" style={{ paddingTop: 'calc(var(--nav-h) + 1.5rem)' }}>
            <p className="lp-tidy__greet font-display text-2xl font-bold sm:text-4xl" data-sc-cue="0 0.3 0">
              Your stuff is all over the floor.
            </p>
            <div className="absolute top-[calc(var(--nav-h)+1.5rem)] right-[clamp(1rem,4vw,2rem)] max-w-md text-right max-md:left-[clamp(1rem,4vw,2rem)] max-md:text-left" data-sc-cue="0.72 1 0.12 0.1">
              <h2 className="font-display text-3xl leading-tight font-bold sm:text-5xl">Same stuff. Now it is a shop.</h2>
              <p className="mt-2 font-semibold opacity-90">Ten shelves, one for every kind of thing. Tap a shelf to open it.</p>
            </div>
          </div>

          <div className="lp-tidy__shelves">
            {CATEGORIES.map((c, i) => {
              const n = counts?.[c] ?? 0;
              return (
                <button
                  key={c}
                  type="button"
                  ref={(el) => { slots.current[i] = el; }}
                  onClick={() => openCategory(c)}
                  className="lp-slot"
                  aria-label={counts ? `${c}, ${n} for sale` : c}
                >
                  <span className="lp-slot__meta">
                    <span className="lp-slot__label block">{c}</span>
                    {counts && <span className="lp-slot__count block">{n} for sale</span>}
                  </span>
                </button>
              );
            })}
          </div>

          {CATEGORIES.map((c, i) => (
            <Sticker
              key={c}
              category={c}
              size={84}
              className="lp-tidy__item"
              fill={color(c, 'container')}
              shape={pathFrom(blob(i * 1.7 + 0.4))}
              faceRef={(el) => { faces.current[i] = el; }}
              elRef={(el) => { items.current[i] = el; }}
              style={{ transform: 'translate3d(-200px,-200px,0)' }}
            />
          ))}
        </div>
      </section>

      {/* 4 · FRESH DROPS: the real newest listings travel sideways */}
      <section id="lp-fresh" className="lp-fresh" data-sc-act="pan" data-sc-span="2.4">
        <div data-sc-stage>
          <div className="lp-rail" data-sc-pan="0.06">
            <div className="lp-rail__intro">
              <h2 className="font-display text-4xl leading-tight font-bold sm:text-5xl">Fresh on campus</h2>
              <p className="mt-3 text-lg font-semibold">The newest listings, live from the marketplace.</p>
            </div>
            {(fresh ?? Array.from({ length: 5 }, () => null)).map((l, i) =>
              l ? (
                <Link key={l.id} to={`/listing/${l.id}`} className="lp-card" style={{ '--i': i } as CSSProperties} data-sc-tilt="5">
                  <div className="aspect-[4/3] border-b-[2.5px] border-ink">
                    <ListingImage path={l.image_paths[0]} alt={l.title} sold={l.status === 'sold'} className="size-full" />
                  </div>
                  <div className="space-y-2 p-4">
                    <p className="line-clamp-1 font-bold">{l.title}</p>
                    <span className="inline-block rounded-lg border-2 border-ink bg-sun px-2 font-display text-lg font-bold tabular-nums">{formatPrice(l.price)}</span>
                  </div>
                </Link>
              ) : (
                <div key={i} className="lp-card animate-pulse" style={{ '--i': i } as CSSProperties} aria-hidden="true">
                  <div className="aspect-[4/3] bg-m3-surface-container-high" />
                  <div className="h-20" />
                </div>
              ),
            )}
            {fresh && fresh.length === 0 && (
              <p className="lp-rail__note text-lg font-semibold">Nothing posted yet. Be the first.</p>
            )}
            <div className="lp-rail__note">
              <p className="font-display text-2xl font-bold">Plenty more below.</p>
              <button type="button" onClick={onBrowse} className={buttonClasses('primary', 'md', 'mt-4 !bg-m3-primary')}>
                Browse listings <ArrowRightIcon className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 5 · THREE MOVES: a route draws itself through post, chat, meet */}
      <section id="lp-how" ref={howAct} className="lp-steps" data-sc-act="flow">
        <svg ref={howSvg} className="lp-steps__path" aria-hidden="true" preserveAspectRatio="none">
          <path ref={howBase} />
          <path ref={howInk} className="lp-steps__ink" />
        </svg>
        <div className="lp-wrap relative grid gap-14 py-24 md:gap-6 md:py-32" data-sc-in data-sc-stagger="80">
          <h2 className="font-display text-4xl font-bold text-m3-on-surface sm:text-5xl">Three moves. That is it.</h2>
          {[
            { icon: <UploadIcon className="size-[42%]" />, fill: 'var(--color-m3-primary-container)', ink: 'var(--color-m3-on-primary-container)', shape: SHAPES.cookie9, t: 'Post in a minute.', d: 'Add a photo, a price and a spot on campus to meet.', at: 'md:ml-[4%]' },
            { icon: <ChatIcon className="size-[42%]" />, fill: 'var(--color-sun)', ink: 'var(--color-ink)', shape: SHAPES.flower5, t: 'Chat in the app.', d: 'Only you and the buyer can read the conversation.', at: 'md:ml-[38%]' },
            { icon: <MapPinIcon className="size-[42%]" />, fill: 'var(--color-mint)', ink: 'var(--color-ink)', shape: SHAPES.clover4, t: 'Meet on campus.', d: 'Check the item, pay in person, done.', at: 'md:ml-[64%]' },
          ].map((s, i) => (
            <div key={s.t} className={`lp-step ${s.at}`}>
              <div className="lp-step__badge" ref={(el) => { badges.current[i] = el; }}>
                <svg viewBox="0 0 100 100" className="size-full overflow-visible" aria-hidden="true">
                  <path d={pathFrom(s.shape)} fill="var(--color-ink)" transform="translate(4 5)" />
                  <path d={pathFrom(s.shape)} fill={s.fill} stroke="var(--color-ink)" strokeWidth="3" />
                </svg>
                <span className="absolute inset-0 grid place-items-center" style={{ color: s.ink }} aria-hidden="true">{s.icon}</span>
              </div>
              <div>
                <h3 className="font-display text-2xl font-bold text-m3-on-surface sm:text-3xl">{s.t}</h3>
                <p className="mt-1 font-semibold text-m3-on-surface-variant">{s.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6 · CLOSE: the panel irises open and holds; the marketplace follows */}
      <section id="lp-join" className="lp-close" data-sc-act="flow">
        <div className="lp-wrap pt-6 pb-16 md:pb-24">
          <div className="lp-close__panel px-6 py-12 sm:px-12 md:py-16" data-sc-reveal="iris" data-sc-reveal-at="0.05 0.45">
            <h2 className="max-w-3xl font-display text-4xl leading-[1.02] font-bold sm:text-6xl">Your campus is open for business.</h2>
            <p className="mt-4 max-w-xl text-lg font-semibold text-m3-inverse-on-surface">Join free and post your first item tonight. Someone down the corridor needs it.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button type="button" onClick={onBrowse} className={buttonClasses('secondary', 'lg', '!bg-white !text-m3-primary')}>
                Browse listings <ArrowRightIcon className="size-5" />
              </button>
              <Link to="/register?redirect=%2Fcreate" className={buttonClasses('secondary', 'lg', '!bg-sun')}>
                <PlusIcon className="size-5" /> Sell an item
              </Link>
            </div>
            <ul className="mt-12 flex flex-wrap gap-3 sm:gap-4" aria-label="Categories">
              {CATEGORIES.map((c) => (
                <li key={c}>
                  <button type="button" onClick={() => openCategory(c)} className="lp-hop block rounded-full" aria-label={`Browse ${c}`}>
                    <Sticker category={c} size={56} style={{ position: 'relative' }} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Colour-chip rail: one chip per scene, in that scene's colour. */}
      <nav className="lp-rail-nav" aria-label="Page sections" data-hidden={railVisible ? undefined : ''}>
        {SCENES.map((s) => (
          <button
            key={s.id}
            type="button"
            className="lp-chip"
            aria-current={active === s.id}
            onClick={() => jump(s.id)}
            tabIndex={railVisible ? 0 : -1}
          >
            <span className="lp-chip__dot" style={{ '--chip': s.chip } as CSSProperties} />
            <span className="lp-chip__label">{s.label}</span>
            <span className="sr-only">{s.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
