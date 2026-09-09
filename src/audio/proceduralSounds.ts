import { audioManager } from './audioContext';
import { SoundLayerId, SoundLayerState } from '../types/audio';

export interface SoundGenerator {
  start: () => void;
  stop: () => void;
  setVolume: (vol: number) => void;
  setPan: (pan: number) => void;
  setFilterFreq: (freq: number) => void;
  updateSpatial: (x: number, y: number) => void;
}

// Generate shared looping noise buffers
function createNoiseBuffer(ctx: AudioContext, seconds = 5, type: 'white' | 'pink' | 'brown' = 'pink'): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const bufferSize = sampleRate * seconds;
  const buffer = ctx.createBuffer(2, bufferSize, sampleRate);
  
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    let lastOut = 0.0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      
      if (type === 'white') {
        data[i] = white * 0.3;
      } else if (type === 'pink') {
        // Paul Kellet's pink noise filter algorithm
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      } else {
        // Brown noise
        data[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = data[i];
        data[i] *= 1.5;
      }
    }
  }
  return buffer;
}

class ProceduralLayer implements SoundGenerator {
  private ctx: AudioContext;
  private isRunning = false;
  private layerGain: GainNode;
  private panner: StereoPannerNode;
  private filter: BiquadFilterNode;
  private activeNodes: (AudioNode | number)[] = [];
  private layerId: SoundLayerId;

  constructor(ctx: AudioContext, layerId: SoundLayerId) {
    this.ctx = ctx;
    this.layerId = layerId;

    this.layerGain = ctx.createGain();
    this.layerGain.gain.setValueAtTime(0, ctx.currentTime);

    this.panner = ctx.createStereoPanner ? ctx.createStereoPanner() : (ctx.createGain() as unknown as StereoPannerNode);
    this.filter = ctx.createBiquadFilter();
    this.filter.frequency.setValueAtTime(10000, ctx.currentTime);

    // Routing: sound sources -> filter -> layerGain -> panner -> masterBus
    this.filter.connect(this.layerGain);
    this.layerGain.connect(this.panner);
    
    const masterBus = audioManager.getMasterBus();
    if (masterBus) {
      this.panner.connect(masterBus);
    }
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.buildSynthesisTree();
  }

