import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';

import { SpotifyDataService } from '../../../core/services/spotify-data.service';
import { SpotifyPlayerService } from '../../../core/services/spotify-player.service';
import { extractApiErrorMessage } from '../../../core/utils/api-error';

type ButtonState = 'idle' | 'loading' | 'not-found' | 'ready' | 'error';

/**
 * "Play" button for a Gemini-recommended {artist, title} pair (see RecommendationItem —
 * it has no Spotify id). First click resolves it to a real track via
 * GET /api/spotify/search-track, then hands the uri to SpotifyPlayerService to start
 * playback on this browser's Web Playback SDK device. Later clicks toggle play/pause
 * locally once the track is loaded.
 */
@Component({
  selector: 'app-song-play-button',
  imports: [],
  templateUrl: './song-play-button.html',
  styleUrl: './song-play-button.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SongPlayButton {
  private readonly spotifyData = inject(SpotifyDataService);
  protected readonly player = inject(SpotifyPlayerService);

  readonly artist = input.required<string>();
  readonly title = input.required<string>();

  protected readonly state = signal<ButtonState>('idle');
  protected readonly errorMessage = signal<string | null>(null);
  private readonly resolvedUri = signal<string | null>(null);

  /** Whether the track loaded in this browser's player right now is *this* button's track. */
  protected readonly isThisTrack = computed(
    () => !!this.resolvedUri() && this.resolvedUri() === this.player.currentUri()
  );
  protected readonly isPlaying = computed(() => this.isThisTrack() && !this.player.isPaused());

  protected onButtonClick() {
    if (this.isThisTrack()) {
      this.player.togglePlay();
      return;
    }

    const uri = this.resolvedUri();

    if (uri) {
      this.startPlayback(uri);
      return;
    }

    this.search();
  }

  private search() {
    this.state.set('loading');
    this.errorMessage.set(null);

    this.spotifyData.searchTrack(this.artist(), this.title()).subscribe({
      next: ({ track }) => {
        if (!track?.uri) {
          this.state.set('not-found');
          return;
        }

        this.resolvedUri.set(track.uri);
        this.startPlayback(track.uri);
      },
      error: (err) => {
        this.errorMessage.set(extractApiErrorMessage(err, 'Unable to search Spotify for this track.'));
        this.state.set('error');
      },
    });
  }

  private startPlayback(uri: string) {
    this.state.set('loading');
    this.errorMessage.set(null);

    this.player
      .playUri(uri)
      .then(() => this.state.set('ready'))
      .catch(() => {
        this.errorMessage.set(this.player.errorMessage() ?? 'Unable to start playback.');
        this.state.set('error');
      });
  }
}
