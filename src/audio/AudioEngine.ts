import { useStore } from '../store/useStore';

type AudioTrack = 'ambience' | 'music' | 'alert' | 'announcement' | 'rain' | 'stage';

interface AudioLayer {
  gain: GainNode;
  oscillators: OscillatorNode[];
  noiseSource: AudioBufferSourceNode | null;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private layers: Map<AudioTrack, AudioLayer> = new Map();
  private started = false;
  private currentWeather = 0;
  private currentStress = 0;
  private evacuation = false;
  private store: ReturnType<typeof useStore> | null = null;

  init() {
    if (this.started) return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.7;
    this.masterGain.connect(this.ctx.destination);
    this.started = true;

    this.createLayer('ambience', 0.15);
    this.createLayer('music', 0.1);
    this.createLayer('alert', 0.0);
    this.createLayer('announcement', 0.0);
    this.createLayer('rain', 0.0);
    this.createLayer('stage', 0.05);

    this.startAmbience();
    this.startMusic();
  }

  private createLayer(name: AudioTrack, initialGain: number) {
    if (!this.ctx || !this.masterGain) return;
    const gain = this.ctx.createGain();
    gain.gain.value = initialGain;
    gain.connect(this.masterGain);
    this.layers.set(name, { gain, oscillators: [], noiseSource: null });
  }

  private createNoiseBuffer(): AudioBuffer {
    const ctx = this.ctx!;
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private startAmbience() {
    const ctx = this.ctx!;
    const layer = this.layers.get('ambience')!;
    const noise = ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer();
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    noise.connect(filter);
    filter.connect(layer.gain);
    noise.start();
    layer.noiseSource = noise;
  }

  private startMusic() {
    const ctx = this.ctx!;
    const layer = this.layers.get('music')!;

    // Low drone
    const drone = ctx.createOscillator();
    drone.type = 'sine';
    drone.frequency.value = 55;
    drone.connect(layer.gain);
    drone.start();
    layer.oscillators.push(drone);

    // Subtle harmonic
    const harmonic = ctx.createOscillator();
    harmonic.type = 'sine';
    harmonic.frequency.value = 110;
    const harmonicGain = ctx.createGain();
    harmonicGain.gain.value = 0.3;
    harmonic.connect(harmonicGain);
    harmonicGain.connect(layer.gain);
    harmonic.start();
    layer.oscillators.push(harmonic);
  }

  setMasterVolume(v: number) {
    if (this.masterGain) this.masterGain.gain.value = v;
  }

  setLayerVolume(track: AudioTrack, v: number) {
    const layer = this.layers.get(track);
    if (layer) layer.gain.gain.value = v;
  }

  setWeather(intensity: number) {
    this.currentWeather = intensity;
    const rainLayer = this.layers.get('rain');
    if (rainLayer) {
      rainLayer.gain.gain.value = intensity * 0.3;
    }
    if (intensity > 0.1 && rainLayer && !rainLayer.noiseSource) {
      const ctx = this.ctx!;
      const noise = ctx.createBufferSource();
      noise.buffer = this.createNoiseBuffer();
      noise.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 2000;
      noise.connect(filter);
      filter.connect(rainLayer!.gain);
      noise.start();
      rainLayer!.noiseSource = noise;
    }
  }

  setStressLevel(stress: number) {
    this.currentStress = stress;
    // Increase tension in music
    const musicLayer = this.layers.get('music');
    if (musicLayer && musicLayer.oscillators.length > 0) {
      const targetFreq = 55 + stress * 30;
      musicLayer.oscillators[0].frequency.setTargetAtTime(targetFreq, this.ctx!.currentTime, 1);
    }
  }

  setEvacuation(active: boolean) {
    this.evacuation = active;
    if (active) {
      this.setLayerVolume('music', 0.02);
      this.setLayerVolume('alert', 0.15);
    } else {
      this.setLayerVolume('music', 0.1);
      this.setLayerVolume('alert', 0.0);
    }
  }

  playAlert(frequency: number = 880) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = frequency;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.05);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  }

  playAnnouncement() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 440;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.1);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.0);
    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start();
    osc.stop(ctx.currentTime + 1.0);
  }

  toggle() {
    if (!this.started) {
      this.init();
      return true;
    }
    if (this.masterGain) {
      const current = this.masterGain.gain.value;
      this.masterGain.gain.value = current > 0 ? 0 : 0.7;
    }
    return (this.masterGain?.gain.value ?? 0) > 0;
  }

  dispose() {
    this.layers.forEach((layer) => {
      layer.oscillators.forEach((o) => o.stop());
      if (layer.noiseSource) layer.noiseSource.stop();
    });
    this.ctx?.close();
    this.started = false;
  }
}
