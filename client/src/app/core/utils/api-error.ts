import { HttpErrorResponse } from '@angular/common/http';

/**
 * Every `/api/*` JSON error response (see src/routes/api.js) is either
 * `{ error: string }` or, for 401s from requireAuth/ensureSpotifyAccessToken,
 * `{ error: string, message: string }`. Prefer `message` (the human-readable
 * one) when present, falling back to `error`, then a generic default.
 */
export const extractApiErrorMessage = (err: unknown, fallback: string): string => {
  if (err instanceof HttpErrorResponse) {
    const body = err.error as { error?: string; message?: string } | null;

    if (body?.message) {
      return body.message;
    }

    if (typeof body?.error === 'string') {
      return body.error;
    }

    if (err.status === 0) {
      return 'Unable to reach the server. Check your connection and try again.';
    }
  }

  return fallback;
};
