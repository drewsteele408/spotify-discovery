import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { PageShell } from '../../shared/components/page-shell/page-shell';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-home',
  imports: [PageShell],
  templateUrl: './home.html',
  styleUrl: './home.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  protected readonly auth = inject(AuthService);

  protected onLoginClick() {
    this.auth.login();
  }
}
