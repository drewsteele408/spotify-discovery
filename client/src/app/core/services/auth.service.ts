import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, finalize, of, tap } from 'rxjs';

import { SessionStatus, SpotifyProfile } from '../models/session.model';

const LOGGED_OUT_STATUS: SessionStatus = {
  isAuthenticated: false,
  spotifyProfile: null,
};

/**
 * Tracks whether the current visitor has an authenticated Spotify Discovery session.
 *
 * `GET /api/session` (see src/routes/api.js) returns `{ isAuthenticated, spotifyProfile }`
 * sourced from `req.session.authenticated` / `req.session.spotifyProfile`. `refresh()` still
 * falls back to a "logged out" default on request failure (e.g. network error) rather than
 * throwing, so the shell never breaks on a transient failure.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly status = signal<SessionStatus>(LOGGED_OUT_STATUS);
  private readonly loading = signal<boolean>(false);

  readonly isAuthenticated = computed(() => this.status().isAuthenticated);
  readonly spotifyProfile = computed<SpotifyProfile | null>(() => this.status().spotifyProfile);
  readonly isLoading = computed(() => this.loading());

  /** Re-fetches session status from the backend. Safe to call on app init and after redirects. */
  refresh() {
    this.loading.set(true);

    return this.http.get<SessionStatus>('/api/session').pipe(
      tap((status) => this.status.set(status)),
      catchError(() => {
        // Request failed (e.g. offline) — treat as logged out rather than breaking the shell.
        this.status.set(LOGGED_OUT_STATUS);
        return of(LOGGED_OUT_STATUS);
      }),
      finalize(() => this.loading.set(false))
    );
  }

  /**
   * Full-page navigation into the server-side Spotify OAuth flow. This must NOT be an
   * HttpClient call — Spotify's Authorization Code flow relies on the browser following
   * redirects and the express-session cookie being sent along with them.
   */
  login() {
    window.location.href = '/auth/login';
  }

  /** Full-page navigation so the session cookie is cleared and Express can redirect home. */
  logout() {
    window.location.href = '/auth/logout';
  }
}
