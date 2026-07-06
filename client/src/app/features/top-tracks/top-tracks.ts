import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { SoundchartsLookup } from '../../shared/components/soundcharts-lookup/soundcharts-lookup';
import { TrackRecommendations } from '../../shared/components/track-recommendations/track-recommendations';
import { SpotifyDataService, TimeRange } from '../../core/services/spotify-data.service';
import { TrackSummary } from '../../core/models/spotify.model';
import { extractApiErrorMessage } from '../../core/utils/api-error';

type ViewState = 'idle' | 'loading' | 'loaded' | 'error';

@Component({
  selector: 'app-top-tracks',
  imports: [ReactiveFormsModule, SoundchartsLookup, TrackRecommendations],
  templateUrl: './top-tracks.html',
  styleUrl: './top-tracks.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopTracks implements OnInit {
  private readonly spotifyData = inject(SpotifyDataService);
  private readonly fb = inject(FormBuilder);

  protected readonly form = this.fb.nonNullable.group({
    timeRange: '' as TimeRange | '',
    limit: null as number | null,
  });

  protected readonly state = signal<ViewState>('idle');
  protected readonly tracks = signal<TrackSummary[]>([]);
  protected readonly errorMessage = signal<string | null>(null);

  /** Soundcharts JSON per track id, populated as each row's lookup succeeds. */
  protected readonly audioByTrackId = signal<Record<string, unknown>>({});

  ngOnInit() {
    this.fetch();
  }

  protected onSubmit() {
    this.fetch();
  }

  protected onSoundchartsDataLoaded(trackId: string | null, data: unknown) {
    if (!trackId) {
      return;
    }

    this.audioByTrackId.update((current) => ({ ...current, [trackId]: data }));
  }

  private fetch() {
    const { timeRange, limit } = this.form.getRawValue();

    this.state.set('loading');
    this.errorMessage.set(null);

    this.spotifyData
      .getTopTracks({
        timeRange: timeRange || undefined,
        limit: limit ?? undefined,
      })
      .subscribe({
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
}
