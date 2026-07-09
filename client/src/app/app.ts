import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AddToPlaylistModal } from './shared/components/add-to-playlist-modal/add-to-playlist-modal';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AddToPlaylistModal],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
