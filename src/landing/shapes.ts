// Material 3 Expressive-style shapes, described as polar radius functions so any
// two of them can morph into each other: sample both at the same angles and
// interpolate the radius. Paths are drawn in a 100x100 box centred on 50,50.
import type { Category } from '../utils/constants';

export const SAMPLES = 72;
const TAU = Math.PI * 2;
const angles = Array.from({ length: SAMPLES }, (_, i) => (i / SAMPLES) * TAU - Math.PI / 2);

type Radii = number[];
const fromFn = (fn: (t: number) => number): Radii => {
  const r = angles.map(fn);
  const max = Math.max(...r);
  return r.map((v) => v / max);
};

const circle = fromFn(() => 1);
const squircle = fromFn((t) => Math.pow(Math.pow(Math.abs(Math.cos(t)), 4) + Math.pow(Math.abs(Math.sin(t)), 4), -0.25));
const cookie = (k: number, depth: number) => fromFn((t) => 1 - depth + depth * (0.5 + 0.5 * Math.cos(k * (t + Math.PI / 2))));
const flower = (k: number) => fromFn((t) => 0.72 + 0.28 * Math.pow(Math.abs(Math.cos((k * (t + Math.PI / 2)) / 2)), 0.6));
const softPolygon = (k: number, round: number) =>
  fromFn((t) => {
    const seg = TAU / k;
    const a = ((((t + Math.PI / 2) % seg) + seg) % seg) - seg / 2;
    const poly = Math.cos(Math.PI / k) / Math.cos(a);
    return poly * (1 - round) + round;
  });
export const blob = (seed: number) =>
  fromFn((t) => 1 - 0.16 * (0.5 + 0.5 * Math.sin(3 * t + seed)) - 0.1 * (0.5 + 0.5 * Math.cos(5 * t + seed * 2.3)));

export const SHAPES = {
  circle,
  squircle,
  cookie4: cookie(4, 0.14),
  cookie6: cookie(6, 0.12),
  cookie9: cookie(9, 0.1),
  sunny: cookie(12, 0.08),
  flower5: flower(5),
  clover4: flower(4),
  pentagon: softPolygon(5, 0.28),
  triangle: softPolygon(3, 0.32),
} satisfies Record<string, Radii>;

export const CATEGORY_SHAPE: Record<Category, Radii> = {
  Electronics: SHAPES.squircle,
  Books: SHAPES.cookie4,
  Furniture: SHAPES.pentagon,
  Vehicles: SHAPES.circle,
  Clothing: SHAPES.flower5,
  Accessories: SHAPES.sunny,
  Sports: SHAPES.clover4,
  'Hostel Essentials': SHAPES.cookie6,
  Academic: SHAPES.triangle,
  Other: SHAPES.cookie9,
};

/** Path for radii r (0..1) at scale `size` (radius in the 100 box), optionally rotated. */
export function pathFrom(r: Radii, size = 46, rotate = 0): string {
  let d = '';
  for (let i = 0; i < SAMPLES; i++) {
    const a = angles[i] + rotate;
    const x = 50 + Math.cos(a) * r[i] * size;
    const y = 50 + Math.sin(a) * r[i] * size;
    d += (i ? 'L' : 'M') + x.toFixed(2) + ' ' + y.toFixed(2);
  }
  return d + 'Z';
}

/** Interpolate two shapes: t = 0 gives a, t = 1 gives b. */
export function morph(a: Radii, b: Radii, t: number, size = 46, rotate = 0): string {
  const r = a.map((v, i) => v + (b[i] - v) * t);
  return pathFrom(r, size, rotate);
}
