import { Injectable, computed, signal } from '@angular/core';

export type PlanId = 'free' | 'premium' | 'business';

export interface Plan {
  id: PlanId;
  name: string;
  priceLabel: string;
  tokensPerMonth: number;
  features: string[];
}

export interface TokenPackage {
  tokens: number;
  priceLabel: string;
  highlight?: boolean;
}

export interface PaymentMethod {
  brand: string;
  last4: string;
  expiry: string;
}

export interface Address {
  street: string;
  postalCode: string;
  city: string;
  country: string;
}

export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    priceLabel: '0 € / Monat',
    tokensPerMonth: 20,
    features: ['20 Token pro Monat', 'Raum neu gestalten', 'Standard-Qualität'],
  },
  {
    id: 'premium',
    name: 'Premium',
    priceLabel: '19 € / Monat',
    tokensPerMonth: 500,
    features: ['500 Token pro Monat', 'Möbel einzeln austauschen', 'Hohe Qualität', 'Priorisierte Generierung'],
  },
  {
    id: 'business',
    name: 'Business',
    priceLabel: '49 € / Monat',
    tokensPerMonth: 2000,
    features: ['2000 Token pro Monat', 'Team-Zugriff', 'Höchste Qualität', 'API-Zugriff'],
  },
];

export const TOKEN_PACKAGES: TokenPackage[] = [
  { tokens: 100, priceLabel: '4,99 €' },
  { tokens: 500, priceLabel: '19,99 €', highlight: true },
  { tokens: 1000, priceLabel: '34,99 €' },
  { tokens: 2000, priceLabel: '59,99 €' },
];

@Injectable({ providedIn: 'root' })
export class UserStore {
  readonly name = signal('Stefan Hausner');
  readonly email = signal('stefan-hausner96@hotmail.de');
  readonly avatarUrl = signal<string | null>(null);

  readonly address = signal<Address>({
    street: 'Musterstraße 12',
    postalCode: '10115',
    city: 'Berlin',
    country: 'Deutschland',
  });

  readonly paymentMethod = signal<PaymentMethod | null>({
    brand: 'Visa',
    last4: '4242',
    expiry: '09/28',
  });

  readonly planId = signal<PlanId>('free');
  readonly tokens = signal(175);

  readonly plan = computed(() => PLANS.find((p) => p.id === this.planId())!);

  updateAvatar(dataUrl: string): void {
    this.avatarUrl.set(dataUrl);
  }

  buyTokens(amount: number): void {
    this.tokens.update((t) => t + amount);
  }

  spendTokens(amount: number): boolean {
    if (this.tokens() < amount) return false;
    this.tokens.update((t) => t - amount);
    return true;
  }

  upgradePlan(id: PlanId): void {
    this.planId.set(id);
  }
}
