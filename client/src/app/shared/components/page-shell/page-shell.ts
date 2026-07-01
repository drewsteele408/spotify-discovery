import { ChangeDetectionStrategy, Component } from '@angular/core';

import { NavBar } from '../nav-bar/nav-bar';

/**
 * Shared page chrome: sticky nav bar + a consistently constrained content area.
 * Every routed page component projects its content via <ng-content>.
 */
@Component({
  selector: 'app-page-shell',
  imports: [NavBar],
  templateUrl: './page-shell.html',
  styleUrl: './page-shell.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageShell {}
