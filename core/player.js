import ChromaKey from './chromakey.js';
import {
  Audio,
  AudioAnalyser,
  AudioListener,
  LinearFilter,
  MeshBasicMaterial,
  RGBFormat,
  VideoTexture,
} from './three.js';

// Video player with audio analyser

class Player {
  constructor({
    onListener,
    performances,
    volume,
  }) {
    this.onListener = onListener;
    this.performances = performances;

    // Setup video player
    this.track = performances.track || 0;
    this.video = document.createElement('video');
    this.video.crossOrigin = 'anonymous';
    this.video.volume = volume;
    this.video.src = performances.tracklist[this.track].video;
    this.video.addEventListener('error', this.nextTrack.bind(this), false);
    this.video.addEventListener('ended', this.nextTrack.bind(this), false);

    // Setup video texture
    {
      const texture = new VideoTexture(this.video);
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
      this.texture = texture;
    }

    // Setup video material
    if (performances.chromakey) {
      this.material = ChromaKey({
        key: performances.chromakey,
        texture: this.texture,
      });
    } else {
      this.material = new MeshBasicMaterial({
        map: this.texture,
      });
    }

    // Wait for first interaction
    this.audio = {
      analyser: false,
      bands: new Map(),
      listener: false,
      source: false,
    };
    window.addEventListener('mousedown', this.onInteraction.bind(this), false);
    window.addEventListener('touchstart', this.onInteraction.bind(this), false);
    window.addEventListener('vrdisplayactivate', this.onInteraction.bind(this), false);
  }

  onInteraction() {
    const {
      audio,
      onListener,
      onTrack,
      texture,
      video,
    } = this;
    // Setup audio context, listener & analyser on first interaction
    if (!audio.listener) {
      audio.listener = new AudioListener();
      audio.source = new Audio(audio.listener);
      audio.source.setMediaElementSource(video);
      audio.analyser = new AudioAnalyser(audio.source, 4096);
      if (onListener) {
        onListener(audio.listener);
      }
    }
    // Play/Resume performances on interaction
    if (video.paused) {
      video.play();
      texture.image = video;
      if (onTrack) {
        onTrack();
      }
    }
  }

  nextTrack() {
    const {
      onTrack,
      performances,
      video,
    } = this;
    this.track = (this.track + 1) % performances.tracklist.length;
    video.src = performances.tracklist[this.track].video;
    video.play();
    if (onTrack) {
      onTrack();
    }
  }

  updateBands() {
    const { audio: { analyser, bands } } = this;
    if (!analyser) {
      return false;
    }
    const freq = analyser.getFrequencyData();
    let band = 0;
    let from = 2;
    let ceiling = 4;
    while (band < 8 && from < freq.length - 1) {
      const last = bands.get(band) || 0;
      let sum = 0;
      for (let i = from; i <= ceiling; i += 1) {
        sum += Math.max(freq[i] - 128, 0) / 127;
      }
      const amplitude = Math.max(Math.max(
        Math.sqrt(sum / (ceiling - from + 1)),
        last * 0.8
      ), 0.001);
      bands.set(band, amplitude);
      band += 1;
      from = ceiling;
      ceiling *= 2;
    }
    return true;
  }
}

export default Player;
