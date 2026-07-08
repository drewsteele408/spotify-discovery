import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { SpotifyDataService } from '../../core/services/spotify-data.service';
import { PlaylistSummary } from '../../core/models/spotify.model';
import { extractApiErrorMessage } from '../../core/utils/api-error';

type ViewState = 'idle' | 'loading' | 'loaded' | 'error';

const DEFAULT_LIMIT = 20;

@Component({
  selector: 'app-user-playlists',
  imports: [ReactiveFormsModule],
  templateUrl: './user-playlists.html',
  styleUrl: './user-playlists.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserPlaylists implements OnInit {
  private readonly spotifyData = inject(SpotifyDataService);
  private readonly fb = inject(FormBuilder);

  protected readonly form = this.fb.nonNullable.group({
    limit: null as number | null,
    offset: 0,
  });

  protected readonly state = signal<ViewState>('idle');
  protected readonly playlists = signal<PlaylistSummary[]>([]);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly canGoPrevious = computed(() => this.form.controls.offset.value > 0);

  ngOnInit() {
    this.fetch();
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
