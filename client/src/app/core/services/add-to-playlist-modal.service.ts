import { Injectable, signal } from '@angular/core';

export interface AddToPlaylistTarget {
  id: string | null;
  uri: string | null;
  artist: string;
  title: string;
}

/**
 * Signals-based trigger for the single global add-to-playlist modal mounted in app.html.
 * Any song-add-to-playlist-button anywhere in the app opens the same modal instance through
 * this service rather than each track row owning its own modal/overlay.
 */
@Injectable({ providedIn: 'root' })
export class AddToPlaylistModalService {
  readonly isOpen = signal(false);
  readonly target = signal<AddToPlaylistTarget | null>(null);

  open(target: AddToPlaylistTarget): void {
    this.target.set(target);
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
    this.target.set(null);
  }
}
