export type BrainwaveType = 'delta' | 'theta' | 'alpha' | 'beta' | 'gamma';

export interface BrainwavePreset {
  type: BrainwaveType;
  name: string;
  frequency: number; // in Hz
  range: string;
  description: string;
  benefits: string;
  recommendedCarrier: number;
}

export type SoundLayerId = 
  | 'rain'
  | 'thunder'
  | 'ocean'
  | 'wind'
  | 'campfire'
  | 'cosmic'
  | 'singingBowl'
  | 'earthDrone'
  | 'crickets'
  | 'coffeehouse'
  | 'windChimes';

export interface SoundLayerState {
  id: SoundLayerId;
  name: string;
  category: 'nature' | 'elements' | 'ethereal' | 'urban';
  icon: string;
  enabled: boolean;
  volume: number; // 0 to 1
  pan: number; // -1 (left) to 1 (right)
  spatialX: number; // -100 to 100
  spatialY: number; // -100 to 100
  pitch: number; // 0.5 to 2.0 (or filter sweep)
  filterFreq: number; // 200 to 18000
  muted: boolean;
  solo: boolean;
}

export interface BinauralState {
  enabled: boolean;
  carrierFreq: number; // 40 - 1000 Hz (e.g. 432 Hz, 528 Hz)
  beatFreq: number; // 0.5 - 45 Hz
  waveType: BrainwaveType;
  volume: number; // 0 - 1
  isochronic: boolean;
  isochronicDepth: number; // 0 - 1
  isochronicRate: number; // 0.5 - 20 Hz
  harmonicOvertones: boolean;
}

export interface ArpeggiatorState {
  enabled: boolean;
  bpm: number;
  scale: 'pentatonic' | 'dorian' | 'lydian' | 'hirajoshi' | 'ragaBhairav' | 'aeolian';
  rootNote: string; // 'C', 'D', 'E', 'F', 'G', 'A', 'B'
  octave: number; // 3, 4, 5
  pattern: 'up' | 'down' | 'random' | 'generativeZen';
  density: number; // probability of note trigger 0.1 to 1.0
  volume: number;
  delayFeedback: number;
  reverbSend: number;
}

export interface MasterFXState {
  volume: number; // 0 to 1
  eqLow: number; // -12 to 12 dB (at 100Hz)
  eqMid: number; // -12 to 12 dB (at 1000Hz)
  eqHigh: number; // -12 to 12 dB (at 8000Hz)
  reverbMix: number; // 0 to 1
  reverbDecay: number; // 1 to 10 seconds
  tapeWarmth: number; // 0 to 1
  filterCutoff: number; // 200 to 20000 Hz
}

export interface BreathworkConfig {
  enabled: boolean;
  mode: 'box' | 'relax478' | 'calmPranayama' | 'focusEqual';
  inhale: number; // seconds
  hold1: number;
  exhale: number;
  hold2: number;
  cueAudio: boolean;
}

export interface SoundscapeRecipe {
  id: string;
  title: string;
  description: string;
  tag: string;
  layers: Partial<Record<SoundLayerId, { enabled: boolean; volume: number; pan?: number; spatialX?: number; spatialY?: number }>>;
  binaural: Partial<BinauralState>;
  arpeggiator?: Partial<ArpeggiatorState>;
  masterFX?: Partial<MasterFXState>;
  breathingMode?: 'box' | 'relax478' | 'calmPranayama' | 'focusEqual';
}

export type VisualizerMode = 'spectrum' | 'waveform' | 'mandala' | 'spatial';
