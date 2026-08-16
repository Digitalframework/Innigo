import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';

import { API_BASE_URL, AUTH_BASE_URL } from './api-config';
import { AuthService } from './auth.service';

function withBearer<T>(req: HttpRequest<T>, token: string): HttpRequest<T> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

/**
 * Hängt das JWT von AuthAndSecurity an alle Backend-Requests.
 *
 * Der Token-Endpunkt selbst wird ausgenommen — er authentifiziert sich über
 * das Session-Cookie und würde sonst eine Endlosschleife auslösen.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const apiBaseUrl = inject(API_BASE_URL);
  const authBaseUrl = inject(AUTH_BASE_URL);
  const auth = inject(AuthService);

  if (!req.url.startsWith(apiBaseUrl) || req.url.startsWith(`${authBaseUrl}/token`)) {
    return next(req);
  }

  return auth.getToken().pipe(
    switchMap((token) =>
      next(withBearer(req, token)).pipe(
        catchError((err: HttpErrorResponse) => {
          // Abgelaufener oder verworfener Token: einmal neu holen und wiederholen.
          if (err.status !== 401) return throwError(() => err);
          auth.clear();
          return auth.getToken().pipe(switchMap((fresh) => next(withBearer(req, fresh))));
        }),
      ),
    ),
  );
};
