import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from './api-config';
import { RoomType } from './models';

/** Räume laut Backend-Enum `Room`. */
export type Room =
  | 'LIVING_ROOM'
  | 'BEDROOM'
  | 'KITCHEN'
  | 'BATHROOM'
  | 'OFFICE'
  | 'DINING_ROOM'
  | 'OTHER';

/** Übersetzt die im UI gewählten Raumnamen in das Backend-Enum. */
export const ROOM_BY_ROOM_TYPE: Record<RoomType, Room> = {
  Wohnzimmer: 'LIVING_ROOM',
  Schlafzimmer: 'BEDROOM',
  Küche: 'KITCHEN',
  Badezimmer: 'BATHROOM',
  Büro: 'OFFICE',
  Esszimmer: 'DINING_ROOM',
  Sonstiges: 'OTHER',
};

/** Antwort von `GET /api/images` — ein Möbelbild inkl. Metadaten. */
export interface FurnitureImageResponse {
  id: number;
  categoryId: number;
  /** z. B. "living-room-sideboard" */
  categorySlug: string;
  room: Room;
  /** Anzeigename der Kategorie, z. B. "Sideboard" */
  categoryName: string;
  name: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  widthPx: number;
  heightPx: number;
  sha256: string;
  widthCm: number;
  heightCm: number;
  depthCm: number;
  style: string;
  createdAt: string;
  updatedAt: string;
  /** Relativer Pfad zum Bild, z. B. "/api/images/10/content" */
  contentUrl: string;
}

/** Spring-Data-`Page` — nur die Felder, die der Client tatsächlich nutzt. */
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  /** Nullbasierter Index der aktuellen Seite */
  number: number;
  size: number;
  first: boolean;
  last: boolean;
  numberOfElements: number;
  empty: boolean;
}

export type SortDirection = 'asc' | 'desc';

export interface FurnitureImageQuery {
  categoryId?: number;
  room?: Room;
  style?: string;
  /** Nullbasierte Seite (Backend-Default: 0) */
  page?: number;
  /** Backend-Default: 50 */
  size?: number;
  /** Backend-Default: id,desc */
  sortBy?: string;
  sortDirection?: SortDirection;
}

/**
 * Client für die Möbelbild-Endpunkte des Backends.
 *
 * Der Endpunkt ist mit `hasAnyRole('USER','ADMIN')` abgesichert — die
 * Zugangsdaten (Session-Cookie oder Bearer-Token) müssen über einen
 * HTTP-Interceptor angehängt werden, siehe `withCredentials` unten.
 */
@Injectable({ providedIn: 'root' })
export class FurnitureImageApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  /** `GET /api/images` — seitenweise Suche mit optionalen Filtern. */
  search(query: FurnitureImageQuery = {}): Observable<Page<FurnitureImageResponse>> {
    let params = new HttpParams();
    if (query.categoryId !== undefined) params = params.set('categoryId', query.categoryId);
    if (query.room) params = params.set('room', query.room);
    if (query.style) params = params.set('style', query.style);
    if (query.page !== undefined) params = params.set('page', query.page);
    if (query.size !== undefined) params = params.set('size', query.size);
    if (query.sortBy) {
      params = params.set('sort', `${query.sortBy},${query.sortDirection ?? 'desc'}`);
    }

    return this.http.get<Page<FurnitureImageResponse>>(`${this.baseUrl}/images`, {
      params,
      withCredentials: true,
    });
  }

  /** `GET /api/images/{id}` — ein einzelnes Bild inkl. Metadaten. */
  getById(id: number): Observable<FurnitureImageResponse> {
    return this.http.get<FurnitureImageResponse>(`${this.baseUrl}/images/${id}`, {
      withCredentials: true,
    });
  }

  /**
   * Absolute URL zum Bildinhalt (`contentUrl` ist serverseitig relativ zu `/api`).
   *
   * Achtung: `<img src>` schickt keine Authorization-Header mit. Bei
   * Token-Auth stattdessen `loadContent()` nutzen und eine Blob-URL erzeugen.
   */
  contentUrl(image: FurnitureImageResponse): string {
    const origin = this.baseUrl.replace(/\/api\/?$/, '');
    return `${origin}${image.contentUrl}`;
  }

  /** Lädt den Bildinhalt als Blob — für Auth-Header-geschützte Bilder. */
  loadContent(id: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/images/${id}/content`, {
      responseType: 'blob',
      withCredentials: true,
    });
  }
}
