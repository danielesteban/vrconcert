import {
  Clock,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from './three.js';
import Room from './room.js';

class Renderer {
  constructor({
    debug,
    mount,
  }) {
    // Initialize state
    this.clock = new Clock();
    this.fps = {
      count: 0,
      lastTick: this.clock.oldTime / 1000,
    };
    this.debug = debug || {};
    this.mount = mount;

    // Setup camera & room
    this.camera = new PerspectiveCamera(75, 1, 0.1, 100);
    this.camera.position.y = 1.6;
    this.camera.rotation.order = 'YXZ';
    this.scene = new Scene();
    this.room = new Room();
    this.room.add(this.camera);
    this.scene.add(this.room);

    // Setup renderer
    {
      const canvas = document.createElement('canvas');
      this.renderer = new WebGLRenderer({
        canvas,
        context: canvas.getContext('webgl2', { antialias: true }),
      });
    }
    this.renderer.gammaOutput = true;
    // this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    this.renderer.setAnimationLoop(this.onAnimationTick.bind(this));
    this.mount.appendChild(this.renderer.domElement);

    // Setup viewport resize
    window.addEventListener('resize', this.onResize.bind(this), false);
    this.onResize();

    // Setup VR
    if (navigator.getVRDisplays) {
      const { domElement, vr } = this.renderer;
      vr.enabled = true;
      navigator.getVRDisplays().then(([display]) => {
        if (display) {
          vr.setDevice(display);
        }
      });
      const requestPresent = ({ display }) => {
        if (display) {
          vr.setDevice(display);
        } else {
          display = vr.getDevice();
        }
        if (!display || vr.isPresenting()) return;
        display.requestPresent([{ source: domElement }]);
      };
      mount.addEventListener('mousedown', requestPresent, false);
      mount.addEventListener('touchstart', requestPresent, false);
      window.addEventListener('vrdisplayactivate', requestPresent, false);

      if (debug.support) {
        debug.support.className = 'supported';
        debug.support.innerText = 'webvr is supported';
      }
      const hint = document.createElement('div');
      hint.id = 'hint';
      hint.innerText = 'Enter VR';
      mount.appendChild(hint);
    } else if (debug.support) {
      debug.support.className = 'unsupported';
      debug.support.innerText = 'webvr is not supported';
    }
  }

  onAnimationTick() {
    const {
      camera,
      clock,
      debug,
      fps,
      renderer,
      room,
      scene,
    } = this;

    // Store the frame timings into the renderer
    // So that they are accesible from onBeforeRender
    renderer.animation = {
      delta: Math.min(clock.getDelta(), 1 / 30),
      time: clock.oldTime / 1000,
    };
    room.onAnimationTick(renderer.animation);

    // Render scene
    renderer.render(scene, camera);

    // Output debug info
    fps.count += 1;
    if (renderer.animation.time >= fps.lastTick + 1) {
      renderer.fps = Math.round(fps.count / (renderer.animation.time - fps.lastTick));
      fps.lastTick = renderer.animation.time;
      fps.count = 0;
      if (debug.fps && !renderer.vr.isPresenting()) {
        debug.fps.innerText = `${renderer.fps}fps`;
      }
    }
  }

  onResize() {
    const {
      camera,
      mount,
      renderer,
    } = this;

    // Resize viewport
    const { width, height } = mount.getBoundingClientRect();
    if (renderer.vr.isPresenting()) {
      renderer.domElement.style.width = `${width}px`;
      renderer.domElement.style.height = `${height}px`;
    } else {
      renderer.setSize(width, height);
    }
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
}

export default Renderer;
