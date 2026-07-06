import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';

import { SpotifyDataService } from '../../../core/services/spotify-data.service';
import { RecommendationItem } from '../../../core/models/spotify.model';
import { extractApiErrorMessage } from '../../../core/utils/api-error';
import { SongPlayButton } from '../song-play-button/song-play-button';

type RecommendationsState = 'idle' | 'loading' | 'success' | 'error';

/**
 * Sibling to <app-soundcharts-lookup>, not a modification of it. The Recommendations
 * page wires this up to fire once a track row's Soundcharts lookup succeeds (via
 * SoundchartsLookup's `dataLoaded` output), passing that raw JSON in as `audio`.
 * Kept as its own component so SoundchartsLookup stays exactly as usable on Top
 * Tracks / Saved Tracks / Recently Played as before — no recommendations UI leaks
 * onto those pages.
 */
@Component({
  selector: 'app-track-recommendations',
  imports: [SongPlayButton],
  templateUrl: './track-recommendations.html',
  styleUrl: './track-recommendations.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrackRecommendations {
  private readonly spotifyData = inject(SpotifyDataService);

  /** Raw Soundcharts JSON for this track, once loaded — null until then. */
  readonly audio = input.required<unknown>();

  protected readonly state = signal<RecommendationsState>('idle');
  protected readonly recommendations = signal<RecommendationItem[]>([]);
  protected readonly errorMessage = signal<string | null>(null);

  protected onGetRecommendationsClick() {
    const audio = this.audio();

    if (!audio || typeof audio !== 'object') {
      this.state.set('error');
      this.errorMessage.set('No Soundcharts data available yet to base recommendations on.');
      return;
    }

    this.state.set('loading');
    this.errorMessage.set(null);

    this.spotifyData.getRecommendations(audio).subscribe({
      next: ({ recommendations }) => {
        this.recommendations.set(recommendations);
        this.state.set('success');
      },
      error: (err) => {
        this.errorMessage.set(extractApiErrorMessage(err, 'Failed to fetch recommendations.'));
        this.state.set('error');
      },
    });
  }
}
