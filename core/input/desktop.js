import {
  Object3D,
  Raycaster,
  Vector2,
  Vector3,
} from '../three.js';

class DesktopInput {
  constructor({
    mount,
  }) {
    // Initialize state
    this.isDesktop = true;
    this.controller = new Object3D();
    this.controller.buttons = {
      trigger: false,
      grip: false,
      primary: false,
      secondary: false,
    };
    this.controller.pulse = () => {};
    this.controller.raycaster = new Raycaster();
    this.controller.visible = false;
    this.controllers = [this.controller];
    this.keyboard = {};
    this.mouse = { x: 0, y: 0 };
    this.vectors = {
      direction: new Vector3(),
      forward: new Vector3(0, 0, -1),
      right: new Vector3(1, 0, 0),
      origin: new Vector2(),
      up: new Vector3(0, 1, 0),
      worldUp: new Vector3(0, 1, 0),
    };

    // Bind input events
    document.addEventListener('pointerlockchange', this.onLockChange.bind(this), false);
    mount.addEventListener('mousedown', this.requestLock.bind(this), false);
    window.addEventListener('mousedown', this.onMouseDown.bind(this), false);
    window.addEventListener('mousemove', this.onMouseMove.bind(this), false);
    window.addEventListener('mouseup', this.onMouseUp.bind(this), false);
    window.addEventListener('keydown', this.onKeyDown.bind(this), false);
    window.addEventListener('keyup', this.onKeyUp.bind(this), false);

    // Mount crosshair
    const crosshair = document.createElement('div');
    crosshair.id = 'crosshair';
    for (let i = 0; i < 2; i += 1) {
      crosshair.appendChild(document.createElement('div'));
    }
    mount.appendChild(crosshair);

    // Mount hint
    if (!navigator.getVRDisplays) {
      const hint = document.createElement('div');
      hint.id = 'hint';
      hint.innerText = 'Start the Show';
      mount.appendChild(hint);
      this.hint = hint;
    }
  }

  onLockChange() {
    const { controller, hint } = this;
    this.isLocked = !!document.pointerLockElement;
    this.keyboard = {};
    controller.visible = this.isLocked;
    if (hint) {
      hint.parentNode.removeChild(hint);
      delete this.hint;
    }
  }

  onMouseDown({ button }) {
    const { controller: { buttons }, isLocked } = this;
    if (!isLocked) {
      return;
    }
    switch (button) {
      default: // Primary button
        buttons.trigger = true;
        buttons.triggerDown = true;
        break;
      case 2: // Secondary button
        buttons.secondary = true;
        buttons.secondaryDown = true;
        break;
      case 1: // Middle button
        buttons.primary = true;
        buttons.primaryDown = true;
        break;
    }
  }

  onMouseMove({ movementX, movementY }) {
    const { isLocked, mouse } = this;
    if (!isLocked) {
      return;
    }
    mouse.x += movementX;
    mouse.y += movementY;
  }

  onMouseUp({ button }) {
    const { controller: { buttons }, isLocked } = this;
    if (!isLocked) {
      return;
    }
    switch (button) {
      default: // Primary button
        buttons.trigger = false;
        buttons.triggerUp = true;
        break;
      case 2: // Secondary button
        buttons.secondary = false;
        buttons.secondaryUp = true;
        break;
      case 1: // Middle button
        buttons.primary = false;
        buttons.primaryUp = true;
        break;
    }
  }

  onKeyDown({ keyCode, repeat }) {
    const { keyboard } = this;
    if (repeat) {
      return;
    }
    switch (keyCode) {
      case 87: // W
        keyboard.forwards = true;
        break;
      case 83: // S
        keyboard.backwards = true;
        break;
      case 65: // A
        keyboard.leftwards = true;
        break;
      case 68: // D
        keyboard.rightwards = true;
        break;
      case 16: // Shift
        keyboard.downwards = true;
        break;
      case 32: // Spacebar
        keyboard.upwards = true;
        break;
      default:
        break;
    }
  }

  onKeyUp({ keyCode }) {
    const { keyboard } = this;
    switch (keyCode) {
      case 87: // W
        keyboard.forwards = false;
        break;
      case 83: // S
        keyboard.backwards = false;
        break;
      case 65: // A
        keyboard.leftwards = false;
        break;
      case 68: // D
        keyboard.rightwards = false;
        break;
      case 16: // Shift
        keyboard.downwards = false;
        break;
      case 32: // Spacebar
        keyboard.upwards = false;
        break;
      default:
        break;
    }
  }

  requestLock() {
    const { isLocked } = this;
    if (!isLocked) {
      document.body.requestPointerLock();
    }
  }

  update({ animation: { delta }, camera, room }) {
    const {
      controller,
      isLocked,
      mouse,
      keyboard,
      vectors: {
        direction,
        forward,
        right,
        origin,
        up,
        worldUp,
      },
    } = this;

    if (!isLocked) {
      return;
    }

    // Mouse look
    if (mouse.x || mouse.y) {
      const sensitivity = 0.003;
      camera.rotation.y -= mouse.x * sensitivity;
      camera.rotation.x -= mouse.y * sensitivity;
      camera.rotation.x = Math.min(Math.max(camera.rotation.x, Math.PI * -0.5), Math.PI * 0.5);
      camera.updateMatrixWorld();
      camera.getWorldDirection(forward);
      right.crossVectors(forward, worldUp).normalize();
      up.crossVectors(right, forward).normalize();
      mouse.x = 0;
      mouse.y = 0;
    }

    // Move around
    if (
      keyboard.forwards
      || keyboard.backwards
      || keyboard.leftwards
      || keyboard.rightwards
      || keyboard.downwards
      || keyboard.upwards
    ) {
      direction.set(0, 0, 0);
      if (keyboard.forwards) {
        direction.add(forward);
      }
      if (keyboard.backwards) {
        direction.sub(forward);
      }
      if (keyboard.leftwards) {
        direction.sub(right);
      }
      if (keyboard.rightwards) {
        direction.add(right);
      }
      if (keyboard.downwards) {
        direction.sub(up);
      }
      if (keyboard.upwards) {
        direction.add(up);
      }
      direction.normalize();
      room.position.addScaledVector(direction, delta * 4);
      if (room.position.y < 0) {
        room.position.y = 0;
      }
    }

    // Update raycaster
    controller.raycaster.far = 32;
    controller.raycaster.setFromCamera(origin, camera);
  }
}

export default DesktopInput;
