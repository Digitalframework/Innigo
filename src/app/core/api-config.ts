import { InjectionToken } from '@angular/core';

/** Basis-URL von generation-backend (Port 8081). */
export const DEFAULT_API_BASE_URL = 'http://localhost:8081/api';

/**
 * Basis-URL von AuthAndSecurity (Port 8080) — stellt die JWTs für alle Backends aus.
 *
 * Bewusst relativ: AuthAndSecurity hat keinerlei CORS-Konfiguration, ein direkter
 * XHR von `localhost:4200` auf `localhost:8080` wird also vom Browser geblockt.
 * `proxy.conf.json` leitet `/auth/**` im Dev-Server auf Port 8080 um — damit ist
 * der Aufruf same-origin und das Session-Cookie (Domain `localhost`, Ports sind
 * für Cookies irrelevant) wird mitgeschickt. Beim Deployment entweder denselben
 * Reverse-Proxy-Pfad bereitstellen oder `AUTH_BASE_URL` überschreiben — Letzteres
 * setzt dann CORS mit `allowCredentials` auf AuthAndSecurity voraus.
 */
export const DEFAULT_AUTH_BASE_URL = '/auth/api';

/**
 * Anmeldeseite von AuthAndSecurity — absolut, anders als `DEFAULT_AUTH_BASE_URL`.
 *
 * Nicht über den Proxy, weil dort nur `/auth/**` umgeleitet wird: die Login-Seite
 * lädt ihr CSS von `/css/**` und postet an `/ott/generate`, beides root-relativ.
 * Über den Proxy aufgerufen liefe das gegen den Dev-Server statt gegen Port 8080.
 * Der Mensch geht also direkt hin — die Session-Cookies gelten anschließend für
 * beide Ports, weil Cookies keine Ports unterscheiden.
 */
export const DEFAULT_AUTH_LOGIN_URL = 'http://localhost:8080/login';

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => DEFAULT_API_BASE_URL,
});

export const AUTH_BASE_URL = new InjectionToken<string>('AUTH_BASE_URL', {
  providedIn: 'root',
  factory: () => DEFAULT_AUTH_BASE_URL,
});

export const AUTH_LOGIN_URL = new InjectionToken<string>('AUTH_LOGIN_URL', {
  providedIn: 'root',
  factory: () => DEFAULT_AUTH_LOGIN_URL,
});
