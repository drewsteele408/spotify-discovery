import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { PageShell } from '../../shared/components/page-shell/page-shell';
import { SpotifyDataService } from '../../core/services/spotify-data.service';
import { ArtistSummary } from '../../core/models/spotify.model';
import { extractApiErrorMessage } from '../../core/utils/api-error';

type ViewState = 'idle' | 'loading' | 'loaded' | 'error';

@Component({
  selector: 'app-followed-artists',
  imports: [PageShell, ReactiveFormsModule],
  templateUrl: './followed-artists.html',
  styleUrl: './followed-artists.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FollowedArtists implements OnInit {
  private readonly spotifyData = inject(SpotifyDataService);
  private readonly fb = inject(FormBuilder);

  protected readonly form = this.fb.nonNullable.group({
    limit: null as number | null,
  });

  protected readonly state = signal<ViewState>('idle');
  protected readonly artists = signal<ArtistSummary[]>([]);
  protected readonly nextCursor = signal<string | null>(null);
  protected readonly loadingMore = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit() {
    this.fetch();
  }

  protected onSubmit() {
    this.fetch();
  }

  protected onLoadMore() {
    const cursor = this.nextCursor();
    if (!cursor) {
      return;
    }
    this.fetch({ after: cursor, append: true });
  }

  private fetch(options: { after?: string; append?: boolean } = {}) {
    const { limit } = this.form.getRawValue();

    if (options.append) {
      this.loadingMore.set(true);
    } else {
      this.state.set('loading');
      this.errorMessage.set(null);
    }

    this.spotifyData
      .getFollowedArtists({ limit: limit ?? undefined, after: options.after })
      .subscribe({
        next: ({ followedArtists, nextCursor }) => {
          this.artists.set(options.append ? [...this.artists(), ...followedArtists] : followedArtists);
          this.nextCursor.set(nextCursor);
          this.state.set('loaded');
          this.loadingMore.set(false);
        },
        error: (err) => {
          this.errorMessage.set(extractApiErrorMessage(err, 'Unable to retrieve your followed artists.'));
          this.state.set('error');
          this.loadingMore.set(false);
        },
      });
  }
}
