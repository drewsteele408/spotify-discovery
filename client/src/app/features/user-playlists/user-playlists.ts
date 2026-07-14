import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { SpotifyDataService } from '../../core/services/spotify-data.service';
import { LikedTracksService } from '../../core/services/liked-tracks.service';
import { PlaylistSummary, PlaylistTrackSummary } from '../../core/models/spotify.model';
import { extractApiErrorMessage } from '../../core/utils/api-error';
import { SongPlayButton } from '../../shared/components/song-play-button/song-play-button';
import { SongLikeButton } from '../../shared/components/song-like-button/song-like-button';
import { SongAddToPlaylistButton } from '../../shared/components/song-add-to-playlist-button/song-add-to-playlist-button';

type ViewState = 'idle' | 'loading' | 'loaded' | 'error';
type CreateState = 'idle' | 'creating' | 'error';

const DEFAULT_LIMIT = 20;

interface PlaylistTracksState {
  state: ViewState;
  tracks: PlaylistTrackSummary[];
  errorMessage: string | null;
}

@Component({
  selector: 'app-user-playlists',
  imports: [ReactiveFormsModule, SongPlayButton, SongLikeButton, SongAddToPlaylistButton],
  templateUrl: './user-playlists.html',
  styleUrl: './user-playlists.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserPlaylists implements OnInit {
  private readonly spotifyData = inject(SpotifyDataService);
  private readonly fb = inject(FormBuilder);
  private readonly likedTracks = inject(LikedTracksService);

  protected readonly form = this.fb.nonNullable.group({
    limit: null as number | null,
    offset: 0,
  });

  protected readonly createForm = this.fb.nonNullable.group({
    name: '',
    description: '',
    isPublic: false,
  });

  protected readonly state = signal<ViewState>('idle');
  protected readonly playlists = signal<PlaylistSummary[]>([]);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly createState = signal<CreateState>('idle');
  protected readonly createErrorMessage = signal<string | null>(null);
  protected readonly deletingPlaylistId = signal<string | null>(null);
  protected readonly deleteErrorMessage = signal<string | null>(null);

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
        this.likedTracks.primeIds(tracks.map((track) => track.id).filter((id): id is string => !!id));
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

  protected onCreateSubmit() {
    const { name, description, isPublic } = this.createForm.getRawValue();
    const trimmedName = name.trim();

    if (!trimmedName) {
      return;
    }

    this.createState.set('creating');
    this.createErrorMessage.set(null);

    this.spotifyData
      .createPlaylist({ name: trimmedName, description: description.trim(), isPublic })
      .subscribe({
        next: ({ playlist }) => {
          this.playlists.update((current) => [playlist, ...current]);
          this.createForm.reset({ name: '', description: '', isPublic: false });
          this.createState.set('idle');
        },
        error: (err) => {
          this.createErrorMessage.set(extractApiErrorMessage(err, 'Unable to create this playlist.'));
          this.createState.set('error');
        },
      });
  }

  protected onDeletePlaylist(playlist: PlaylistSummary, event: Event) {
    event.stopPropagation();

    const playlistId = playlist.id;

    if (!playlistId || this.deletingPlaylistId()) {
      return;
    }

    if (!confirm(`Delete "${playlist.name}" from your Spotify account? This can't be undone.`)) {
      return;
    }

    this.deletingPlaylistId.set(playlistId);
    this.deleteErrorMessage.set(null);

    this.spotifyData.deletePlaylist(playlistId).subscribe({
      next: () => {
        this.playlists.update((current) => current.filter((p) => p.id !== playlistId));

        this.expandedPlaylistIds.update((current) => {
          const next = new Set(current);
          next.delete(playlistId);
          return next;
        });

        this.tracksByPlaylistId.update((current) => {
          const { [playlistId]: _removed, ...rest } = current;
          return rest;
        });

        this.deletingPlaylistId.set(null);
      },
      error: (err) => {
        this.deleteErrorMessage.set(extractApiErrorMessage(err, 'Unable to delete this playlist.'));
        this.deletingPlaylistId.set(null);
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