  public stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    this.cleanupNodes();
  }

  public setVolume(vol: number): void {
    const clamped = Math.max(0, Math.min(1.5, vol));
    this.layerGain.gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.05);
  }

  public setPan(panVal: number): void {
    if (this.panner && this.panner.pan) {
      const clamped = Math.max(-1, Math.min(1, panVal));
      this.panner.pan.setTargetAtTime(clamped, this.ctx.currentTime, 0.05);
    }
  }

  public setFilterFreq(freq: number): void {
    const clamped = Math.max(100, Math.min(20000, freq));
    this.filter.frequency.setTargetAtTime(clamped, this.ctx.currentTime, 0.05);
  }

  public updateSpatial(x: number, y: number): void {
    // Convert -100..100 coordinates to stereo pan & distance attenuation
    const pan = x / 100;
    this.setPan(pan);

    // Distance attenuation from center (0,0)
    const dist = Math.sqrt(x * x + y * y) / 141.4; // 0 to 1
    const distGain = Math.max(0.2, 1.0 - dist * 0.6);
    this.layerGain.gain.setTargetAtTime(this.layerGain.gain.value * distGain, this.ctx.currentTime, 0.05);
  }

  private buildSynthesisTree(): void {
    const ctx = this.ctx;

    switch (this.layerId) {
      case 'rain': {
        const noiseBuf = createNoiseBuffer(ctx, 4, 'pink');
        const noiseSource = ctx.createBufferSource();
        noiseSource.buffer = noiseBuf;
        noiseSource.loop = true;

        const rainFilter = ctx.createBiquadFilter();
        rainFilter.type = 'lowpass';
        rainFilter.frequency.setValueAtTime(1400, ctx.currentTime);

        const highFilter = ctx.createBiquadFilter();
        highFilter.type = 'highpass';
        highFilter.frequency.setValueAtTime(450, ctx.currentTime);

        noiseSource.connect(highFilter);
        highFilter.connect(rainFilter);
        rainFilter.connect(this.filter);

        noiseSource.start();
        this.activeNodes.push(noiseSource);
        break;
      }

      case 'thunder': {
        // Periodic procedural rolling thunder generator
        const noiseBuf = createNoiseBuffer(ctx, 6, 'brown');
        const triggerThunder = () => {
          if (!this.isRunning) return;
          const tSource = ctx.createBufferSource();
          tSource.buffer = noiseBuf;
          
          const tFilter = ctx.createBiquadFilter();
          tFilter.type = 'lowpass';
          tFilter.frequency.setValueAtTime(180, ctx.currentTime);

          const tSub = ctx.createOscillator();
          tSub.type = 'sine';
          tSub.frequency.setValueAtTime(42, ctx.currentTime);
          tSub.frequency.exponentialRampToValueAtTime(26, ctx.currentTime + 3.0);

          const env = ctx.createGain();
          env.gain.setValueAtTime(0.001, ctx.currentTime);
          env.gain.linearRampToValueAtTime(0.7, ctx.currentTime + 0.35);
          env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 4.5);

          tSource.connect(tFilter);
          tFilter.connect(env);
          tSub.connect(env);
          env.connect(this.filter);

          tSource.start();
          tSub.start();
          tSource.stop(ctx.currentTime + 5.0);
          tSub.stop(ctx.currentTime + 5.0);

          // Schedule next strike between 8s and 22s
          const nextInterval = 8000 + Math.random() * 14000;
          const timerId = window.setTimeout(triggerThunder, nextInterval);
          this.activeNodes.push(timerId);
        };

        const initialTimer = window.setTimeout(triggerThunder, 2000);
        this.activeNodes.push(initialTimer);
        break;
      }

      case 'ocean': {
        // Ocean swell: sweeping bandpass + lowpass filtered pink noise
        const oceanBuf = createNoiseBuffer(ctx, 8, 'pink');
        const source = ctx.createBufferSource();
        source.buffer = oceanBuf;
        source.loop = true;

        const lowpass = ctx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.setValueAtTime(450, ctx.currentTime);

        const swellGain = ctx.createGain();
        swellGain.gain.setValueAtTime(0.2, ctx.currentTime);

        // LFO for periodic wave tide swells (period ~10s)
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(0.09, ctx.currentTime);

        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(0.45, ctx.currentTime);

        lfo.connect(lfoGain);
        lfoGain.connect(swellGain.gain);

        // Filter modulation
        const filterMod = ctx.createGain();
        filterMod.gain.setValueAtTime(400, ctx.currentTime);
        lfo.connect(filterMod);
        filterMod.connect(lowpass.frequency);

        source.connect(lowpass);
        lowpass.connect(swellGain);
        swellGain.connect(this.filter);

        source.start();
        lfo.start();
        this.activeNodes.push(source, lfo);
        break;
      }

      case 'wind': {
        // Forest wind: dual swept resonant bandpass filters
        const windBuf = createNoiseBuffer(ctx, 6, 'pink');
        const source = ctx.createBufferSource();
        source.buffer = windBuf;
        source.loop = true;

        const bp1 = ctx.createBiquadFilter();
        bp1.type = 'bandpass';
        bp1.frequency.setValueAtTime(480, ctx.currentTime);
        bp1.Q.setValueAtTime(4.0, ctx.currentTime);

        const bp2 = ctx.createBiquadFilter();
        bp2.type = 'bandpass';
        bp2.frequency.setValueAtTime(850, ctx.currentTime);
        bp2.Q.setValueAtTime(3.0, ctx.currentTime);

        // Slow wind modulation LFOs
        const lfo1 = ctx.createOscillator();
        lfo1.frequency.setValueAtTime(0.12, ctx.currentTime);
        const lfo1Gain = ctx.createGain();
        lfo1Gain.gain.setValueAtTime(300, ctx.currentTime);
        lfo1.connect(lfo1Gain);
        lfo1Gain.connect(bp1.frequency);

        const lfo2 = ctx.createOscillator();
        lfo2.frequency.setValueAtTime(0.07, ctx.currentTime);
        const lfo2Gain = ctx.createGain();
        lfo2Gain.gain.setValueAtTime(450, ctx.currentTime);
        lfo2.connect(lfo2Gain);
        lfo2Gain.connect(bp2.frequency);

        source.connect(bp1);
        source.connect(bp2);
        bp1.connect(this.filter);
        bp2.connect(this.filter);

        source.start();
        lfo1.start();
        lfo2.start();
        this.activeNodes.push(source, lfo1, lfo2);
        break;
      }

      case 'campfire': {
        // Warm low flame body + crackling embers
        const flameBuf = createNoiseBuffer(ctx, 4, 'brown');
        const flameSource = ctx.createBufferSource();
        flameSource.buffer = flameBuf;
        flameSource.loop = true;

        const flameFilter = ctx.createBiquadFilter();
        flameFilter.type = 'lowpass';
        flameFilter.frequency.setValueAtTime(280, ctx.currentTime);

        flameSource.connect(flameFilter);
        flameFilter.connect(this.filter);
        flameSource.start();
        this.activeNodes.push(flameSource);

        // Poisson process crackle bursts
        const triggerCrackle = () => {
          if (!this.isRunning) return;
          const osc = ctx.createOscillator();
          osc.type = Math.random() > 0.4 ? 'square' : 'triangle';
          osc.frequency.setValueAtTime(600 + Math.random() * 2400, ctx.currentTime);

          const cGain = ctx.createGain();
          cGain.gain.setValueAtTime(0.001, ctx.currentTime);
          cGain.gain.linearRampToValueAtTime(0.3 + Math.random() * 0.4, ctx.currentTime + 0.002);
          cGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.03 + Math.random() * 0.05);

          osc.connect(cGain);
          cGain.connect(this.filter);

          osc.start();
          osc.stop(ctx.currentTime + 0.1);

          const delay = 40 + Math.random() * 180;
          const timer = window.setTimeout(triggerCrackle, delay);
          this.activeNodes.push(timer);
        };

        const crackleTimer = window.setTimeout(triggerCrackle, 100);
        this.activeNodes.push(crackleTimer);
        break;
      }

      case 'cosmic': {
        // Deep space drone: multi-oscillator detuned harmonic cluster with tape wow
        const freqs = [55, 110, 164.81, 220, 329.63]; // A major 9th chord base
        const masterDrone = ctx.createGain();
        masterDrone.gain.setValueAtTime(0.2, ctx.currentTime);

        freqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          osc.type = idx % 2 === 0 ? 'sawtooth' : 'sine';
          // Detune slightly for lush chorusing
          osc.frequency.setValueAtTime(freq + (Math.random() - 0.5) * 1.5, ctx.currentTime);

          const oscFilter = ctx.createBiquadFilter();
          oscFilter.type = 'lowpass';
          oscFilter.frequency.setValueAtTime(320 + idx * 80, ctx.currentTime);

          osc.connect(oscFilter);
          oscFilter.connect(masterDrone);
          osc.start();
          this.activeNodes.push(osc);
        });

        masterDrone.connect(this.filter);
        break;
      }

      case 'singingBowl': {
        // Modal synthesis singing bowl with resonant harmonics
        const bowlFund = 216; // 432 / 2 Hz
        const harmonicRatios = [1, 2.76, 5.4, 8.9];

        const triggerStrike = () => {
          if (!this.isRunning) return;
          const strikeTime = ctx.currentTime;
          
          harmonicRatios.forEach((ratio, i) => {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(bowlFund * ratio, strikeTime);

            const gain = ctx.createGain();
            const amp = 0.35 / (i + 1);
            gain.gain.setValueAtTime(0.001, strikeTime);
            gain.gain.linearRampToValueAtTime(amp, strikeTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.0001, strikeTime + 7.0 - i);

            osc.connect(gain);
            gain.connect(this.filter);

            osc.start(strikeTime);
            osc.stop(strikeTime + 7.5);
          });

          const nextInterval = 6500 + Math.random() * 4000;
          const timer = window.setTimeout(triggerStrike, nextInterval);
          this.activeNodes.push(timer);
        };

        const initialBowl = window.setTimeout(triggerStrike, 500);
        this.activeNodes.push(initialBowl);
        break;
      }

      case 'earthDrone': {
        // Schumann resonance 7.83Hz harmonic drone
        const osc1 = ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(54.81, ctx.currentTime); // 7 * 7.83Hz harmonic

        const osc2 = ctx.createOscillator();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(62.64, ctx.currentTime); // 8 * 7.83Hz harmonic

        // 7.83Hz AM modulator
        const amMod = ctx.createOscillator();
        amMod.type = 'sine';
        amMod.frequency.setValueAtTime(7.83, ctx.currentTime);

        const amGain = ctx.createGain();
        amGain.gain.setValueAtTime(0.2, ctx.currentTime);
        amMod.connect(amGain.gain);

        const subGain = ctx.createGain();
        subGain.gain.setValueAtTime(0.3, ctx.currentTime);

        osc1.connect(subGain);
        osc2.connect(subGain);
        subGain.connect(amGain);
        amGain.connect(this.filter);

        osc1.start();
        osc2.start();
        amMod.start();
        this.activeNodes.push(osc1, osc2, amMod);
        break;
      }

      case 'crickets': {
        // High frequency FM modulated chirp synthesis
        const triggerChirps = () => {
          if (!this.isRunning) return;
          const chirpTime = ctx.currentTime;
          
          for (let c = 0; c < 3; c++) {
            const startTime = chirpTime + c * 0.08;
            const carrier = ctx.createOscillator();
            const mod = ctx.createOscillator();
            const modGain = ctx.createGain();
            const env = ctx.createGain();

            carrier.frequency.setValueAtTime(4600 + Math.random() * 400, startTime);
            mod.frequency.setValueAtTime(120, startTime);
            modGain.gain.setValueAtTime(500, startTime);

            mod.connect(modGain);
            modGain.connect(carrier.frequency);

            env.gain.setValueAtTime(0.001, startTime);
            env.gain.linearRampToValueAtTime(0.08, startTime + 0.015);
            env.gain.exponentialRampToValueAtTime(0.001, startTime + 0.06);

            carrier.connect(env);
            env.connect(this.filter);

            carrier.start(startTime);
            mod.start(startTime);
            carrier.stop(startTime + 0.07);
            mod.stop(startTime + 0.07);
          }

          const next = 600 + Math.random() * 1200;
          const timer = window.setTimeout(triggerChirps, next);
          this.activeNodes.push(timer);
        };

        const cricketTimer = window.setTimeout(triggerChirps, 300);
        this.activeNodes.push(cricketTimer);
        break;
      }

      case 'coffeehouse': {
        // Warm murmur filtered formant cluster
        const murmurBuf = createNoiseBuffer(ctx, 5, 'pink');
        const murmurSource = ctx.createBufferSource();
        murmurSource.buffer = murmurBuf;
        murmurSource.loop = true;

        const f1 = ctx.createBiquadFilter();
        f1.type = 'bandpass';
        f1.frequency.setValueAtTime(600, ctx.currentTime);
        f1.Q.setValueAtTime(2.5, ctx.currentTime);

        const f2 = ctx.createBiquadFilter();
        f2.type = 'bandpass';
        f2.frequency.setValueAtTime(1400, ctx.currentTime);
        f2.Q.setValueAtTime(3.0, ctx.currentTime);

        murmurSource.connect(f1);
        murmurSource.connect(f2);
        f1.connect(this.filter);
        f2.connect(this.filter);

        murmurSource.start();
        this.activeNodes.push(murmurSource);
        break;
      }

      case 'windChimes': {
        // Pentatonic tuned metallic chime strikes
        const chimePitches = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50];

        const triggerChime = () => {
          if (!this.isRunning) return;
          const chimeTime = ctx.currentTime;
          const pitch = chimePitches[Math.floor(Math.random() * chimePitches.length)];

          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(pitch, chimeTime);

          const overtone = ctx.createOscillator();
          overtone.type = 'triangle';
          overtone.frequency.setValueAtTime(pitch * 2.76, chimeTime);

          const cGain = ctx.createGain();
          cGain.gain.setValueAtTime(0.001, chimeTime);
          cGain.gain.linearRampToValueAtTime(0.2, chimeTime + 0.01);
          cGain.gain.exponentialRampToValueAtTime(0.0001, chimeTime + 3.8);

          osc.connect(cGain);
          overtone.connect(cGain);
          cGain.connect(this.filter);

          osc.start(chimeTime);
          overtone.start(chimeTime);
          osc.stop(chimeTime + 4.0);
          overtone.stop(chimeTime + 4.0);

          const nextInterval = 1200 + Math.random() * 3200;
          const timer = window.setTimeout(triggerChime, nextInterval);
          this.activeNodes.push(timer);
        };

        const chimeTimer = window.setTimeout(triggerChime, 800);
        this.activeNodes.push(chimeTimer);
        break;
      }
    }
  }

  private cleanupNodes(): void {
    this.activeNodes.forEach((node) => {
      if (typeof node === 'number') {
        clearTimeout(node);
      } else {
        try {
          if ('stop' in node && typeof (node as AudioScheduledSourceNode).stop === 'function') {
            (node as AudioScheduledSourceNode).stop();
          }
          node.disconnect();
        } catch {
          // Ignore already stopped nodes
        }
      }
    });
    this.activeNodes = [];
  }
}

// Layer manager singleton that coordinates all procedural audio channels
class SoundLayersManager {
  private layers: Map<SoundLayerId, ProceduralLayer> = new Map();

  public getOrCreateLayer(layerId: SoundLayerId): ProceduralLayer {
    const ctx = audioManager.getContext();
    if (!this.layers.has(layerId)) {
      this.layers.set(layerId, new ProceduralLayer(ctx, layerId));
    }
    return this.layers.get(layerId)!;
  }

  public syncLayerState(layerState: SoundLayerState, anySolo: boolean): void {
    const layer = this.getOrCreateLayer(layerState.id);
    const shouldPlay = layerState.enabled && !layerState.muted && (!anySolo || layerState.solo);

    if (shouldPlay) {
      layer.start();
      layer.setVolume(layerState.volume);
      layer.setPan(layerState.pan);
      layer.setFilterFreq(layerState.filterFreq);
      layer.updateSpatial(layerState.spatialX, layerState.spatialY);
    } else {
      layer.stop();
    }
  }

  public stopAll(): void {
    this.layers.forEach((layer) => layer.stop());
  }
}

export const soundLayersManager = new SoundLayersManager();
