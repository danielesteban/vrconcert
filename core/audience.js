import {
  InstancedMesh,
  Object3D,
  Vector3,
} from './three.js';

// Intances an audience mesh across floor planes

class Audience extends InstancedMesh {
  static randomPointInMesh({ geometry, matrixWorld }) {
    const index = geometry.getIndex();
    const vertices = geometry.getAttribute('position');
    const triangle = Math.floor(Math.random() * index.count / 3);
    const offset = triangle * 3;
    const vertexA = (
      new Vector3(
        vertices.getX(index.getX(offset)),
        vertices.getY(index.getX(offset)),
        vertices.getZ(index.getX(offset))
      )
    ).applyMatrix4(matrixWorld);
    const vertexB = (
      new Vector3(
        vertices.getX(index.getX(offset + 1)),
        vertices.getY(index.getX(offset + 1)),
        vertices.getZ(index.getX(offset + 1))
      )
    ).applyMatrix4(matrixWorld);
    const vertexC = (
      new Vector3(
        vertices.getX(index.getX(offset + 2)),
        vertices.getY(index.getX(offset + 2)),
        vertices.getZ(index.getX(offset + 2))
      )
    ).applyMatrix4(matrixWorld);
    const edgeAB = vertexB.sub(vertexA);
    const edgeAC = vertexC.sub(vertexA);
    const lenAB = edgeAB.length() * 2;
    const lenAC = edgeAC.length() * 2;
    let r = Math.floor(Math.random() * (lenAB + 1)) / lenAB;
    let s = Math.floor(Math.random() * (lenAC + 1)) / lenAC;
    if (r + s >= 1) {
      r = 1 - r;
      s = 1 - s;
    }
    return edgeAB.multiplyScalar(r).add(edgeAC.multiplyScalar(s)).add(vertexA);
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
    super(geometry, material, mesh.count);
    this.instances = [];
    for (let i = 0; i < mesh.count; i += 1) {
      const instance = new Object3D();
      instance.position.copy(
        Audience.randomPointInMesh(
          planes[Math.floor(Math.random() * planes.length)]
        )
      );
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
      this.instances.push(instance);
      this.setMatrixAt(i, instance.matrix);
    }
    this.instanceMatrix.needsUpdate = true;
    this.frustumCulled = false;
  }

  update({ animation, amplitudes }) {
    const { instances } = this;
    instances.forEach((instance, i) => {
      const amplitude = amplitudes.get(instance.band);
      instance.scale.y = instance.baseScale.y * (0.75 + amplitude * 0.25);
      instance.updateMatrix();
      this.setMatrixAt(i, instance.matrix);
    });
    this.instanceMatrix.needsUpdate = true;
  }
}

export default Audience;
