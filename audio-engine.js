/* Recorded foley, with one cancellable voice per physical mechanism. */
(() => {
  'use strict';
  const specs = {
    'ui-click': ['click', .12, null, 'ui'],
    handle: ['click', .13, [-1.525, 1, 3.08], 'handle'],
    'door-open': ['door-open', .27, [-1.525, 1, 3.08], 'door'],
    'door-close': ['door-close', .30, [-1.525, 1, 3.08], 'door'],
    'wardrobe-open': ['wardrobe-open', .24, [1.95, 1.2, 1.91], 'wardrobe'],
    'wardrobe-close': ['wardrobe-close', .26, [1.95, 1.2, 1.91], 'wardrobe'],
    'lid-open': ['plastic-open', .15, [.12, .09, -1.53], 'ps1'],
    'lid-close': ['plastic-close', .16, [.12, .09, -1.53], 'ps1'],
    'case-open': ['plastic-open', .16, [-.26, .46, -1.8], 'vhs'],
    'tape-in': ['vhs-in', .26, [-.26, .46, -1.8], 'vhs'],
    'bike-bell': [['bell-1', 'bell-2', 'bell-3'], .25, [-1.84, .95, 1.15], 'bell'],
    'floor-step': [Array.from({length:6}, (_, i) => 'wood-' + (i+1)), .21, 'feet', 'steps'],
    'carpet-step': [Array.from({length:6}, (_, i) => 'carpet-' + (i+1)), .12, 'feet', 'steps']
  };
  window.RoomAudio = class {
    constructor(context, output) {
      this.context = context; this.output = output; this.buffers = new Map();
      this.voices = new Map(); this.last = new Map(); this.failed = [];
      this.position = [0, 1.55, 0]; this.loaded = 0;
      const names = [...new Set(Object.values(specs).flatMap(s => Array.isArray(s[0]) ? s[0] : [s[0]]))];
      this.ready = Promise.all(names.map(async name => {
        try {
          const response = await fetch('./assets/audio/foley/' + name + '.ogg');
          if (!response.ok) throw new Error(response.status);
          this.buffers.set(name, await context.decodeAudioData(await response.arrayBuffer())); this.loaded++;
        } catch (_) { this.failed.push(name); }
      }));
      this.ambiences = [];
      const noise = context.createBuffer(1, context.sampleRate * 4, context.sampleRate);
      const data = noise.getChannelData(0);
      for (let i=0; i<data.length; i++) data[i] = Math.random()*2-1;
      for (const [position, frequency] of [[[1.1, 1.8, -2.3], 240], [[-1.5, 1.5, 4.2], 110]]) {
        const source=context.createBufferSource(), filter=context.createBiquadFilter(), gain=context.createGain(), panner=this.panner(position);
        source.buffer=noise; source.loop=true; filter.type='lowpass'; filter.frequency.value=frequency; gain.gain.value=0;
        source.connect(filter); filter.connect(gain); gain.connect(panner); panner.connect(output); source.start();
        this.ambiences.push(gain);
      }
    }
    panner(position) {
      const p=this.context.createPanner(); p.panningModel='HRTF'; p.distanceModel='inverse'; p.refDistance=1; p.rolloffFactor=.8;
      p.setPosition(...position); return p;
    }
    stop(group) {
      const voice=this.voices.get(group); if (!voice) return;
      const t=this.context.currentTime;
      voice.gain.gain.cancelScheduledValues(t); voice.gain.gain.setTargetAtTime(0,t,.012);
      voice.source.stop(t+.055); this.voices.delete(group);
    }
    stopAll() { for (const group of this.voices.keys()) this.stop(group); }
    play(kind) {
      const spec=specs[kind]; if (!spec) return false;
      const [names, level, position, group]=spec, choices=Array.isArray(names)?names:[names];
      const available=choices.filter(n=>this.buffers.has(n)); if (!available.length) return false;
      const candidates=available.filter(n=>n!==this.last.get(kind));
      const name=(candidates.length?candidates:available)[Math.floor(Math.random()*(candidates.length||available.length))];
      this.last.set(kind,name); this.stop(group);
      const t=this.context.currentTime, source=this.context.createBufferSource(), gain=this.context.createGain();
      source.buffer=this.buffers.get(name);
      source.playbackRate.value=group==='steps'?.98+Math.random()*.04:1;
      gain.gain.setValueAtTime(0,t); gain.gain.linearRampToValueAtTime(level*(.94+Math.random()*.06),t+.006);
      const end=t+source.buffer.duration/source.playbackRate.value;
      gain.gain.setTargetAtTime(0,Math.max(t+.01,end-.025),.007);
      const pos=position==='feet'?[this.position[0],.08,this.position[2]]:position;
      const panner=pos?this.panner(pos):null;
      source.connect(gain); gain.connect(panner||this.output); if(panner)panner.connect(this.output);
      const voice={source,gain}; this.voices.set(group,voice);
      source.onended=()=>{source.disconnect();gain.disconnect();panner?.disconnect();if(this.voices.get(group)===voice)this.voices.delete(group);};
      source.start(); return true;
    }
    update(camera, hallway, curtainsClosed, enabled) {
      const p=camera.position, f=camera.getWorldDirection(new THREE.Vector3()), l=this.context.listener;
      this.position=[p.x,p.y,p.z]; l.setPosition(p.x,p.y,p.z); l.setOrientation(f.x,f.y,f.z,0,1,0);
      this.ambiences[0].gain.setTargetAtTime(enabled?(curtainsClosed?.001:.0025):0,this.context.currentTime,.6);
      this.ambiences[1].gain.setTargetAtTime(enabled&&hallway?.003:0,this.context.currentTime,.5);
    }
    diagnostics() { return {loaded:this.loaded,failed:[...this.failed],active:[...this.voices.keys()],variants:Object.fromEntries(this.last)}; }
  };
})();
