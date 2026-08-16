import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';

import { API_BASE_URL } from './api-config';
import { FurnitureCategory } from './furniture-catalog';
import { RoomType } from './models';

/** Räume laut Backend-Enum `Room`. */
export type Room =
  | 'LIVING_ROOM'
  | 'BEDROOM'
  | 'DINING_ROOM'
  | 'KITCHEN'
  | 'BATHROOM'
  | 'HOME_OFFICE'
  | 'HALLWAY'
  | 'KIDS_ROOM'
  | 'OUTDOOR';

/**
 * Übersetzt die im UI gewählten Raumnamen in das Backend-Enum.
 *
 * „Sonstiges“ hat drüben keine Entsprechung — das Enum kennt kein `OTHER`.
 * `null` heißt hier deshalb „nicht filterbar“, nicht „egal“.
 */
export const ROOM_BY_ROOM_TYPE: Record<RoomType, Room | null> = {
  Wohnzimmer: 'LIVING_ROOM',
  Schlafzimmer: 'BEDROOM',
  Küche: 'KITCHEN',
  Badezimmer: 'BATHROOM',
  Büro: 'HOME_OFFICE',
  Esszimmer: 'DINING_ROOM',
  Sonstiges: null,
};

/**
 * Kategorie-IDs, wie sie in `furniture_category` stehen.
 *
 * Die Namen unterscheiden sich beidseitig leicht (`Coffeetable` ↔ „Coffee table“,
 * `Lowboards` ↔ „Lowboard“), ein Abgleich über den Namen wäre also brüchig — die
 * ID ist die verbindliche Zuordnung.
 *
 * `Sidetable` (Beistelltisch) hat keine Zeile in der Tabelle und ist deshalb
 * `null`. Das ist bewusst nicht `undefined`: `undefined` würde als „kein
 * Kategoriefilter“ durchgereicht und still *alle* Kategorien laden.
 */
export const CATEGORY_ID_BY_CATEGORY: Record<FurnitureCategory, number | null> = {
  Armchair: 1,
  Sofa: 2,
  Sideboard: 3,
  Highboard: 4,
  Lowboards: 5,
  Coffeetable: 6,
  Mediawall: 7,
  Ottoman: 8,
  Shelves: 9,
  Sidetable: null,
};

/** Rückrichtung, um die `categoryId` einer Antwort wieder auf den Katalog zu beziehen. */
export const CATEGORY_BY_CATEGORY_ID: ReadonlyMap<number, FurnitureCategory> = new Map(
  (Object.entries(CATEGORY_ID_BY_CATEGORY) as [FurnitureCategory, number | null][])
    .filter((entry): entry is [FurnitureCategory, number] => entry[1] !== null)
    .map(([category, id]) => [id, category]),
);

/**
 * Backend-ID einer Katalog-Kategorie, oder `null`, wenn es sie dort nicht gibt.
 *
 * Aufrufer prüfen auf `null` und lassen den Request weg, statt ihn ungefiltert
 * abzuschicken.
 */
export function categoryIdFor(category: FurnitureCategory): number | null {
  return CATEGORY_ID_BY_CATEGORY[category];
}

/** Backend-Raum eines UI-Raums, oder `null`, wenn er dort nicht existiert. */
export function roomFor(room: RoomType | null): Room | null {
  return room ? ROOM_BY_ROOM_TYPE[room] : null;
}

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
 * Client für die Möbelbild-Endpunkte von generation-backend.
 *
 * Der Endpunkt ist mit `hasAnyRole('USER','ADMIN')` abgesichert — das JWT hängt
 * der `authInterceptor` als `Authorization: Bearer …` an.
 *
 * Kein `withCredentials`: generation-backend ist stateless und seine
 * CORS-Konfiguration setzt kein `allowCredentials`, ein Credentials-Request
 * würde also vom Browser verworfen. Der Bearer-Header ist die einzige
 * Zugangsberechtigung — er steht dort in `allowedHeaders`.
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

    return this.http.get<Page<FurnitureImageResponse>>(`${this.baseUrl}/images`, { params });
  }

  /**
   * Bilder einer Katalog-Kategorie. Kategorien ohne Backend-Zeile liefern eine
   * leere Seite, statt den Filter wegzulassen und alles zu laden.
   */
  searchByCategory(
    category: FurnitureCategory,
    query: Omit<FurnitureImageQuery, 'categoryId'> = {},
  ): Observable<Page<FurnitureImageResponse>> {
    const categoryId = categoryIdFor(category);
    if (categoryId === null) return of(emptyPage<FurnitureImageResponse>(query.size ?? 50));
    return this.search({ ...query, categoryId });
  }

  /** `GET /api/images/{id}` — ein einzelnes Bild inkl. Metadaten. */
  getById(id: number): Observable<FurnitureImageResponse> {
    return this.http.get<FurnitureImageResponse>(`${this.baseUrl}/images/${id}`);
  }

  /**
   * Absolute URL zum Bildinhalt (`contentUrl` ist serverseitig relativ zu `/api`).
   *
   * Achtung: `<img src>` schickt keinen Authorization-Header mit. Der Endpunkt
   * verlangt aber einen — deshalb in der Regel `loadContent()` nutzen und eine
   * Blob-URL erzeugen.
   */
  contentUrl(image: FurnitureImageResponse): string {
    const origin = this.baseUrl.replace(/\/api\/?$/, '');
    return `${origin}${image.contentUrl}`;
  }

  /** Lädt den Bildinhalt als Blob — für die `<img src>`-Anzeige per Blob-URL. */
  loadContent(id: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/images/${id}/content`, { responseType: 'blob' });
  }
}

function emptyPage<T>(size: number): Page<T> {
  return {
    content: [],
    totalElements: 0,
    totalPages: 0,
    number: 0,
    size,
    first: true,
    last: true,
    numberOfElements: 0,
    empty: true,
  };
}
