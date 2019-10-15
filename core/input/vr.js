import {
  BufferGeometry,
  Line,
  LineBasicMaterial,
  Matrix4,
  Object3D,
  Raycaster,
  Vector3,
} from '../three.js';
import Hand from './hand.js';

class VRInput {
  static setupPointer() {
    VRInput.pointerGeometry = (new BufferGeometry()).setFromPoints([
      new Vector3(0, 0, 0),
      new Vector3(0, 0, -1),
    ]);
    VRInput.pointerMaterial = new LineBasicMaterial({
      color: 0xffe0bd,
    });
  }

  constructor({ standingMatrix }) {
    // Setup pointer geometry & materials
    if (!VRInput.pointerGeometry || !VRInput.pointerMaterial) {
      VRInput.setupPointer();
    }

    // Initialize controllers
    this.controllers = [...Array(2)].map((v, i) => {
      const controller = new Object3D();
      controller.matrixAutoUpdate = false;
      controller.visible = false;

      controller.buttons = {
        forwards: false,
        backwards: false,
        leftwards: false,
        rightwards: false,
        trigger: false,
        grip: false,
        primary: false,
        secondary: false,
      };

      controller.fingers = {
        thumb: false,
        index: false,
        middle: false,
        packed: 0,
      };

      const hand = new Hand({ mirrored: i === 0 });
      controller.add(hand);
      controller.hand = hand;

      const pointer = new Line(
        VRInput.pointerGeometry,
        VRInput.pointerMaterial
      );
      pointer.visible = false;
      controller.add(pointer);
      controller.pointer = pointer;

      controller.pulse = ({ intensity = 0.1, time = 100 } = {}) => {
        if (controller.actuator) {
          controller.actuator.pulse(intensity, time);
        }
      };

      controller.raycaster = new Raycaster();

      return controller;
    });

    this.isVR = true;
    this.auxMatrix = new Matrix4();
    this.standingMatrix = standingMatrix;
  }

  update({ animation }) {
    const { auxMatrix, controllers, standingMatrix } = this;
    // Update controllers
    const gamepads = [...navigator.getGamepads()].filter((gamepad) => (
      gamepad
      && (
        gamepad.id === 'Daydream Controller'
        || gamepad.id === 'Gear VR Controller'
        || gamepad.id === 'Oculus Go Controller'
        || gamepad.id === 'OpenVR Gamepad'
        || gamepad.id.startsWith('Oculus Touch')
        || gamepad.id.startsWith('HTC Vive Focus')
        || gamepad.id.startsWith('Spatial Controller')
      )
    ));
    gamepads.sort((a, b) => (b.id.localeCompare(a.id)));
    controllers.forEach((controller, index) => {
      const gamepad = gamepads[index];
      controller.visible = !!gamepad && !!gamepad.pose;
      const {
        buttons,
        fingers,
        matrix,
        matrixWorld,
        hand,
        pointer,
        position,
        quaternion,
        raycaster,
        scale,
        visible,
      } = controller;
      if (!visible) {
        return;
      }
      // Update pose
      const { pose } = gamepad;
      if (!pose.hasPosition) {
        position.set(0.2, -0.6, -0.05);
      }
      if (pose.position) {
        position.fromArray(pose.position);
      }
      if (pose.orientation) {
        quaternion.fromArray(pose.orientation);
      }
      matrix.compose(position, quaternion, scale);
      matrix.premultiply(standingMatrix);
      matrix.decompose(position, quaternion, scale);
      controller.updateMatrixWorld(true);
      // Update actuator reference
      controller.actuator = (
        (gamepad.hapticActuators && gamepad.hapticActuators.length) ? (
          gamepad.hapticActuators[0]
        ) : false
      );
      // Update buttons
      const hasPad = (
        // Vive controllers have pads instead of sticks
        gamepad.id === 'OpenVR Gamepad'
        || gamepad.id.startsWith('HTC Vive Focus')
      );
      const forcePadPress = !hasPad || gamepad.buttons[0].pressed;
      [
        ['forwards', forcePadPress && gamepad.axes[1] <= -0.5],
        ['backwards', forcePadPress && gamepad.axes[1] >= 0.5],
        ['leftwards', forcePadPress && gamepad.axes[0] <= -0.5],
        ['rightwards', forcePadPress && gamepad.axes[0] >= 0.5],
        ['trigger', gamepad.buttons[gamepad.id === 'Daydream Controller' ? 0 : 1].pressed],
        ['grip', gamepad.buttons[2] && gamepad.buttons[2].pressed],
        ['primary', gamepad.buttons[3] && gamepad.buttons[3].pressed],
        ['secondary', gamepad.buttons[4] && gamepad.buttons[4].pressed],
      ].forEach(([axis, value]) => {
        buttons[`${axis}Down`] = value && buttons[axis] !== value;
        buttons[`${axis}Up`] = !value && buttons[axis] !== value;
        buttons[axis] = value;
      });
      // Update fingers
      fingers.thumb = !!gamepad.buttons[0].touched;
      fingers.index = !!gamepad.buttons[1].touched;
      fingers.middle = !!gamepad.buttons[2].touched;
      fingers.packed = (
        (fingers.thumb ? (1 << 0) : 0)
        | (fingers.index ? (1 << 1) : 0)
        | (fingers.middle ? (1 << 2) : 0)
      );
      // Animate hand
      hand.setFingers(fingers.packed);
      hand.animate({ animation });
      // Hide pointer
      pointer.visible = false;
      // Update raycaster
      raycaster.far = 32;
      auxMatrix.identity().extractRotation(matrixWorld);
      raycaster.ray.origin.setFromMatrixPosition(matrixWorld);
      raycaster.ray.direction.set(0, 0, -1).applyMatrix4(auxMatrix);
      raycaster.ray.origin.addScaledVector(raycaster.ray.direction, -0.05);
    });
  }
}

export default VRInput;
