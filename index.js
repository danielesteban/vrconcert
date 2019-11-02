import CurveCast from './core/curvecast.js';
import * as Input from './core/input/index.js';
import Marker from './core/marker.js';
import Player from './core/player.js';
import Renderer from './core/renderer.js';
import Scenery from './core/scenery.js';
import { Fonts } from './core/three.js';

export default ({
  ambient = false,
  mount,
  onAnimationTick,
  performances,
  scenery: sceneryModel,
  skybox = false,
  text = {
    color: 0xFFFFFF,
    font: `${Fonts}helvetiker_bold.typeface.json`,
    size: 0.5,
    height: 0.2,
  },
  volume = 0.5,
}) => {
  // Setup renderer
  const {
    camera,
    renderer: { vr },
    room,
    scene,
  } = new Renderer({
    ambient,
    debug: {
      fps: document.getElementById('fps'),
      support: document.getElementById('support'),
    },
    mount,
    skybox,
  });

  // Setup video player
  const player = new Player({
    onListener: (listener) => camera.add(listener),
    performances,
    volume,
  });

  // Load scenery
  const scenery = new Scenery({
    model: sceneryModel,
    player,
    text,
  });
  scene.add(scenery);

  // Setup player input
  const hands = { right: 0, left: 1 };
  const input = new Input[vr.enabled ? 'VR' : 'Desktop']({
    mount,
    standingMatrix: vr.getStandingMatrix(),
  });
  input.controllers.forEach(
    (controller) => room.add(controller)
  );

  // Setup translocation marker
  const marker = new Marker();
  scene.add(marker);

  // Main loop
  // Use the scene onBeforeRender instead of the renderer onAnimationTick in order
  // to get the VR camera matrixWorld after it has been populated by the WebGLRenderer
  scene.onBeforeRender = ({ animation }, scene, camera) => {
    // Process input
    marker.visible = false;
    input.update({ animation, camera, room });
    input.controllers.forEach(({
      buttons,
      raycaster,
      visible,
    }, hand) => {
      if (visible) {
        // Rotate view with right hand joystick
        if (
          !room.destination
          && input.isVR
          && hand === hands.right
          && (buttons.leftwardsDown || buttons.rightwardsDown)
        ) {
          room.rotateY(
            Math.PI * 0.25 * (buttons.leftwardsDown ? 1 : -1)
          );
        }
        // Translocate with left hand joystick
        if (
          !room.destination
          && input.isVR
          && hand === hands.left
          && (buttons.forwards || buttons.forwardsUp)
        ) {
          // Raycast world
          const { hit, points } = CurveCast({
            intersects: scenery.meshes.floor,
            raycaster,
          });
          if (hit) {
            if (buttons.forwardsUp) {
              room.translocate({ camera, point: hit.point });
            } else {
              marker.update({ hit, points });
            }
          }
        }
      }
      // Reset single-frame button events
      Object.keys(buttons).forEach((id) => {
        if (~id.indexOf('Down') || ~id.indexOf('Up')) {
          buttons[id] = false;
        }
      });
    });
    // Animate scenery
    scenery.onAnimationTick({ camera, room });
    // Custom animation
    if (onAnimationTick) {
      onAnimationTick({
        animation,
        camera,
        room,
        scenery,
      });
    }
  };
};
