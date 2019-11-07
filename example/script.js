import VRConcert from '../index.js';

VRConcert({
  mount: document.getElementById('mount'),
  performances: {
    chromakey: '#00d800',
    members: 2,
    tracklist: [
      {
        title: 'zapatilla brothers',
        video: 'performances/track_packed.webm',
      },
    ],
  },
  ambient: {
    sky: 0xffffff,
    ground: 0x444444,
    position: { x: 0, y: 1, z: 0 },
  },
  scenery: 'scenery/stage_duo.glb',
  skybox: [
    'skybox/right.jpg',
    'skybox/left.jpg',
    'skybox/top.jpg',
    'skybox/bottom.jpg',
    'skybox/front.jpg',
    'skybox/back.jpg',
  ],
});
