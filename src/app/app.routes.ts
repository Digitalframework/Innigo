import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'designer', pathMatch: 'full' },
  {
    path: 'designer',
    loadComponent: () => import('./pages/designer/designer-page').then((m) => m.DesignerPage),
    title: 'Roomly — Designer',
  },
  {
    path: 'profil',
    loadComponent: () => import('./pages/profile/profile-page').then((m) => m.ProfilePage),
    title: 'Roomly — Profil',
  },
  {
    path: 'guthaben',
    loadComponent: () => import('./pages/billing/billing-page').then((m) => m.BillingPage),
    title: 'Roomly — Guthaben & Tarife',
  },
  { path: '**', redirectTo: 'designer' },
];
