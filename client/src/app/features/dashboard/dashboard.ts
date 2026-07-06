import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PageShell } from '../../shared/components/page-shell/page-shell';
import { AuthService } from '../../core/services/auth.service';
import { SpotifyProfile } from '../../core/models/session.model';

interface DashboardNavCard {
  title: string;
  description: string;
  routerLink: string;
  queryParams?: { tab: string };
}

const NAV_CARDS: DashboardNavCard[] = [
  {
    title: 'Top Tracks',
    description: 'Your most-played songs over a selected time range.',
    routerLink: '/recommendations',
    queryParams: { tab: 'top-tracks' },
  },
  {
    title: 'Top Artists',
    description: 'The artists dominating your listening, with pagination.',
    routerLink: '/recommendations',
    queryParams: { tab: 'top-artists' },
  },
  {
    title: 'Saved Tracks',
    description: 'Everything you have saved to your library.',
    routerLink: '/recommendations',
    queryParams: { tab: 'saved-tracks' },
  },
  {
    title: 'Recently Played',
    description: 'A chronological feed of your last-played tracks.',
    routerLink: '/recommendations',
    queryParams: { tab: 'recently-played' },
  },
  {
    title: 'Followed Artists',
    description: 'Artists you follow, with cursor-based pagination.',
    routerLink: '/recommendations',
    queryParams: { tab: 'followed-artists' },
  },
  {
    title: 'Recommendations',
    description: 'Gemini-powered song suggestions based on your top tracks.',
    routerLink: '/recommendations',
  },
];

/**
 * Fallback profile shown only for the brief window before AuthService.refresh() resolves
 * (or if a visitor somehow reaches this route while logged out). Real data comes from
 * `GET /api/session` via AuthService.spotifyProfile.
 */
const PLACEHOLDER_PROFILE: SpotifyProfile = {
  id: 'placeholder_user',
  display_name: 'Your Name',
  email: 'you@example.com',
  country: 'US',
  product: 'premium',
  external_urls: { spotify: 'https://open.spotify.com' },
  images: [],
};

@Component({
  selector: 'app-dashboard',
  imports: [PageShell, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard implements OnInit {
  private readonly auth = inject(AuthService);

  protected readonly navCards = NAV_CARDS;
  protected readonly placeholderProfile = signal(PLACEHOLDER_PROFILE);

  protected readonly profile = this.auth.spotifyProfile;

  ngOnInit() {
    this.auth.refresh().subscribe();
  }
}
