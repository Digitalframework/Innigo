import { Component, inject } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';

import { PLANS, PlanId, TOKEN_PACKAGES, UserStore } from '../../core/user-store';

@Component({
  selector: 'app-billing-page',
  imports: [NzIconModule],
  templateUrl: './billing-page.html',
  styleUrl: './billing-page.scss',
})
export class BillingPage {
  protected readonly userStore = inject(UserStore);
  private readonly message = inject(NzMessageService);

  protected readonly plans = PLANS;
  protected readonly tokenPackages = TOKEN_PACKAGES;

  protected buyTokens(amount: number): void {
    this.userStore.buyTokens(amount);
    this.message.success(`${amount} Token wurden deinem Guthaben gutgeschrieben.`);
  }

  protected upgrade(planId: PlanId): void {
    if (planId === this.userStore.planId()) return;
    this.userStore.upgradePlan(planId);
    const plan = this.plans.find((p) => p.id === planId);
    this.message.success(`Dein Tarif wurde auf ${plan?.name} aktualisiert.`);
  }
}
