/**
 * Core AudioContext & Master Effects Chain
 */

class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private eqLow: BiquadFilterNode | null = null;
  private eqMid: BiquadFilterNode | null = null;
  private eqHigh: BiquadFilterNode | null = null;
  private masterFilter: BiquadFilterNode | null = null;
  private saturator: WaveShaperNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;
  private dryGain: GainNode | null = null;
  private masterBus: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private recordDest: MediaStreamAudioDestinationNode | null = null;
  private isInitialized = false;

  public getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx({ sampleRate: 44100, latencyHint: 'interactive' });
      this.initMasterChain();
    }
    return this.ctx;
  }

  public async resume(): Promise<void> {
    const ctx = this.getContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
  }

  private initMasterChain(): void {
    if (this.isInitialized || !this.ctx) return;

    const ctx = this.ctx;

    // Master bus (all layers connect here)
    this.masterBus = ctx.createGain();
    this.masterBus.gain.setValueAtTime(1.0, ctx.currentTime);

    // Dry path & Reverb path
    this.dryGain = ctx.createGain();
    this.dryGain.gain.setValueAtTime(1.0, ctx.currentTime);

    this.reverbGain = ctx.createGain();
    this.reverbGain.gain.setValueAtTime(0.2, ctx.currentTime);

    this.reverbNode = ctx.createConvolver();
    this.reverbNode.buffer = this.createImpulseResponse(ctx, 3.5, 2.0);

    this.masterBus.connect(this.dryGain);
    this.masterBus.connect(this.reverbNode);
    this.reverbNode.connect(this.reverbGain);

    // Sum Dry + Wet to 3-band EQ
    const sumGain = ctx.createGain();
    this.dryGain.connect(sumGain);
    this.reverbGain.connect(sumGain);

    // 3-Band Parametric EQ
    this.eqLow = ctx.createBiquadFilter();
    this.eqLow.type = 'lowshelf';
    this.eqLow.frequency.setValueAtTime(120, ctx.currentTime);
    this.eqLow.gain.setValueAtTime(0, ctx.currentTime);

    this.eqMid = ctx.createBiquadFilter();
    this.eqMid.type = 'peaking';
    this.eqMid.frequency.setValueAtTime(1000, ctx.currentTime);
    this.eqMid.Q.setValueAtTime(0.8, ctx.currentTime);
    this.eqMid.gain.setValueAtTime(0, ctx.currentTime);

    this.eqHigh = ctx.createBiquadFilter();
    this.eqHigh.type = 'highshelf';
    this.eqHigh.frequency.setValueAtTime(8000, ctx.currentTime);
    this.eqHigh.gain.setValueAtTime(0, ctx.currentTime);

    sumGain.connect(this.eqLow);
    this.eqLow.connect(this.eqMid);
    this.eqMid.connect(this.eqHigh);

    // Master lowpass filter
    this.masterFilter = ctx.createBiquadFilter();
    this.masterFilter.type = 'lowpass';
    this.masterFilter.frequency.setValueAtTime(20000, ctx.currentTime);
    this.masterFilter.Q.setValueAtTime(0.7, ctx.currentTime);
    this.eqHigh.connect(this.masterFilter);

    // Tape Warmth / Soft Saturation
    this.saturator = ctx.createWaveShaper();
    this.saturator.curve = this.makeDistortionCurve(0);
    this.saturator.oversample = '2x';
    this.masterFilter.connect(this.saturator);

    // Master Gain
    this.masterGain = ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.8, ctx.currentTime);
    this.saturator.connect(this.masterGain);

    // Limiter / Safety compressor to prevent harsh clipping
    this.compressor = ctx.createDynamicsCompressor();
    this.compressor.threshold.setValueAtTime(-1.0, ctx.currentTime);
    this.compressor.knee.setValueAtTime(12, ctx.currentTime);
    this.compressor.ratio.setValueAtTime(12, ctx.currentTime);
    this.compressor.attack.setValueAtTime(0.003, ctx.currentTime);
    this.compressor.release.setValueAtTime(0.25, ctx.currentTime);
    this.masterGain.connect(this.compressor);

    // FFT & Waveform Analyser
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.85;
    this.compressor.connect(this.analyser);

    // Destination outputs (Speakers & Media Stream Destination for recording)
    this.analyser.connect(ctx.destination);

    this.recordDest = ctx.createMediaStreamDestination();
    this.analyser.connect(this.recordDest);

    this.isInitialized = true;
  }

  public getMasterBus(): GainNode | null {
    this.getContext();
    return this.masterBus;
  }

  public getAnalyser(): AnalyserNode | null {
    this.getContext();
    return this.analyser;
  }

  public getRecordDestination(): MediaStreamAudioDestinationNode | null {
    this.getContext();
    return this.recordDest;
  }

  public setMasterVolume(vol: number): void {
    if (!this.masterGain || !this.ctx) return;
    const clamped = Math.max(0, Math.min(1.2, vol));
    this.masterGain.gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.05);
  }

  public setEQ(low: number, mid: number, high: number): void {
    if (!this.ctx) return;
    if (this.eqLow) this.eqLow.gain.setTargetAtTime(low, this.ctx.currentTime, 0.05);
    if (this.eqMid) this.eqMid.gain.setTargetAtTime(mid, this.ctx.currentTime, 0.05);
    if (this.eqHigh) this.eqHigh.gain.setTargetAtTime(high, this.ctx.currentTime, 0.05);
  }

  public setReverb(mix: number, decaySec = 3.5): void {
    if (!this.ctx || !this.reverbGain || !this.dryGain || !this.reverbNode) return;
    const clampedMix = Math.max(0, Math.min(1, mix));
    this.reverbGain.gain.setTargetAtTime(clampedMix * 0.9, this.ctx.currentTime, 0.05);
    this.dryGain.gain.setTargetAtTime(1.0 - clampedMix * 0.3, this.ctx.currentTime, 0.05);
    
    // Refresh impulse buffer if decay changed significantly
    if (Math.abs(decaySec - 3.5) > 0.5) {
      this.reverbNode.buffer = this.createImpulseResponse(this.ctx, Math.max(0.5, decaySec), 2.0);
    }
  }

  public setTapeWarmth(amount: number): void {
    if (!this.saturator) return;
    this.saturator.curve = this.makeDistortionCurve(amount * 40);
  }

  public setMasterFilter(cutoff: number): void {
    if (!this.masterFilter || !this.ctx) return;
    this.masterFilter.frequency.setTargetAtTime(Math.max(200, Math.min(20000, cutoff)), this.ctx.currentTime, 0.05);
  }

  // Generates warm, airy synthetic hall impulse response
  private createImpulseResponse(ctx: AudioContext, duration: number, decay: number): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const impulse = ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * decay);
      // Soft early reflection burst + diffused tail
      const diffusion = Math.sin(t * 120) * 0.1;
      left[i] = ((Math.random() * 2 - 1) + diffusion) * envelope;
      right[i] = ((Math.random() * 2 - 1) - diffusion) * envelope;
    }
    return impulse;
  }

  // Smooth hyperbolic tangent soft-saturation curve for analog tape vibe
  private makeDistortionCurve(amount: number): Float32Array {
    const k = typeof amount === 'number' ? amount : 0;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      if (k === 0) {
        curve[i] = x;
      } else {
        curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
      }
    }
    return curve;
  }

  // Play a soothing singing bowl / Zen chime cue (e.g. For breathwork or pomodoro)
  public playChime(freq = 528, duration = 3.5): void {
    const ctx = this.getContext();
    if (!this.masterBus) return;

    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const chimeGain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    // Shimmering overtone
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2.76, ctx.currentTime);

    chimeGain.gain.setValueAtTime(0.001, ctx.currentTime);
    chimeGain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + 0.05);
    chimeGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    osc.connect(chimeGain);
    osc2.connect(chimeGain);
    chimeGain.connect(this.masterBus);

    osc.start(ctx.currentTime);
    osc2.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration + 0.1);
    osc2.stop(ctx.currentTime + duration + 0.1);
  }
}

export const audioManager = new AudioManager();
