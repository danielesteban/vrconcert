VRConcert
==

> A tool to create VR performances/concerts/videos

#### Pack your videos and audio

 * cd [example/performances](https://github.com/danielesteban/vrconcert/tree/master/example/performances)
 * Copy your audio and videos to [track](https://github.com/danielesteban/vrconcert/tree/master/example/performances/track)
 * Run [pack.sh track](https://github.com/danielesteban/vrconcert/blob/master/example/performances/pack.sh)
 * Everything will be packed into: [track_packed.webm](https://github.com/danielesteban/vrconcert/blob/master/example/performances/track_packed.webm)

#### Create scenery

 * See example scenery: [stage_duo.blend](https://github.com/danielesteban/vrconcert/blob/master/example/scenery/stage_duo.blend)
 * Name your performance video planes: 'Performance_1', 'Performance_2', 'Performance_[OFFSET]', etc...
 * Name the meshes you want to scale with the analyser bands: 'Band_1', 'Band_2_Y', 'Band_3_XYZ', 'Band_[BAND]_[AXIS]' etc...
 * Name your VR translocable planes: 'Floor_1', 'Floor_2', 'Floor_3', etc...
 * Name the audience meshes: 'Audience_Mesh_60', 'Audience_Mesh_40', 'Audience_Mesh_[WEIGHT]', etc...
 * Name the audience planes: 'Audience_1', 'Audience_2', 'Audience_3', etc... 
 * Create an empty mesh named: 'TrackTitle' and position it where you want the track title to render. 

#### Put it all together

```js
import VRConcert from 'https://unpkg.com/vrconcert';

VRConcert({
  mount: document.getElementById('mount'),
  performances: {
    chromakey: '#00d800',
    members: 2,
    tracklist: [
      {
        title: 'A Performance',
        video: 'track01_packed.webm',
      },
      {
        title: 'Another Performance',
        video: 'track02_packed.webm',
      },
    ],
  },
  scenery: 'scenery.glb',
});
```
