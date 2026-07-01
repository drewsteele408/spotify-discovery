import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home').then((m) => m.Home),
    title: 'Spotify Discovery',
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
    title: 'Dashboard — Spotify Discovery',
  },
  {
    path: 'top-tracks',
    loadComponent: () => import('./features/top-tracks/top-tracks').then((m) => m.TopTracks),
    title: 'Top Tracks — Spotify Discovery',
  },
  {
    path: 'top-artists',
    loadComponent: () => import('./features/top-artists/top-artists').then((m) => m.TopArtists),
    title: 'Top Artists — Spotify Discovery',
  },
  {
    path: 'saved-tracks',
    loadComponent: () => import('./features/saved-tracks/saved-tracks').then((m) => m.SavedTracks),
    title: 'Saved Tracks — Spotify Discovery',
  },
  {
    path: 'recently-played',
    loadComponent: () =>
      import('./features/recently-played/recently-played').then((m) => m.RecentlyPlayed),
    title: 'Recently Played — Spotify Discovery',
  },
  {
    path: 'followed-artists',
    loadComponent: () =>
      import('./features/followed-artists/followed-artists').then((m) => m.FollowedArtists),
    title: 'Followed Artists — Spotify Discovery',
  },
  {
    path: 'recommendations',
    loadComponent: () =>
      import('./features/recommendations/recommendations').then((m) => m.Recommendations),
    title: 'Recommendations — Spotify Discovery',
  },
  {
    path: '**',
    redirectTo: '',
  },
];
