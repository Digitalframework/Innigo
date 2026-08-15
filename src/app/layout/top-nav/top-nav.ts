import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { UserStore } from '../../core/user-store';

@Component({
  selector: 'app-top-nav',
  imports: [RouterLink, RouterLinkActive, NzIconModule],
  templateUrl: './top-nav.html',
  styleUrl: './top-nav.scss',
})
export class TopNav {
  protected readonly userStore = inject(UserStore);
}
