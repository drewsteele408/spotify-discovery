import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  AddPlaylistItemsResult,
  ArtistSummary,
  FollowedArtistsResult,
  LikedTracksMap,
  PlaylistSummary,
  PlaylistTracksResult,
  RecentlyPlayedTrack,
  RecommendationItem,
  SpotifyTrackMatch,
  TrackSummary,
} from '../models/spotify.model';

export type TimeRange = 'short_term' | 'medium_term' | 'long_term';

export interface TopTracksParams {
  timeRange?: TimeRange;
  limit?: number;
}

export interface TopArtistsParams {
  timeRange?: TimeRange;
  limit?: number;
  offset?: number;
}

export interface LimitOnlyParams {
  limit?: number;
}

export interface FollowedArtistsParams {
  limit?: number;
  after?: string;
}

export interface PlaylistsParams {
  limit?: number;
  offset?: number;
}

export interface CreatePlaylistParams {
  name: string;
  description?: string;
  isPublic?: boolean;
}

const buildParams = (raw: Record<string, string | number | undefined>): HttpParams => {
  let params = new HttpParams();

  for (const [key, value] of Object.entries(raw)) {
    if (value !== undefined && value !== null && value !== '') {
      params = params.set(key, value);
    }
  }

  return params;
};

/**
 * Thin HttpClient wrappers around the six `/api/*` JSON routes added to
 * src/routes/api.js this session. Response shapes mirror TrackSummary /
 * ArtistSummary / RecentlyPlayedTrack / FollowedArtistsResult exactly
 * (see client/src/app/core/models/spotify.model.ts) — do not remap fields here.
 */
@Injectable({ providedIn: 'root' })
export class SpotifyDataService {
  private readonly http = inject(HttpClient);

  getTopTracks(params: TopTracksParams = {}): Observable<{ tracks: TrackSummary[] }> {
    return this.http.get<{ tracks: TrackSummary[] }>('/api/top-tracks', {
      params: buildParams({ time_range: params.timeRange, limit: params.limit }),
    });
  }

  getTopArtists(params: TopArtistsParams = {}): Observable<{ artists: ArtistSummary[] }> {
    return this.http.get<{ artists: ArtistSummary[] }>('/api/top-artists', {
      params: buildParams({
        time_range: params.timeRange,
        limit: params.limit,
        offset: params.offset,
      }),
    });
  }

  getSavedTracks(params: LimitOnlyParams = {}): Observable<{ tracks: TrackSummary[] }> {
    return this.http.get<{ tracks: TrackSummary[] }>('/api/saved-tracks', {
      params: buildParams({ limit: params.limit }),
    });
  }

  getRecentlyPlayed(params: LimitOnlyParams = {}): Observable<{ tracks: RecentlyPlayedTrack[] }> {
    return this.http.get<{ tracks: RecentlyPlayedTrack[] }>('/api/recently-played', {
      params: buildParams({ limit: params.limit }),
    });
  }

  getFollowedArtists(params: FollowedArtistsParams = {}): Observable<FollowedArtistsResult> {
    return this.http.get<FollowedArtistsResult>('/api/followed-artists', {
      params: buildParams({ limit: params.limit, after: params.after }),
    });
  }

  getUserPlaylists(params: PlaylistsParams = {}): Observable<{ playlists: PlaylistSummary[] }> {
    return this.http.get<{ playlists: PlaylistSummary[] }>('/api/playlists', {
      params: buildParams({ limit: params.limit, offset: params.offset }),
    });
  }

  getPlaylistTracks(playlistId: string): Observable<PlaylistTracksResult> {
    return this.http.get<PlaylistTracksResult>(`/api/playlists/${encodeURIComponent(playlistId)}/tracks`);
  }

  /** Creates a new playlist under the current user's Spotify account. */
  createPlaylist(params: CreatePlaylistParams): Observable<{ playlist: PlaylistSummary }> {
    return this.http.post<{ playlist: PlaylistSummary }>('/api/playlists', {
      name: params.name,
      description: params.description,
      isPublic: params.isPublic,
    });
  }

  /** Removes a playlist from the current user's Spotify account (unfollows it). */
  deletePlaylist(playlistId: string): Observable<void> {
    return this.http.delete<void>(`/api/playlists/${encodeURIComponent(playlistId)}`);
  }

  getSoundchartsSong(spotifyId: string): Observable<unknown> {
    return this.http.get<unknown>(`/api/soundcharts/song/${encodeURIComponent(spotifyId)}`);
  }

  getRecommendations(audio: unknown): Observable<{ recommendations: RecommendationItem[] }> {
    return this.http.post<{ recommendations: RecommendationItem[] }>('/songs/recommendations', {
      audio,
    });
  }

  /** Resolves a Gemini-recommended {artist, title} pair to a real Spotify track/uri. */
  searchTrack(artist: string, title: string): Observable<{ track: SpotifyTrackMatch | null }> {
    return this.http.get<{ track: SpotifyTrackMatch | null }>('/api/spotify/search-track', {
      params: buildParams({ artist, title }),
    });
  }

  /** Raw Spotify access token, handed to the Web Playback SDK's `getOAuthToken` callback. */
  getPlayerToken(): Observable<{ accessToken: string }> {
    return this.http.get<{ accessToken: string }>('/api/player/token');
  }

  /** Starts playback of `uri` on the given Web Playback SDK device. */
  startPlayback(deviceId: string, uri: string): Observable<void> {
    return this.http.put<void>('/api/player/play', { deviceId, uri });
  }

  /** Batch-checks whether the given track ids are in the current user's Liked Songs. */
  checkLikedTracks(ids: string[]): Observable<{ liked: LikedTracksMap }> {
    return this.http.get<{ liked: LikedTracksMap }>('/api/liked-songs/contains', {
      params: buildParams({ ids: ids.join(',') }),
    });
  }

  /** Saves a track to the current user's Liked Songs. */
  likeTrack(id: string): Observable<void> {
    return this.http.put<void>('/api/liked-songs', { ids: [id] });
  }

  /** Removes a track from the current user's Liked Songs. */
  unlikeTrack(id: string): Observable<void> {
    return this.http.delete<void>('/api/liked-songs', { body: { ids: [id] } });
  }

  /** Adds a track to one of the current user's playlists. */
  addTrackToPlaylist(playlistId: string, uri: string): Observable<AddPlaylistItemsResult> {
    return this.http.post<AddPlaylistItemsResult>(
      `/api/playlists/${encodeURIComponent(playlistId)}/tracks`,
      { uri }
    );
  }
}
