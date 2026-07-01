import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';

import { PageShell } from '../../shared/components/page-shell/page-shell';
import { SoundchartsLookup } from '../../shared/components/soundcharts-lookup/soundcharts-lookup';
import { TrackRecommendations } from '../../shared/components/track-recommendations/track-recommendations';
import { SpotifyDataService } from '../../core/services/spotify-data.service';
import { TrackSummary } from '../../core/models/spotify.model';
import { extractApiErrorMessage } from '../../core/utils/api-error';

type ViewState = 'idle' | 'loading' | 'loaded' | 'error';

/** Small, fixed default — this page doesn't expose time-range/limit controls. */
const DEFAULT_LIMIT = 10;

@Component({
  selector: 'app-recommendations',
  imports: [PageShell, SoundchartsLookup, TrackRecommendations],
  templateUrl: './recommendations.html',
  styleUrl: './recommendations.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Recommendations implements OnInit {
  private readonly spotifyData = inject(SpotifyDataService);

  protected readonly state = signal<ViewState>('idle');
  protected readonly tracks = signal<TrackSummary[]>([]);
  protected readonly errorMessage = signal<string | null>(null);

  /** Soundcharts JSON per track id, populated as each row's lookup succeeds. */
  protected readonly audioByTrackId = signal<Record<string, unknown>>({});

  ngOnInit() {
    this.state.set('loading');
    this.errorMessage.set(null);

    this.spotifyData.getTopTracks({ limit: DEFAULT_LIMIT }).subscribe({
      next: ({ tracks }) => {
        this.tracks.set(tracks);
        this.state.set('loaded');
      },
      error: (err) => {
        this.errorMessage.set(extractApiErrorMessage(err, 'Unable to retrieve your top tracks.'));
        this.state.set('error');
      },
    });
  }

  protected onSoundchartsDataLoaded(trackId: string | null, data: unknown) {
    if (!trackId) {
      return;
    }

    this.audioByTrackId.update((current) => ({ ...current, [trackId]: data }));
  }
}
