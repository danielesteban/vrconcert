import {
  InstancedMesh,
  Object3D,
  Vector3,
} from './three.js';

// Intances an audience mesh across floor planes

class Audience extends InstancedMesh {
  static extractTriangles({ geometry, matrixWorld }) {
    const index = geometry.getIndex();
    const vertices = geometry.getAttribute('position');
    const triangles = [];
    for (let i = 0; i < index.count; i += 3) {
      let vertexA = (
        new Vector3(
          vertices.getX(index.getX(i)),
          vertices.getY(index.getX(i)),
          vertices.getZ(index.getX(i))
        )
      ).applyMatrix4(matrixWorld);
      let vertexB = (
        new Vector3(
          vertices.getX(index.getX(i + 1)),
          vertices.getY(index.getX(i + 1)),
          vertices.getZ(index.getX(i + 1))
        )
      ).applyMatrix4(matrixWorld);
      let vertexC = (
        new Vector3(
          vertices.getX(index.getX(i + 2)),
          vertices.getY(index.getX(i + 2)),
          vertices.getZ(index.getX(i + 2))
        )
      ).applyMatrix4(matrixWorld);
      if (triangles.length % 2 === 1) {
        const v = vertexA;
        vertexA = vertexC;
        vertexC = vertexB;
        vertexB = v;
      }
      const edgeAB = (new Vector3()).subVectors(vertexB, vertexA);
      const edgeAC = (new Vector3()).subVectors(vertexC, vertexA);
      const edgeBC = (new Vector3()).subVectors(vertexB, vertexC);
      const lenAB = edgeAB.length();
      const lenAC = edgeAC.length();
      const lenBC = edgeBC.length();
      const s = (lenAB + lenAC + lenBC) * 0.5;
      triangles.push({
        area: Math.sqrt(s * ((s - lenAB) * (s - lenAC) * (s - lenBC))),
        edgeAB,
        edgeAC,
        vertexA,
      });
    }
    return triangles;
  }

  static randomPointInMesh({ triangles, points }, target) {
    const triangle = Math.floor(Math.random() * triangles.length);
    const {
      edgeAB,
      edgeAC,
      vertexA,
    } = triangles[triangle];
    for (let i = 0; i < 10; i += 1) {
      let r = Math.random();
      let s = Math.random();
      if (r + s >= 1) {
        r = 1 - r;
        s = 1 - s;
      }
      target
        .copy(vertexA)
        .addScaledVector(edgeAB, r)
        .addScaledVector(edgeAC, s);
      let collides = false;
      for (let p = 0; p < points.length; p += 1) {
        if (points[p].distanceTo(target) < Audience.density) {
          collides = true;
          break;
        }
      }
      if (!collides) {
        break;
      }
    }
    points.push(target);
    return target;
  }

  constructor({
    lookAt,
    mesh,
    planes,
  }) {
    if (lookAt) {
      const aux = new Vector3();
      const center = new Vector3();
      lookAt.forEach((mesh) => {
        center.add(mesh.getWorldPosition(aux));
      });
      center.multiplyScalar(1 / lookAt.length);
      lookAt = center;
    }
    const geometry = mesh.geometry.clone();
    const material = mesh.material.clone();
    let total = 0;
    const counts = planes.map(({ area }) => {
      const count = Math.floor(area * mesh.weight * (Audience.density + Math.random() * 0.2 - 0.1));
      total += count;
      return count;
    });
    super(geometry, material, total);
    this.creep = Math.floor(Math.random() * total);
    this.instances = planes.reduce((instances, plane, index) => {
      const count = counts[index];
      for (let i = 0; i < count; i += 1) {
        const instance = new Object3D();
        Audience.randomPointInMesh(plane, instance.position);
        if (lookAt) {
          instance.lookAt(lookAt);
        }
        const scaleXZ = 0.5 + Math.random();
        instance.scale.set(
          scaleXZ,
          0.5 + Math.random() * 0.75,
          scaleXZ
        );
        instance.baseScale = instance.scale.clone();
        instance.band = Math.floor(Math.random() * 4) * 2;
        instance.updateMatrix();
        this.setMatrixAt(instances.length, instance.matrix);
        instances.push(instance);
      }
      return instances;
    }, []);
    this.instanceMatrix.needsUpdate = true;
    this.frustumCulled = false;
  }

  update({ bands, player }) {
    const { creep, instances } = this;
    instances.forEach((instance, i) => {
      const amplitude = bands.get(instance.band);
      instance.scale.y = instance.baseScale.y * (0.75 + amplitude * 0.25);
      if (i === creep) {
        instance.lookAt(player);
      }
      instance.updateMatrix();
      this.setMatrixAt(i, instance.matrix);
    });
    this.instanceMatrix.needsUpdate = true;
  }
}

Audience.density = 0.75;

export default Audience;
