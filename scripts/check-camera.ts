// Runnable check for the camera's zoom maths: `pnpm check`
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { clampCenter, clampZoom, groundAt, place } from '../src/world/camera.ts';

const cam = new THREE.PerspectiveCamera(32, 16 / 10, 0.5, 200);
cam.updateProjectionMatrix();
const look = new THREE.Vector3(9, 0.6, 9);

// zooming "at the cursor": move the look point by how far the ground under the
// cursor slid, and that ground point stays under the cursor
const cursor = new THREE.Vector2(0.55, -0.35);
place(cam, look, 16);
const before = groundAt(cam, cursor)!.clone();
place(cam, look, 16 / 1.6); // zoom in to 160%
const slid = groundAt(cam, cursor)!.clone();
look.x += before.x - slid.x;
look.z += before.z - slid.z;
place(cam, look, 16 / 1.6);
const after = groundAt(cam, cursor)!;
assert.ok(after.distanceTo(before) < 1e-6, 'the point under the cursor stays put');

// zoom limits
assert.equal(clampZoom(5), 2);
assert.equal(clampZoom(0.1), 0.5);

// bounds: 3.6 in from the edge at 100%, tighter in, wider out, centred when the map fits
const S = 19.2, M = 3.6;
assert.deepEqual(clampCenter(new THREE.Vector3(-5, 0, 30), S, 1, M).toArray(), [3.6, 0, 15.6]);
assert.deepEqual(clampCenter(new THREE.Vector3(0, 0, 0), S, 2, M).toArray(), [1.8, 0, 1.8]);
assert.deepEqual(clampCenter(new THREE.Vector3(0, 0, 19), S, 0.3, M).toArray(), [9.6, 0, 9.6]);

console.log('camera rules ok');
