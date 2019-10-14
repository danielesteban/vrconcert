import Audience from './core/audience.js';
import ChromaKey from './core/chromakey.js';
import CurveCast from './core/curvecast.js';
import * as Input from './core/input/index.js';
import Marker from './core/marker.js';
import Renderer from './core/renderer.js';
import {
  Audio,
  AudioAnalyser,
  AudioContext,
  AudioListener,
  CubeTextureLoader,
  FontLoader,
  Fonts,
  GLTFLoader,
  HemisphereLight,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  RGBFormat,
  RepeatWrapping,
  TextGeometry,
  Vector3,
  VideoTexture,
} from './core/three.js';

export default ({
  ambient = false,
  mount,
  performances,
  scenery,
  skybox = false,
  text = {
    color: 0xFFFFFF,
    font: `${Fonts}helvetiker_bold.typeface.json`,
    size: 0.5,
    height: 0.2,
  },
  volume = 0.5,
}) => {
  const meshes = {
    bands: new Map(),
    floor: [],
    performances: [],
  };

  // Setup renderer
  const {
    camera,
    renderer: { vr },
    room,
    scene,
  } = new Renderer({
    debug: {
      fps: document.getElementById('fps'),
      support: document.getElementById('support'),
    },
    mount,
  });

  // Setup video player
  let track = performances.track || 0;
  const player = document.createElement('video');
  player.crossOrigin = 'anonymous';
  player.volume = volume;
  player.src = performances.tracklist[track].video;
  const nextTrack = () => {
    track = (track + 1) % performances.tracklist.length;
    const { title, video } = performances.tracklist[track];
    player.src = video;
    player.play();
    if (meshes.trackTitle) {
      meshes.trackTitle.update();
    }
  };
  player.addEventListener('error', nextTrack, false);
  player.addEventListener('ended', nextTrack, false);

  // Setup video texture
  const texture = new VideoTexture(player);
  texture.image = document.createElement('canvas');
  {
    texture.image.width = 1;
    texture.image.height = 1;
    const ctx = texture.image.getContext('2d');
    if (performances.chromakey) {
      ctx.fillStyle = performances.chromakey;
      ctx.fillRect(0, 0, 1, 1);
    }
  }
  texture.anisotropy = 16;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.format = RGBFormat;
  texture.needsUpdate = true;

  // Setup video material
  let material;
  if (performances.chromakey) {
    material = ChromaKey({
      key: performances.chromakey,
      texture,
    });
  } else {
    material = new MeshBasicMaterial({
      map: texture,
    });
  }

  // Load font
  let font;
  {
    const loader = new FontLoader();
    loader.load(text.font, (res) => {
      font = res;
      if (meshes.trackTitle) {
        meshes.trackTitle.update();
        meshes.trackTitle.visible = !player.paused;
      }
    });
  }
 
  const audio = {
    amplitudes: new Map(),
    analyser: false,
    listener: false,
    source: false,
  };
  const onInteraction = () => {
    // Setup audio context, listener & analyser on first interaction
    if (!audio.listener) {
      audio.listener = new AudioListener();
      camera.add(audio.listener);
      audio.source = new Audio(audio.listener);
      audio.source.setMediaElementSource(player);
      audio.analyser = new AudioAnalyser(audio.source, 4096);
    }
    // Play/Resume performances on interaction
    if (player.paused) {
      player.play();
      texture.image = player;
      if (font && meshes.trackTitle) {
        meshes.trackTitle.visible = true;
      }
    }
  };
  window.addEventListener('mousedown', onInteraction, false);
  window.addEventListener('vrdisplayactivate', onInteraction, false);

  // Load scenery
	(new GLTFLoader()).load(scenery, ({ scene: scenery }) => {
    const audience = {
      meshes: [],
      planes: [],
    };
    scenery.traverse((child) => {
      const [name, ...params] = child.name.toLowerCase().trim().split('_');
      // Extract audience mesh & planes
      if (child.isMesh && name === 'audience') {
        if (params[0] === 'mesh') {
          child.weight = parseInt(params[1], 10) || 1;
          audience.meshes.push(child);
        } else {
          child.updateMatrixWorld();
          audience.planes.push(child);
        }
      }
      // Extract translocable planes
      if (child.isMesh && name === 'floor') {
        meshes.floor.push(child);
      }
      // Extract meshes that scale with the audio bands
      if ((child.isMesh || child.isLight) && name === 'band') {
        if (child.isMesh) {
          child.axes = {};
          (params[1] || 'XYZ').split('').forEach((axis) => {
            child.axes[axis] = child.scale[axis];
            child.scale[axis] = 0.001;
          });
        } else {
          child.intensityScale = child.intensity;
          child.intensity = 0.001;
        }
        const index = parseInt(params[0], 10) - 1;
        if (!meshes.bands.has(index)) {
          meshes.bands.set(index, []);
        }
        meshes.bands.get(index).push(child);
      }
      // Extract performance planes
      if (child.isMesh && name === 'performance') {
        const index = parseInt(params[0], 10) - 1;
        const uv = child.geometry.getAttribute('uv');
        const bias = 0.001;
        const stride = 1 / performances.members;
        const offset = stride * index + bias;
        const width = stride - bias * 2;
        const height = 1 - bias * 2;
        for (let i = 0; i < uv.count; i += 1) {
          const x = uv.getX(i);
          const y = 1 - uv.getY(i);
          uv.setXY(
            i,
            offset + x * width,
            bias + y * height
          );
        }
        child.material = material;
        child.updateMatrixWorld();
        meshes.performances.push(child);
      }
      // Extract track title
      if ((child.isMesh || child.isObject3D) && !meshes.trackTitle && name === 'tracktitle') {
        const trackTitle = new Mesh(
          undefined,
          new MeshStandardMaterial({ color: text.color })
        );
        trackTitle.update = () => {
          if (!font) {
            return;
          }
          trackTitle.geometry.dispose();
          trackTitle.geometry = new TextGeometry(performances.tracklist[track].title || '', {
            font: font,
            size: text.size,
            height: text.height,
          });
          trackTitle.geometry.computeBoundingBox();
          trackTitle.position.set(0, 0, 0).addScaledVector(
            trackTitle.geometry.boundingBox.getSize(new Vector3()),
            -0.5
          );
        };
        trackTitle.update();
        trackTitle.visible = !player.paused;
        meshes.trackTitle = trackTitle;
        child.add(trackTitle);
      }
    });
    // Spawn audience
    if (audience.meshes.length && audience.planes.length) {
      [...audience.meshes, ...audience.planes].forEach(mesh => (
        mesh.parent.remove(mesh)
      ));
      audience.planes.forEach((plane) => {
        plane.triangles = Audience.extractTriangles(plane);
        plane.area = plane.triangles.reduce((sum, { area }) => (
          sum + area
        ), 0);
        plane.points = [];
      });
      const weightSum = audience.meshes.reduce((sum, { weight }) => (
        sum + weight
      ), 0);
      meshes.audience = audience.meshes.map((mesh) => {
        mesh.weight = mesh.weight / weightSum;
        const instancedAudience = new Audience({
          lookAt: meshes.performances,
          mesh,
          planes: audience.planes,
        });
        scenery.add(instancedAudience);
        return instancedAudience;
      });
    }
    scene.add(scenery);
  });

  // Load skybox
  if (skybox) {
    scene.background = (new CubeTextureLoader()).load(skybox);
  }

  // Setup ambient light
  if (ambient) {
    const light = new HemisphereLight(ambient.sky, ambient.ground);
    light.position.copy(ambient.position);
    scene.add(light);
  }

  // Setup player input
  const hands = { right: 0, left: 1 };
  const head = new Vector3();
  const input = new Input[vr.enabled ? 'VR' : 'Desktop']({
    mount,
    standingMatrix: vr.getStandingMatrix(),
  });
  input.controllers.forEach(
    controller => room.add(controller)
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
      pointer,
      pulse,
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
            intersects: meshes.floor,
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
    // Make performances look at the player
    head.setFromMatrixPosition(camera.matrixWorld);
    meshes.performances.forEach((mesh) => {
      mesh.lookAt(head);
      mesh.updateMatrixWorld();
    });
    // Scale band meshes
    if (audio.analyser) {
      const freq = audio.analyser.getFrequencyData();
      let band = 0;
      let from = 2
      let ceiling = 4;
      while (band < 8 && from < freq.length - 1) {
        const last = audio.amplitudes.get(band) || 0;
        let sum = 0;
        for (let i = from; i <= ceiling; i += 1) {
          sum += Math.max(freq[i] - 128, 0) / 127;
        }
        const amplitude = Math.max(Math.max(
          Math.sqrt(sum / (ceiling - from + 1)),
          last * 0.8
        ), 0.001);
        audio.amplitudes.set(band, amplitude);
        const objects = meshes.bands.get(band);
        if (objects) {
          objects.forEach((object) => {
            if (object.isMesh) {
              if (object.axes.x) {
                object.scale.x = amplitude * object.axes.x;
              }
              if (object.axes.y) {
                object.scale.y = amplitude * object.axes.y;
              }
              if (object.axes.z) {
                object.scale.z = amplitude * object.axes.z;
              }
              object.updateMatrixWorld();
            }
            if (object.isLight) {
              object.intensity = amplitude * object.intensityScale;
              object.visible = object.intensity > 0;
            }
          });
        }
        band += 1;
        from = ceiling;
        ceiling *= 2;
      }
      if (meshes.audience) {
        meshes.audience.forEach((mesh) => (
          mesh.update({ animation, amplitudes: audio.amplitudes, player: head })
        ));
      }
    }
  };
};
