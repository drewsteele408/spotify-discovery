import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { PageShell } from '../../shared/components/page-shell/page-shell';
import { SoundchartsLookup } from '../../shared/components/soundcharts-lookup/soundcharts-lookup';
import { SpotifyDataService } from '../../core/services/spotify-data.service';
import { RecentlyPlayedTrack } from '../../core/models/spotify.model';
import { extractApiErrorMessage } from '../../core/utils/api-error';

type ViewState = 'idle' | 'loading' | 'loaded' | 'error';

@Component({
  selector: 'app-recently-played',
  imports: [PageShell, ReactiveFormsModule, SoundchartsLookup, DatePipe],
  templateUrl: './recently-played.html',
  styleUrl: './recently-played.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecentlyPlayed implements OnInit {
  private readonly spotifyData = inject(SpotifyDataService);
  private readonly fb = inject(FormBuilder);

  protected readonly form = this.fb.nonNullable.group({
    limit: null as number | null,
  });

  protected readonly state = signal<ViewState>('idle');
  protected readonly tracks = signal<RecentlyPlayedTrack[]>([]);
  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit() {
    this.fetch();
  }

  protected onSubmit() {
    this.fetch();
  }

  /** Parses `playedAt` (ISO string from Spotify) for template display via DatePipe; falls back gracefully. */
  protected parsePlayedAt(playedAt: string): Date | null {
    const parsed = new Date(playedAt);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private fetch() {
    const { limit } = this.form.getRawValue();

    this.state.set('loading');
    this.errorMessage.set(null);

    this.spotifyData.getRecentlyPlayed({ limit: limit ?? undefined }).subscribe({
      next: ({ tracks }) => {
        // Backend already returns Spotify's reverse-chronological order; sort defensively
        // so the most recently played track is guaranteed to render first.
        const sorted = [...tracks].sort((a, b) => {
          const aTime = new Date(a.playedAt).getTime();
          const bTime = new Date(b.playedAt).getTime();
          return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
        });

        this.tracks.set(sorted);
        this.state.set('loaded');
      },
      error: (err) => {
        this.errorMessage.set(
          extractApiErrorMessage(err, 'Unable to retrieve your recently played tracks.')
        );
        this.state.set('error');
      },
    });
  }
}
