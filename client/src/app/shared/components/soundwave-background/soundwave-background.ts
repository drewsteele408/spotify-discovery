import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  computed,
  inject,
  viewChild,
} from '@angular/core';

import { SpotifyPlayerService } from '../../../core/services/spotify-player.service';

interface WaveLayer {
  baseY: number;
  freq1: number;
  freq2: number;
  speedMul: number;
  phaseOffset: number;
  ampMul: number;
  lineWidth: number;
  // opacity: number;
  colorVar: string;
}

const LAYERS: WaveLayer[] = [
  {
    baseY: 0.47,
    freq1: 0.006,
    freq2: 0.014,
    speedMul: 1,
    phaseOffset: 0,
    ampMul: 1,
    lineWidth: 2.5,
    // opacity: 10,
    colorVar: '--color-accent-neon-blue',
  },
  {
    baseY: 0.5,
    freq1: 0.005,
    freq2: 0.011,
    speedMul: -0.8,
    phaseOffset: 2.1,
    ampMul: 1.2,
    lineWidth: 2,
    // opacity: 0.5,
    colorVar: '--color-accent-neon-blue',
  },
  {
    baseY: 0.53,
    freq1: 0.007,
    freq2: 0.016,
    speedMul: 0.65,
    phaseOffset: 4.4,
    ampMul: 0.85,
    lineWidth: 2,
    // opacity: 0.45,
    colorVar: '--color-accent-neon-blue',
  },
   {
    baseY: 0.42,
    freq1: 0.017,
    freq2: 0.011,
    speedMul: -0.5,
    phaseOffset: 3.7,
    ampMul: 0.45,
    lineWidth: 2,
    // opacity: 0.45,
    colorVar: '--color-accent-neon-blue',
  },
   {
    baseY: 0.4,
    freq1: 0.018,
    freq2: 0.007,
    speedMul: 0.88,
    phaseOffset: 2.9,
    ampMul: 0.33,
    lineWidth: 2,
    // opacity: 0.45,
    colorVar: '--color-accent-neon-blue',
  },
   {
    baseY: 0.45,
    freq1: 0.018,
    freq2: 0.007,
    speedMul: 0.88,
    phaseOffset: 4.2,
    ampMul: 0.89,
    lineWidth: 2,
    // opacity: 0.45,
    colorVar: '--color-accent-neon-blue',
  },
];

const IDLE_AMPLITUDE = 9;
const PLAYING_AMPLITUDE = 32;
const IDLE_SPEED = 5;
const PLAYING_SPEED = 10;
const PULSE_FREQ = 2.6;
const PULSE_DEPTH = 0.22;
const EASE_TAU = 0.55;

/**
 * Full-viewport animated background used behind the Dashboard and Recommendations pages.
 * Draws three layered soundwave-like lines on a <canvas>. Since Spotify's Web Playback SDK
 * plays audio through a DRM-protected (EME) pipeline, the browser's Web Audio API cannot
 * tap into it for real waveform data — so "reacting to music" here means easing amplitude/
 * speed up when SpotifyPlayerService reports something playing, plus a synthetic on-beat
 * pulse, rather than a real-time FFT of the actual audio signal.
 */
@Component({
  selector: 'app-soundwave-background',
  imports: [],
  templateUrl: './soundwave-background.html',
  styleUrl: './soundwave-background.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SoundwaveBackground implements OnDestroy {
  private readonly player = inject(SpotifyPlayerService);
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  protected readonly isPlaying = computed(() => !!this.player.currentUri() && !this.player.isPaused());

  private ctx: CanvasRenderingContext2D | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private rafId = 0;
  private lastFrameMs = 0;
  private width = 0;
  private height = 0;
  private colors: string[] = [];
  private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  private time = 0;
  private amplitude = IDLE_AMPLITUDE;
  private speed = IDLE_SPEED;
  private pulseStrength = 0;

  constructor() {
    afterNextRender(() => this.init());
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.rafId);
    this.resizeObserver?.disconnect();
  }

  private init() {
    const canvas = this.canvasRef().nativeElement;
    this.ctx = canvas.getContext('2d');

    if (!this.ctx) {
      return;
    }

    const rootStyle = getComputedStyle(document.documentElement);
    this.colors = LAYERS.map((layer) => rootStyle.getPropertyValue(layer.colorVar).trim());

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();

    if (this.reducedMotion) {
      this.draw(0);
      return;
    }

    this.rafId = requestAnimationFrame(this.tick);
  }

  private resize() {
    if (!this.ctx) {
      return;
    }

    const canvas = this.canvasRef().nativeElement;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = canvas.clientWidth;
    this.height = canvas.clientHeight;
    canvas.width = this.width * dpr;
    canvas.height = this.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (this.reducedMotion) {
      this.draw(0);
    }
  }

  private readonly tick = (nowMs: number) => {
    const dt = this.lastFrameMs ? Math.min((nowMs - this.lastFrameMs) / 1000, 0.1) : 0;
    this.lastFrameMs = nowMs;

    this.draw(dt);

    this.rafId = requestAnimationFrame(this.tick);
  };

  private draw(dt: number) {
    const ctx = this.ctx;

    if (!ctx || !this.width || !this.height) {
      return;
    }

    const playing = this.isPlaying();
    const ease = 1 - Math.exp(-dt / EASE_TAU);

    this.amplitude += ((playing ? PLAYING_AMPLITUDE : IDLE_AMPLITUDE) - this.amplitude) * ease;
    this.speed += ((playing ? PLAYING_SPEED : IDLE_SPEED) - this.speed) * ease;
    this.pulseStrength += ((playing ? 1 : 0) - this.pulseStrength) * ease;
    this.time += this.speed * dt;

    const pulse = 1 + this.pulseStrength * PULSE_DEPTH * Math.sin(this.time * PULSE_FREQ);

    ctx.clearRect(0, 0, this.width, this.height);

    LAYERS.forEach((layer, i) => {
      const phase = this.time * layer.speedMul + layer.phaseOffset;
      const baseY = this.height * layer.baseY;
      const amp = this.amplitude * layer.ampMul * pulse;

      ctx.beginPath();

      const step = 8;
      for (let x = 0; x <= this.width + step; x += step) {
        const y =
          baseY +
          Math.sin(x * layer.freq1 + phase) * amp +
          Math.sin(x * layer.freq2 + phase * 1.7) * amp * 0.4;

        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.strokeStyle = this.colors[i];
      ctx.lineWidth = layer.lineWidth;
      // ctx.globalAlpha = layer.opacity;
      ctx.shadowColor = this.colors[i];
      ctx.shadowBlur = 16;
      ctx.stroke();
    });

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }
}
