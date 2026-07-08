import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { SpotifyDataService } from '../../core/services/spotify-data.service';
import { PlaylistSummary, PlaylistTrackSummary } from '../../core/models/spotify.model';
import { extractApiErrorMessage } from '../../core/utils/api-error';
import { SongPlayButton } from '../../shared/components/song-play-button/song-play-button';

type ViewState = 'idle' | 'loading' | 'loaded' | 'error';

const DEFAULT_LIMIT = 20;

interface PlaylistTracksState {
  state: ViewState;
  tracks: PlaylistTrackSummary[];
  errorMessage: string | null;
}

@Component({
  selector: 'app-user-playlists',
  imports: [ReactiveFormsModule, SongPlayButton],
  templateUrl: './user-playlists.html',
  styleUrl: './user-playlists.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserPlaylists implements OnInit {
  private readonly spotifyData = inject(SpotifyDataService);
  private readonly fb = inject(FormBuilder);

  protected readonly form = this.fb.nonNullable.group({
    limit: null as number | null,
    offset: 0,
  });

  protected readonly state = signal<ViewState>('idle');
  protected readonly playlists = signal<PlaylistSummary[]>([]);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly canGoPrevious = computed(() => this.form.controls.offset.value > 0);

  /** Which playlists currently have their track list expanded; more than one may be open at once. */
  protected readonly expandedPlaylistIds = signal<ReadonlySet<string>>(new Set());
  protected readonly tracksByPlaylistId = signal<Record<string, PlaylistTracksState>>({});

  ngOnInit() {
    this.fetch();
  }

  protected isExpanded(playlistId: string | null): boolean {
    return !!playlistId && this.expandedPlaylistIds().has(playlistId);
  }

  protected getTracksState(playlistId: string | null): PlaylistTracksState | undefined {
    return playlistId ? this.tracksByPlaylistId()[playlistId] : undefined;
  }

  protected toggleExpand(playlist: PlaylistSummary) {
    const playlistId = playlist.id;

    if (!playlistId) {
      return;
    }

    const isCurrentlyExpanded = this.expandedPlaylistIds().has(playlistId);

    this.expandedPlaylistIds.update((current) => {
      const next = new Set(current);

      if (isCurrentlyExpanded) {
        next.delete(playlistId);
      } else {
        next.add(playlistId);
      }

      return next;
    });

    if (isCurrentlyExpanded || this.tracksByPlaylistId()[playlistId]) {
      return;
    }

    this.loadTracks(playlistId);
  }

  private loadTracks(playlistId: string) {
    this.tracksByPlaylistId.update((current) => ({
      ...current,
      [playlistId]: { state: 'loading', tracks: [], errorMessage: null },
    }));

    this.spotifyData.getPlaylistTracks(playlistId).subscribe({
      next: ({ tracks }) => {
        this.tracksByPlaylistId.update((current) => ({
          ...current,
          [playlistId]: { state: 'loaded', tracks, errorMessage: null },
        }));
      },
      error: (err) => {
        this.tracksByPlaylistId.update((current) => ({
          ...current,
          [playlistId]: {
            state: 'error',
            tracks: [],
            errorMessage: extractApiErrorMessage(err, 'Unable to retrieve tracks for this playlist.'),
          },
        }));
      },
    });
  }

  protected onSubmit() {
    this.form.patchValue({ offset: 0 });
    this.fetch();
  }

  protected onNextPage() {
    const limit = this.form.getRawValue().limit ?? DEFAULT_LIMIT;
    this.form.patchValue({ offset: this.form.controls.offset.value + limit });
    this.fetch();
  }

  protected onPreviousPage() {
    const limit = this.form.getRawValue().limit ?? DEFAULT_LIMIT;
    const nextOffset = Math.max(0, this.form.controls.offset.value - limit);
    this.form.patchValue({ offset: nextOffset });
    this.fetch();
  }

  private fetch() {
    const { limit, offset } = this.form.getRawValue();

    this.state.set('loading');
    this.errorMessage.set(null);

    this.spotifyData
      .getUserPlaylists({ limit: limit ?? undefined, offset: offset || undefined })
      .subscribe({
        next: ({ playlists }) => {
          this.playlists.set(playlists);
          this.state.set('loaded');
        },
        error: (err) => {
          this.errorMessage.set(extractApiErrorMessage(err, 'Unable to retrieve your playlists.'));
          this.state.set('error');
        },
      });
  }
}
