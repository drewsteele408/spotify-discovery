import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';

import { SpotifyDataService } from '../../../core/services/spotify-data.service';
import { extractApiErrorMessage } from '../../../core/utils/api-error';

type LookupState = 'idle' | 'loading' | 'success' | 'error';

/**
 * Inline "Get Soundcharts Data" button for a single track row. Requirement 6 in
 * requirements-specification.md: clicking it must show a loading state, then render
 * the raw Soundcharts JSON response inline with no page reload — used on Top Tracks,
 * Saved Tracks, and Recently Played (any page listing TrackSummary rows with a spotify id).
 */
@Component({
  selector: 'app-soundcharts-lookup',
  imports: [JsonPipe],
  templateUrl: './soundcharts-lookup.html',
  styleUrl: './soundcharts-lookup.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SoundchartsLookup {
  private readonly spotifyData = inject(SpotifyDataService);

  readonly spotifyId = input.required<string | null>();
  readonly trackName = input<string>('this track');

  /**
   * Emits the raw Soundcharts JSON once a lookup succeeds. Purely additive — existing
   * consumers (Top Tracks, Saved Tracks, Recently Played) don't bind to it and are
   * unaffected. Lets the Recommendations page react to loaded data via composition
   * instead of this component knowing anything about recommendations.
   */
  readonly dataLoaded = output<unknown>();

  protected readonly state = signal<LookupState>('idle');
  protected readonly result = signal<unknown>(null);
  protected readonly errorMessage = signal<string | null>(null);

  protected onLookupClick() {
    const id = this.spotifyId();

    if (!id) {
      this.state.set('error');
      this.errorMessage.set('This track has no Spotify ID to look up.');
      return;
    }

    this.state.set('loading');
    this.errorMessage.set(null);

    this.spotifyData.getSoundchartsSong(id).subscribe({
      next: (data) => {
        this.result.set(data);
        this.state.set('success');
        this.dataLoaded.emit(data);
      },
      error: (err) => {
        this.errorMessage.set(extractApiErrorMessage(err, 'Failed to fetch Soundcharts data.'));
        this.state.set('error');
      },
    });
  }
}
