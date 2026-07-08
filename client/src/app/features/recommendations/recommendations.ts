import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink, RouterLinkActive } from '@angular/router';
import { map } from 'rxjs';

import { PageShell } from '../../shared/components/page-shell/page-shell';
import { SoundchartsLookup } from '../../shared/components/soundcharts-lookup/soundcharts-lookup';
import { TrackRecommendations } from '../../shared/components/track-recommendations/track-recommendations';
import { SpotifyDataService } from '../../core/services/spotify-data.service';
import { TrackSummary } from '../../core/models/spotify.model';
import { extractApiErrorMessage } from '../../core/utils/api-error';
import { TopTracks } from '../top-tracks/top-tracks';
import { TopArtists } from '../top-artists/top-artists';
import { SavedTracks } from '../saved-tracks/saved-tracks';
import { RecentlyPlayed } from '../recently-played/recently-played';
import { FollowedArtists } from '../followed-artists/followed-artists';
import { UserPlaylists } from '../user-playlists/user-playlists';

type ViewState = 'idle' | 'loading' | 'loaded' | 'error';

/** Small, fixed default — this page doesn't expose time-range/limit controls. */
const DEFAULT_LIMIT = 10;

export type FeatureTab =
  | 'top-tracks'
  | 'top-artists'
  | 'saved-tracks'
  | 'recently-played'
  | 'followed-artists'
  | 'user-playlists';

interface FeatureNavCard {
  title: string;
  description: string;
  tab: FeatureTab;
}

const FEATURE_NAV_CARDS: FeatureNavCard[] = [
  {
    title: 'Top Tracks',
    description: 'Your most-played songs over a selected time range.',
    tab: 'top-tracks',
  },
  {
    title: 'Top Artists',
    description: 'The artists dominating your listening, with pagination.',
    tab: 'top-artists',
  },
  {
    title: 'Saved Tracks',
    description: 'Everything you have saved to your library.',
    tab: 'saved-tracks',
  },
  {
    title: 'Recently Played',
    description: 'A chronological feed of your last-played tracks.',
    tab: 'recently-played',
  },
  {
    title: 'Followed Artists',
    description: 'Artists you follow, with cursor-based pagination.',
    tab: 'followed-artists',
  },
  {
    title: 'Your Playlists',
    description: 'Playlists in your library, with pagination.',
    tab: 'user-playlists',
  },
];

@Component({
  selector: 'app-recommendations',
  imports: [
    PageShell,
    SoundchartsLookup,
    TrackRecommendations,
    RouterLink,
    RouterLinkActive,
    TopTracks,
    TopArtists,
    SavedTracks,
    RecentlyPlayed,
    FollowedArtists,
    UserPlaylists,
  ],
  templateUrl: './recommendations.html',
  styleUrl: './recommendations.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Recommendations implements OnInit {
  private readonly spotifyData = inject(SpotifyDataService);
  private readonly route = inject(ActivatedRoute);

  protected readonly featureNavCards = FEATURE_NAV_CARDS;

  /** Which feature panel to show beneath the nav-cards; synced to the `tab` query param so it's bookmarkable. */
  protected readonly activeTab = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('tab') as FeatureTab | null)),
    { initialValue: null }
  );

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
