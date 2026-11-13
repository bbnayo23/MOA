// Runnable check for walking around furniture: `pnpm check`
import assert from 'node:assert/strict';
import { findPath, isClear, isFree, type Footprint } from '../src/world/path.ts';

const N = 8;
const table: Footprint = { tx: 4, ty: 4, r: 0.6 };
const near = (p: { tx: number; ty: number }, q: { tx: number; ty: number }, d: number) => Math.hypot(p.tx - q.tx, p.ty - q.ty) <= d;
const walkable = (from: { tx: number; ty: number }, path: { tx: number; ty: number }[], blocks: Footprint[]) =>
  path.every((p, i) => isClear(i ? path[i - 1] : from, p, N, blocks));

// open floor: one straight step
assert.deepEqual(findPath({ tx: 1, ty: 1 }, { tx: 6, ty: 2 }, N, [table]), [{ tx: 6, ty: 2 }]);

// table in the way: go around it and still arrive exactly
const a = { tx: 2, ty: 4 }, b = { tx: 6, ty: 4 };
const around = findPath(a, b, N, [table]);
assert.ok(around.length > 1 && walkable(a, around, [table]), 'detours around the table');
assert.deepEqual(around.at(-1), b);

// asked to stand inside the table: stop right next to it instead
const blocked = findPath(a, { tx: 4, ty: 4 }, N, [table]);
assert.ok(isFree(blocked.at(-1)!, N, [table]) && near(blocked.at(-1)!, table, table.r + 0.3), 'stops at the edge');

// off the map: walk to the nearest edge
const off = findPath({ tx: 4, ty: 6 }, { tx: 4, ty: 12 }, N, []);
assert.ok(isFree(off.at(-1)!, N, []) && off.at(-1)!.ty > N - 0.6, 'stops at the map edge');

// walled in: get as close as possible, never through the wall
const wall: Footprint[] = [0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5].map((ty) => ({ tx: 5, ty, r: 0.55 }));
const walled = findPath({ tx: 2, ty: 4 }, { tx: 7, ty: 4 }, N, wall);
assert.ok(walled.at(-1)!.tx < 5 && walkable({ tx: 2, ty: 4 }, walled, wall), 'stays on its side of the wall');

console.log('path rules ok');
