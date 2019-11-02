import Audience from './audience.js';
import {
  FontLoader,
  GLTFLoader,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  TextGeometry,
  Vector3,
} from './three.js';

class Scenery extends Object3D {
  constructor({
    model,
    player,
    text,
  }) {
    super();
    this.aux = new Vector3();
    this.meshes = {
      bands: new Map(),
      floor: [],
      performances: [],
    };
    this.player = player;
    this.player.onTrack = this.onTrack.bind(this);
    this.text = text;
    this.modelLoader = new GLTFLoader();
    this.modelLoader.load(model, this.onModelLoad.bind(this));
    this.fontLoader = new FontLoader();
    this.fontLoader.load(text.font, this.onFontLoad.bind(this));
  }

  onAnimationTick({ camera, room }) {
    const { aux, meshes, player } = this;

    // Make performances look at the player
    aux.setFromMatrixPosition(camera.matrixWorld);
    meshes.performances.forEach((mesh) => {
      mesh.lookAt(aux);
      mesh.updateMatrixWorld();
    });

    // Scale band meshes
    if (player.updateBands()) {
      if (meshes.audience) {
        meshes.audience.forEach((mesh) => (
          mesh.update({
            bands: player.audio.bands,
            player: room.position,
          })
        ));
      }
      player.audio.bands.forEach((amplitude, band) => {
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
      });
    }
  }

  onFontLoad(font) {
    this.font = font;
    this.onTrack();
  }

  onModelLoad({ scene }) {
    const {
      meshes,
      text,
      player,
    } = this;
    const audience = {
      meshes: [],
      planes: [],
    };
    scene.traverse((child) => {
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
        if (index < player.performances.members) {
          const uv = child.geometry.getAttribute('uv');
          const bias = 0.001;
          const stride = 1 / player.performances.members;
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
          child.material = player.material;
          child.updateMatrixWorld();
          meshes.performances.push(child);
        } else {
          child.visible = false;
        }
      }

      // Extract track title
      if ((child.isMesh || child.isObject3D) && !meshes.trackTitle && name === 'tracktitle') {
        const trackTitle = new Mesh(
          undefined,
          new MeshStandardMaterial({ color: text.color })
        );
        meshes.trackTitle = trackTitle;
        this.onTrack();
        child.add(trackTitle);
      }
    });

    // Spawn audience
    if (audience.meshes.length && audience.planes.length) {
      [...audience.meshes, ...audience.planes].forEach((mesh) => (
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
        mesh.weight /= weightSum;
        const instancedAudience = new Audience({
          lookAt: meshes.performances,
          mesh,
          planes: audience.planes,
        });
        this.add(instancedAudience);
        return instancedAudience;
      });
    }

    [...scene.children].forEach((child) => this.add(child));
  }

  onTrack() {
    const {
      font,
      meshes: { trackTitle },
      player,
      text,
    } = this;
    if (font && trackTitle) {
      trackTitle.geometry.dispose();
      trackTitle.geometry = new TextGeometry(player.performances.tracklist[player.track].title || '', {
        font,
        size: text.size,
        height: text.height,
      });
      trackTitle.geometry.computeBoundingBox();
      trackTitle.position.set(0, 0, 0).addScaledVector(
        trackTitle.geometry.boundingBox.getSize(new Vector3()),
        -0.5
      );
      trackTitle.visible = !player.video.paused;
    }
  }
}

export default Scenery;
