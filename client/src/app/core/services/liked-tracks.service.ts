import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { LikedTracksMap } from '../models/spotify.model';
import { SpotifyDataService } from './spotify-data.service';

/**
 * Caches this session's known Liked Songs status by Spotify track id, so a whole rendered
 * list of tracks (top tracks, saved tracks, recently played, a playlist) can learn its
 * initial liked state with a single batched GET /api/liked-songs/contains call rather than
 * one call per song-like-button.
 */
@Injectable({ providedIn: 'root' })
export class LikedTracksService {
  private readonly spotifyData = inject(SpotifyDataService);

  private readonly likedById = signal<LikedTracksMap>({});
  private readonly pendingIds = new Set<string>();

  /** Undefined means "not checked yet" — distinct from a known `false`. */
  isLiked(id: string): boolean | undefined {
    return this.likedById()[id];
  }

  /** Batches a single contains-check for any of the given ids not already known/in flight. */
  async primeIds(ids: string[]): Promise<void> {
    const known = this.likedById();
    const idsToCheck = [...new Set(ids)].filter(
      (id) => id && known[id] === undefined && !this.pendingIds.has(id)
    );

    if (!idsToCheck.length) {
      return;
    }

    idsToCheck.forEach((id) => this.pendingIds.add(id));

    try {
      const { liked } = await firstValueFrom(this.spotifyData.checkLikedTracks(idsToCheck));
      this.likedById.update((current) => ({ ...current, ...liked }));
    } finally {
      idsToCheck.forEach((id) => this.pendingIds.delete(id));
    }
  }

  /** Optimistically flips the liked state for `id`, rolling back if the API call fails. */
  async toggle(id: string): Promise<void> {
    const previous = this.likedById()[id] ?? false;
    const next = !previous;

    this.likedById.update((current) => ({ ...current, [id]: next }));

    try {
      await firstValueFrom(next ? this.spotifyData.likeTrack(id) : this.spotifyData.unlikeTrack(id));
    } catch (err) {
      this.likedById.update((current) => ({ ...current, [id]: previous }));
      throw err;
    }
  }
}
