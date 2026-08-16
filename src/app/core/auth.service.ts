import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, of, shareReplay, tap, throwError } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';

import { AUTH_BASE_URL, AUTH_LOGIN_URL } from './api-config';

/** Antwort von `GET /api/token` bei AuthAndSecurity (`AccessTokenResponse`). */
interface TokenResponse {
  accessToken: string;
  tokenType: string;
  /** Restlaufzeit in Sekunden — relativ, damit keine Uhren abgeglichen werden müssen. */
  expiresIn: number;
  /** z. B. `["ADMIN","USER"]`; nur fürs UI, maßgeblich ist der `roles`-Claim im Token. */
  roles: string[];
}

interface JwtPayload {
  exp?: number;
  sub?: string;
  email?: string;
  roles?: string[];
}

/** Sicherheitsabstand: vor Ablauf erneuern, damit kein Request unterwegs abläuft. */
const REFRESH_SKEW_MS = 60_000;

/**
 * Es gibt keine Session bei AuthAndSecurity, also auch kein Token.
 *
 * Eigener Fehlertyp, weil das im Netzwerk-Tab unkenntlich ist: `/api/token`
 * antwortet ohne Session mit einem 302 auf `/login`, der Browser folgt dem
 * automatisch, und da der Proxy den Host beibehält landet er beim Dev-Server —
 * der die Route nicht kennt und 404 sagt. Der 404 ist also keine fehlende
 * Ressource, sondern „nicht angemeldet“.
 */
export class NotAuthenticatedError extends Error {
  constructor(readonly loginUrl: string) {
    super(`Keine Anmeldung bei AuthAndSecurity — bitte zuerst ${loginUrl} aufrufen.`);
    this.name = 'NotAuthenticatedError';
  }
}

function decodeJwt(token: string): JwtPayload | null {
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Holt und cached das JWT von AuthAndSecurity.
 *
 * Der Token wird per Session-Cookie gegen `/api/token` eingetauscht und
 * anschließend unverändert als `Authorization: Bearer …` an alle Backends
 * weitergereicht (siehe `authInterceptor`). Jedes Backend verifiziert selbst
 * gegen das gemeinsame JWKS — es findet kein Re-Signing statt.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly authBaseUrl = inject(AUTH_BASE_URL);

  private token: string | null = null;
  private expiresAt = 0;
  /** Laufender Abruf, damit parallele Requests nur einen Token-Call auslösen. */
  private inFlight: Observable<string> | null = null;

  readonly isAuthenticated = signal(false);
  /** `sub` — die `userId` aus der AppUser-Tabelle, nicht die E-Mail. */
  readonly userId = signal<string | null>(null);
  readonly email = signal<string | null>(null);
  readonly roles = signal<string[]>([]);

  /** Anmeldeseite von AuthAndSecurity, für den Verweis im Fehlerfall. */
  readonly loginUrl = inject(AUTH_LOGIN_URL);

  /** Gültiger Token aus dem Cache, sonst `null`. */
  currentToken(): string | null {
    return this.token && Date.now() < this.expiresAt - REFRESH_SKEW_MS ? this.token : null;
  }

  /** Liefert einen gültigen Token und erneuert ihn bei Bedarf. */
  getToken(): Observable<string> {
    const cached = this.currentToken();
    if (cached) return of(cached);
    if (this.inFlight) return this.inFlight;

    this.inFlight = this.http
      .get<TokenResponse>(`${this.authBaseUrl}/token`, { withCredentials: true })
      .pipe(
        map((res) => {
          if (!res?.accessToken) throw new NotAuthenticatedError(this.loginUrl);
          return res;
        }),
        tap((res) => this.store(res)),
        map((res) => res.accessToken),
        catchError((err) => {
          this.clear();
          return throwError(() => this.asAuthError(err));
        }),
        finalize(() => (this.inFlight = null)),
        shareReplay({ bufferSize: 1, refCount: false }),
      );

    return this.inFlight;
  }

  /** Verwirft den Cache, z. B. nach einem 401. */
  clear(): void {
    this.token = null;
    this.expiresAt = 0;
    this.inFlight = null;
    this.isAuthenticated.set(false);
    this.userId.set(null);
    this.email.set(null);
    this.roles.set([]);
  }

  /**
   * Übersetzt die Symptome einer fehlenden Session in eine klare Ursache.
   *
   * Unterhalb von 500 bedeutet an diesem Endpunkt jeder Fehler dasselbe — es gibt
   * kein Token —, und die Symptome sind irreführend verschieden: 401/403 direkt,
   * 404 vom gefolgten Redirect auf `/login`, oder **Status 200** mit
   * Parse-Fehler, wenn der Dev-Server für `/login` seine `index.html` ausliefert
   * und `<!doctype …>` als JSON gelesen wird. Nur echte Serverfehler (5xx)
   * bleiben, was sie sind.
   */
  private asAuthError(err: unknown): unknown {
    if (err instanceof NotAuthenticatedError) return err;
    if (err instanceof HttpErrorResponse && err.status < 500) {
      return new NotAuthenticatedError(this.loginUrl);
    }
    return err;
  }

  private store(res: TokenResponse): void {
    const payload = decodeJwt(res.accessToken);
    this.token = res.accessToken;
    // `expiresIn` ist relativ und damit unabhängig von der Uhr des Servers;
    // `exp` dient nur als Rückfallebene.
    this.expiresAt = res.expiresIn
      ? Date.now() + res.expiresIn * 1000
      : (payload?.exp ?? 0) * 1000;
    this.isAuthenticated.set(true);
    this.userId.set(payload?.sub ?? null);
    this.email.set(payload?.email ?? null);
    this.roles.set(res.roles ?? payload?.roles ?? []);
  }
}
