import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';

import { AddToPlaylistModalService } from '../../../core/services/add-to-playlist-modal.service';
import { SpotifyDataService } from '../../../core/services/spotify-data.service';
import { extractApiErrorMessage } from '../../../core/utils/api-error';

type ButtonState = 'idle' | 'resolving' | 'not-found' | 'error';

/**
 * Opens the shared add-to-playlist modal (AddToPlaylistModalService) for a track. Same
 * dual-input contract as SongPlayButton/SongLikeButton: pass `id`/`uri` directly when known,
 * or `artist`/`title` for a Gemini-recommended pair with no Spotify id — the first click
 * resolves it via GET /api/spotify/search-track so the modal itself never needs to.
 */
@Component({
  selector: 'app-song-add-to-playlist-button',
  imports: [],
  templateUrl: './song-add-to-playlist-button.html',
  styleUrl: './song-add-to-playlist-button.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SongAddToPlaylistButton {
  private readonly spotifyData = inject(SpotifyDataService);
  private readonly modal = inject(AddToPlaylistModalService);

  readonly id = input<string | null>(null);
  readonly uri = input<string | null>(null);
  readonly artist = input<string>('');
  readonly title = input<string>('');

  protected readonly state = signal<ButtonState>('idle');
  protected readonly errorMessage = signal<string | null>(null);

  protected onButtonClick(): void {
    const uri = this.uri();

    if (uri) {
      this.modal.open({ id: this.id(), uri, artist: this.artist(), title: this.title() });
      return;
    }

    this.resolveThenOpen();
  }

  private resolveThenOpen(): void {
    this.state.set('resolving');
    this.errorMessage.set(null);

    this.spotifyData.searchTrack(this.artist(), this.title()).subscribe({
      next: ({ track }) => {
        this.state.set('idle');

        if (!track?.uri) {
          this.state.set('not-found');
          return;
        }

        this.modal.open({ id: track.id, uri: track.uri, artist: this.artist(), title: this.title() });
      },
      error: (err) => {
        this.errorMessage.set(extractApiErrorMessage(err, 'Unable to search Spotify for this track.'));
        this.state.set('error');
      },
    });
  }
}
