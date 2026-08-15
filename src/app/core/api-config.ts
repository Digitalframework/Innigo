import { InjectionToken } from '@angular/core';

/** Basis-URL des Backends. Beim Deployment über `provideApiBaseUrl()` überschreiben. */
export const DEFAULT_API_BASE_URL = 'http://localhost:8081/api';

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => DEFAULT_API_BASE_URL,
});
