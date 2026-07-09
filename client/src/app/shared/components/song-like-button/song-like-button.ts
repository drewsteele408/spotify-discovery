import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';

import { LikedTracksService } from '../../../core/services/liked-tracks.service';
import { SpotifyDataService } from '../../../core/services/spotify-data.service';
import { extractApiErrorMessage } from '../../../core/utils/api-error';

type ButtonState = 'idle' | 'resolving' | 'toggling' | 'not-found' | 'error';

/**
 * "Like" toggle for a track's Liked Songs status. Same dual-input contract as
 * SongPlayButton: pass `id` directly for any track fetched from our own API, or
 * `artist`/`title` for a Gemini-recommended pair with no Spotify id yet — the first click
 * resolves it via GET /api/spotify/search-track before checking/toggling its liked state.
 * Reactive liked/unliked rendering comes from LikedTracksService, which list components
 * prime in bulk via primeIds() so most buttons never need their own network round trip.
 */
@Component({
  selector: 'app-song-like-button',
  imports: [],
  templateUrl: './song-like-button.html',
  styleUrl: './song-like-button.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SongLikeButton {
  private readonly spotifyData = inject(SpotifyDataService);
  private readonly likedTracks = inject(LikedTracksService);

  readonly id = input<string | null>(null);
  readonly artist = input<string>('');
  readonly title = input<string>('');

  protected readonly state = signal<ButtonState>('idle');
  protected readonly errorMessage = signal<string | null>(null);
  private readonly searchedId = signal<string | null>(null);

  private readonly effectiveId = computed(() => this.id() ?? this.searchedId());
  protected readonly liked = computed(() => {
    const id = this.effectiveId();
    return id ? this.likedTracks.isLiked(id) : undefined;
  });

  protected async onButtonClick(): Promise<void> {
    const id = this.effectiveId();

    if (id) {
      await this.toggle(id);
      return;
    }

    await this.resolveThenToggle();
  }

  private async resolveThenToggle(): Promise<void> {
    this.state.set('resolving');
    this.errorMessage.set(null);

    this.spotifyData.searchTrack(this.artist(), this.title()).subscribe({
      next: async ({ track }) => {
        if (!track?.id) {
          this.state.set('not-found');
          return;
        }

        this.searchedId.set(track.id);
        await this.likedTracks.primeIds([track.id]);
        await this.toggle(track.id);
      },
      error: (err) => {
        this.errorMessage.set(extractApiErrorMessage(err, 'Unable to search Spotify for this track.'));
        this.state.set('error');
      },
    });
  }

  private async toggle(id: string): Promise<void> {
    this.state.set('toggling');
    this.errorMessage.set(null);

    try {
      await this.likedTracks.toggle(id);
      this.state.set('idle');
    } catch (err) {
      this.errorMessage.set(extractApiErrorMessage(err, 'Unable to update Liked Songs.'));
      this.state.set('error');
    }
  }
}
