import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';

import { PlaylistSummary } from '../../../core/models/spotify.model';
import { AddToPlaylistModalService } from '../../../core/services/add-to-playlist-modal.service';
import { SpotifyDataService } from '../../../core/services/spotify-data.service';
import { extractApiErrorMessage } from '../../../core/utils/api-error';

type LoadState = 'idle' | 'loading' | 'loaded' | 'error';

/**
 * Single global modal, mounted once in app.html, driven entirely by AddToPlaylistModalService.
 * Every song-add-to-playlist-button in the app opens this same instance rather than each
 * track row owning its own modal.
 */
@Component({
  selector: 'app-add-to-playlist-modal',
  imports: [],
  templateUrl: './add-to-playlist-modal.html',
  styleUrl: './add-to-playlist-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddToPlaylistModal {
  protected readonly modal = inject(AddToPlaylistModalService);
  private readonly spotifyData = inject(SpotifyDataService);

  protected readonly loadState = signal<LoadState>('idle');
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly playlists = signal<PlaylistSummary[]>([]);
  protected readonly addingPlaylistId = signal<string | null>(null);
  protected readonly addedPlaylistId = signal<string | null>(null);

  constructor() {
    effect(() => {
      if (this.modal.isOpen()) {
        this.load();
      }
    });
  }

  private load(): void {
    this.loadState.set('loading');
    this.errorMessage.set(null);
    this.addedPlaylistId.set(null);

    this.spotifyData.getUserPlaylists().subscribe({
      next: ({ playlists }) => {
        this.playlists.set(playlists);
        this.loadState.set('loaded');
      },
      error: (err) => {
        this.errorMessage.set(extractApiErrorMessage(err, 'Unable to load your playlists.'));
        this.loadState.set('error');
      },
    });
  }

  protected addToPlaylist(playlistId: string | null): void {
    const target = this.modal.target();

    if (!playlistId || !target?.uri) {
      return;
    }

    this.addingPlaylistId.set(playlistId);
    this.errorMessage.set(null);

    this.spotifyData.addTrackToPlaylist(playlistId, target.uri).subscribe({
      next: () => {
        this.addingPlaylistId.set(null);
        this.addedPlaylistId.set(playlistId);
      },
      error: (err) => {
        this.addingPlaylistId.set(null);
        this.errorMessage.set(extractApiErrorMessage(err, 'Unable to add this track to the playlist.'));
      },
    });
  }

  protected close(): void {
    this.modal.close();
  }
}
