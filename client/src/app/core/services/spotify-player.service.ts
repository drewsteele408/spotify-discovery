import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { SpotifyDataService } from './spotify-data.service';

interface SpotifyPlayerState {
  paused: boolean;
  track_window: { current_track: { uri: string } };
}

interface SpotifyPlayerInstance {
  connect(): Promise<boolean>;
  disconnect(): void;
  addListener(event: string, callback: (payload: never) => void): void;
  togglePlay(): Promise<void>;
}

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady?: () => void;
    Spotify?: {
      Player: new (options: {
        name: string;
        getOAuthToken: (callback: (token: string) => void) => void;
        volume?: number;
      }) => SpotifyPlayerInstance;
    };
  }
}

const SDK_SCRIPT_URL = 'https://sdk.scdn.co/spotify-player.js';
const SDK_SCRIPT_ID = 'spotify-player-sdk';

/**
 * Thin wrapper around Spotify's Web Playback SDK. Turns this browser tab into a Spotify
 * Connect device so recommended tracks can be played on the site itself (Premium required —
 * Spotify rejects playback for Free accounts via the `account_error` player event).
 */
@Injectable({ providedIn: 'root' })
export class SpotifyPlayerService {
  private readonly spotifyData = inject(SpotifyDataService);

  private player: SpotifyPlayerInstance | null = null;
  private connectPromise: Promise<string> | null = null;

  /** Uri of the track currently loaded in this browser's player, if any. */
  readonly currentUri = signal<string | null>(null);
  readonly isPaused = signal(true);
  readonly errorMessage = signal<string | null>(null);

  /** Loads the SDK (once) and connects a player, resolving with its Spotify Connect device id. */
  connect(): Promise<string> {
    if (!this.connectPromise) {
      this.connectPromise = this.loadSdk()
        .then(() => this.createPlayer())
        .catch((err) => {
          this.connectPromise = null;
          throw err;
        });
    }

    return this.connectPromise;
  }

  /** Ensures a player device exists, then asks the backend to start `uri` playing on it. */
  async playUri(uri: string): Promise<void> {
    this.errorMessage.set(null);
    const deviceId = await this.connect();
    await firstValueFrom(this.spotifyData.startPlayback(deviceId, uri));
  }

  /** Pauses/resumes whatever is currently loaded — handled locally by the SDK, no backend call. */
  async togglePlay(): Promise<void> {
    await this.player?.togglePlay();
  }

  private loadSdk(): Promise<void> {
    if (window.Spotify) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      window.onSpotifyWebPlaybackSDKReady = () => resolve();

      if (document.getElementById(SDK_SCRIPT_ID)) {
        return;
      }

      const script = document.createElement('script');
      script.id = SDK_SCRIPT_ID;
      script.src = SDK_SCRIPT_URL;
      script.async = true;
      script.onerror = () => reject(new Error('Failed to load the Spotify Web Playback SDK.'));
      document.head.appendChild(script);
    });
  }

  private createPlayer(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!window.Spotify) {
        reject(new Error('Spotify Web Playback SDK did not load.'));
        return;
      }

      const player = new window.Spotify.Player({
        name: 'Spotify Discovery Web Player',
        volume: 0.8,
        getOAuthToken: (callback) => {
          this.spotifyData.getPlayerToken().subscribe({
            next: ({ accessToken }) => callback(accessToken),
            error: () =>
              this.errorMessage.set('Your session has expired — please log out and log back in.'),
          });
        },
      });

      player.addListener('ready', (payload) => {
        const { device_id: deviceId } = payload as { device_id: string };
        resolve(deviceId);
      });

      player.addListener('player_state_changed', (payload) => {
        const state = payload as SpotifyPlayerState | null;

        if (!state) {
          return;
        }

        this.isPaused.set(state.paused);
        this.currentUri.set(state.track_window?.current_track?.uri ?? null);
      });

      player.addListener('initialization_error', (payload) => {
        const { message } = payload as { message: string };
        this.errorMessage.set(message || 'Failed to initialize the player.');
        reject(new Error(message));
      });

      player.addListener('authentication_error', (payload) => {
        const { message } = payload as { message: string };
        this.errorMessage.set('Spotify authentication failed — please log out and log back in.');
        reject(new Error(message));
      });

      player.addListener('account_error', (payload) => {
        const { message } = payload as { message: string };
        this.errorMessage.set('Playing songs in-browser requires a Spotify Premium account.');
        reject(new Error(message));
      });

      this.player = player;
      player.connect();
    });
  }
}
