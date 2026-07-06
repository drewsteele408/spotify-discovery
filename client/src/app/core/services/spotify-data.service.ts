import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  ArtistSummary,
  FollowedArtistsResult,
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
}
