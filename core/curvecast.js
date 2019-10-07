import { Vector3 } from './three.js';

const maxSteps = 5;
const WorldUp = new Vector3(0, 1, 0);

const aux = new Vector3();
const steps = [...Array(maxSteps + 2)].map(() => new Vector3());

// Performs a "curved" raycast

export default function CurveCast({
  intersects,
  raycaster,
  gravity = new Vector3(0, -1, 0),
}) {
  const { far: distance, ray: { direction, origin } } = raycaster;
  const points = [];
  let stride = 0.5;
  let hit = false;
  aux.copy(origin);
  for (let i = 0; i < maxSteps; i += 1) {
    stride *= 2;
    origin.copy(aux);
    points.push(steps[i].copy(origin));
    aux
      .copy(origin)
      .addScaledVector(direction, stride)
      .addScaledVector(gravity, (stride * stride) * 0.05);
    direction
      .subVectors(aux, origin);
    raycaster.far = i === maxSteps - 1 ? distance : direction.length();
    direction.normalize();
    hit = raycaster.intersectObjects(intersects)[0] || false;
    if (hit) {
      points.push(steps[maxSteps + 1].copy(hit.point));
      break;
    }
  }
  return { hit, points };
}
