import {
  Object3D,
  Vector3,
} from './three.js';

// The "room-scale" space where the player stands

class Room extends Object3D {
  constructor() {
    super();
    this.aux = new Vector3();
    this.direction = new Vector3();
    this.reset();
  }

  onAnimationTick({ delta }) {
    const {
      destination,
      direction,
      position,
      speed,
    } = this;
    if (!destination) return;
    const step = speed * delta;
    const distance = destination.distanceTo(position);
    if (distance <= step) {
      position.copy(destination);
      delete this.destination;
      return;
    }
    position.addScaledVector(direction, step);
  }

  reset() {
    const { position, rotation } = this;
    delete this.destination;
    position.set(0, 0, 0);
    rotation.set(0, 0, 0);
  }

  translocate({ camera, point }) {
    const { aux, direction, position } = this;
    aux
      .setFromMatrixPosition(camera.matrixWorld)
      .subVectors(point, aux.set(
        aux.x - position.x,
        0,
        aux.z - position.z
      ));
    this.destination = aux;
    this.speed = Math.max(aux.distanceTo(position) / 0.2, 2);
    direction
      .copy(aux)
      .sub(position)
      .normalize();
  }
}

export default Room;
