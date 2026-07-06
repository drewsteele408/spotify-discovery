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
