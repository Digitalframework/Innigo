import { NgTemplateOutlet } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, effect, inject, output, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NzIconModule } from 'ng-zorro-antd/icon';

import { AuthService, NotAuthenticatedError } from '../../../core/auth.service';
import { DesignerStore } from '../../../core/designer-store';
import {
  CATEGORY_LABELS,
  CatalogItem,
  FURNITURE_CATEGORIES,
  FurnitureCategory,
  FurnitureCatalogService,
} from '../../../core/furniture-catalog';
import { FurnitureImageApi, FurnitureImageResponse, roomFor } from '../../../core/furniture-image.api';
import { FurnitureItem, RoomType } from '../../../core/models';

/**
 * Fester Stil für die Katalogabfrage — die Stile des UI sind deutsch und haben
 * noch keine Entsprechung in der `style`-Spalte, siehe TODO(API) unten.
 */
const QUERY_STYLE = 'Modern';

/**
 * Bilder pro Kategorie. Jede Kachel braucht einen eigenen Content-Request, also
 * deutlich unter dem Backend-Default von 50 gehalten.
 */
const PAGE_SIZE = 24;

/**
 * Fehlertext für die Sidebar.
 *
 * Der häufigste Fall ist die fehlende Anmeldung bei AuthAndSecurity — die sah
 * vorher wie eine leere Kategorie aus, weil ohne Token jede Abfrage scheitert.
 */
function messageFor(error: unknown): string {
  if (error instanceof NotAuthenticatedError) return 'Nicht angemeldet — Möbel können nicht geladen werden.';
  if (error instanceof HttpErrorResponse) {
    switch (error.status) {
      case 0:
        // Kein Status heißt: die Antwort kam nie beim JavaScript an — Server
        // nicht erreichbar oder CORS-Preflight abgelehnt.
        return 'Backend nicht erreichbar (Port 8081 oder CORS).';
      case 401:
        return 'Token wurde abgelehnt (401) — Anmeldung abgelaufen?';
      case 403:
        return 'Keine Berechtigung für diese Möbel (403).';
      default:
        return `Möbel konnten nicht geladen werden (HTTP ${error.status}).`;
    }
  }
  return 'Möbel konnten nicht geladen werden.';
}

export interface CategoryNode {
  category: FurnitureCategory;
  label: string;
  items: CatalogItem[];
}

/**
 * Sidebar-Panel mit den Möbeln des Projekts.
 *
 * - Redesign-Modus: Tree mit allen Möbeln, die im gewählten Raum bereitgestellt
 *   werden können. Standardmäßig aufgeklappt sind die Kategorien des Raums,
 *   darunter lassen sich alle weiteren Möbel öffnen.
 * - Möbel-Modus: die im Bild markierten Möbelstücke, die ersetzt werden sollen.
 */
@Component({
  selector: 'app-furniture-panel',
  imports: [NgTemplateOutlet, NzIconModule],
  templateUrl: './furniture-panel.html',
  styleUrl: './furniture-panel.scss',
})
export class FurniturePanel {
  protected readonly store = inject(DesignerStore);
  private readonly catalog = inject(FurnitureCatalogService);
  private readonly images = inject(FurnitureImageApi);
  private readonly destroyRef = inject(DestroyRef);

  readonly editRequested = output<FurnitureItem>();

  /** Geladene Kacheln je Kategorie; fehlender Eintrag = noch nicht abgefragt. */
  private readonly itemsByCategory = signal<Partial<Record<FurnitureCategory, CatalogItem[]>>>({});
  /** Kategorien mit laufender Abfrage. */
  private readonly loadingCategories = signal<readonly FurnitureCategory[]>([]);
  /** Fehlermeldung je Kategorie — sonst wäre ein Fehler von „leer“ nicht zu unterscheiden. */
  private readonly errorsByCategory = signal<Partial<Record<FurnitureCategory, string>>>({});
  /** Kategorien, deren Fehler eine Anmeldung war. */
  private readonly loginRequired = signal<readonly FurnitureCategory[]>([]);

  /** Ziel des Anmeldelinks im Fehlerfall. */
  protected readonly loginUrl = inject(AuthService).loginUrl;
  /** Blob-URLs der Kacheln, beim Zerstören wieder freizugeben. */
  private readonly objectUrls: string[] = [];

  constructor() {
    this.destroyRef.onDestroy(() => this.revokeObjectUrls());

    // Ein Raumwechsel ändert die Treffermenge, also Cache verwerfen und die
    // offenen Kategorien neu laden.
    let loadedRoom: RoomType | null = null;
    effect(() => {
      const room = this.store.room();
      if (room === loadedRoom) return;
      loadedRoom = room;

      untracked(() => {
        this.revokeObjectUrls();
        this.itemsByCategory.set({});
        this.loadingCategories.set([]);
        this.errorsByCategory.set({});
        this.loginRequired.set([]);
        for (const category of this.expanded()) this.loadCategory(category);
      });
    });
  }

  /** Aufgeklappte Kategorien im Tree. */
  private readonly expanded = signal<FurnitureCategory[]>([]);
  /** Gruppe "Weitere Möbel" aufgeklappt? */
  protected readonly showOthers = signal(false);

  /** Filter-Popover geöffnet? */
  protected readonly showFilter = signal(false);
  /** Aktive Kategorie-Filter — leer = alle Möbelstücke anzeigen. */
  protected readonly filter = signal<FurnitureCategory[]>([]);

  protected readonly allCategories = FURNITURE_CATEGORIES;
  protected readonly categoryLabels = CATEGORY_LABELS;

  /**
   * Bei aktivem Filter werden die weiteren Möbel automatisch mit aufgeklappt —
   * sonst versteckt sich ein Treffer hinter dem zugeklappten Bereich.
   */
  protected readonly othersVisible = computed(() => this.showOthers() || this.filter().length > 0);

  /** Zusammenfassung der aktiven Filter, wenn das Filterfeld zugeklappt ist. */
  protected readonly activeFilterLabels = computed(() =>
    this.filter()
      .map((category) => CATEGORY_LABELS[category])
      .join(', '),
  );

  /**
   * Kategorien, die standardmäßig im Tree stehen:
   * - Redesign: die Möbel des gewählten Raums
   * - Möbel-Modus: die Möbel, die man im Bild zum Ersetzen markiert hat
   *   (Fallback auf die Raum-Möbel, solange nichts zuordenbar ist)
   *
   * TODO(API): beide Listen kommen später asynchron vom Backend (siehe
   * FurnitureCatalogService) — dann als resource/httpResource statt computed.
   */
  private readonly primaryCategories = computed<FurnitureCategory[]>(() => {
    if (this.store.mode() === 'furniture') {
      const labels = this.store.furniture().map((item) => item.label);
      const matched = this.catalog.categoriesForLabels(labels);
      if (matched.length > 0) return matched;
    }
    return this.catalog.categoriesForRoom(this.store.room());
  });

  protected readonly primaryNodes = computed<CategoryNode[]>(() =>
    this.toNodes(this.primaryCategories()),
  );

  protected readonly otherNodes = computed<CategoryNode[]>(() =>
    this.toNodes(this.catalog.otherCategories(this.primaryCategories())),
  );

  private toNodes(categories: readonly FurnitureCategory[]): CategoryNode[] {
    const loaded = this.itemsByCategory();
    const active = this.filter();
    return categories
      .filter((category) => active.length === 0 || active.includes(category))
      .map((category) => ({
        category,
        label: CATEGORY_LABELS[category],
        items: loaded[category] ?? [],
      }));
  }

  protected isLoading(category: FurnitureCategory): boolean {
    return this.loadingCategories().includes(category);
  }

  /** Grund, warum eine Kategorie leer blieb — `undefined`, wenn sie es wirklich ist. */
  protected loadError(category: FurnitureCategory): string | undefined {
    return this.errorsByCategory()[category];
  }

  /** Ob der Fehler durch eine Anmeldung behoben wird — dann steht ein Link daneben. */
  protected needsLogin(category: FurnitureCategory): boolean {
    return this.loginRequired().includes(category);
  }

  /** Ob eine Kategorie schon abgefragt wurde — für die leere Trefferanzeige. */
  protected isLoaded(category: FurnitureCategory): boolean {
    return this.itemsByCategory()[category] !== undefined;
  }

  /**
   * Fragt die Bilder einer Kategorie ab — einmal, beim ersten Aufklappen.
   *
   * `searchByCategory` schlägt die `categoryId` nach; Kategorien ohne Zeile in
   * `furniture_category` (aktuell `Sidetable`) liefern eine leere Seite, ohne
   * dass ein ungefilterter Request rausgeht.
   */
  private loadCategory(category: FurnitureCategory): void {
    if (this.isLoaded(category) || this.isLoading(category)) return;
    this.loadingCategories.update((list) => [...list, category]);

    const room = roomFor(this.store.room());
    this.images
      .searchByCategory(category, {
        room: room ?? undefined,
        // TODO(API): fester Stil, bis die `style`-Werte der Datenbank feststehen
        // und auf StyleType abgebildet sind.
        style: QUERY_STYLE,
        size: PAGE_SIZE,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => this.setItems(category, page.content),
        error: (error) => {
          // Die Kachelanzeige kürzt den Fehler auf einen Satz; für die Ursache
          // (URL, Body des Backends) braucht es das Original.
          console.error(`Möbel der Kategorie ${category} konnten nicht geladen werden`, error);
          this.errorsByCategory.update((map) => ({ ...map, [category]: messageFor(error) }));
          if (error instanceof NotAuthenticatedError) {
            this.loginRequired.update((list) => [...list, category]);
          }
          this.setItems(category, []);
        },
      });
  }

  private setItems(category: FurnitureCategory, images: FurnitureImageResponse[]): void {
    const style = this.store.style();
    this.itemsByCategory.update((map) => ({
      ...map,
      [category]: images.map((image) => ({
        id: String(image.id),
        name: image.name,
        category,
        style,
        // Wird nachgereicht, sobald der Content-Request durch ist.
        imageUrl: null,
        imageWidthPx: image.widthPx,
        imageHeightPx: image.heightPx,
      })),
    }));
    this.loadingCategories.update((list) => list.filter((entry) => entry !== category));

    for (const image of images) this.loadThumbnail(category, image.id);
  }

  /**
   * Holt die Bytes einer Kachel und hängt sie als Blob-URL an.
   *
   * Der Umweg ist nötig, weil `/api/images/{id}/content` ein Bearer-Token
   * verlangt und ein `<img src>` keine Header schickt.
   */
  private loadThumbnail(category: FurnitureCategory, id: number): void {
    this.images
      .loadContent(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          this.objectUrls.push(url);
          this.itemsByCategory.update((map) => ({
            ...map,
            [category]: (map[category] ?? []).map((item) =>
              item.id === String(id) ? { ...item, imageUrl: url } : item,
            ),
          }));
        },
        // Ohne Bild bleibt der Platzhalter stehen — die Kachel ist trotzdem wählbar.
        error: () => undefined,
      });
  }

  private revokeObjectUrls(): void {
    for (const url of this.objectUrls) URL.revokeObjectURL(url);
    this.objectUrls.length = 0;
  }

  protected isFiltered(category: FurnitureCategory): boolean {
    return this.filter().includes(category);
  }

  protected toggleFilterCategory(category: FurnitureCategory): void {
    this.filter.update((list) =>
      list.includes(category) ? list.filter((c) => c !== category) : [...list, category],
    );
  }

  protected toggleFilterPanel(): void {
    this.showFilter.update((v) => !v);
  }

  protected clearFilter(): void {
    this.filter.set([]);
  }

  protected isExpanded(category: FurnitureCategory): boolean {
    return this.expanded().includes(category);
  }

  protected toggleCategory(category: FurnitureCategory): void {
    const opening = !this.isExpanded(category);
    this.expanded.update((list) =>
      opening ? [...list, category] : list.filter((c) => c !== category),
    );
    if (opening) this.loadCategory(category);
  }

  protected toggleOthers(): void {
    this.showOthers.update((v) => !v);
  }

  protected isSelected(item: CatalogItem): boolean {
    return this.store.catalogSelection().includes(item.id);
  }

  protected toggleItem(item: CatalogItem): void {
    this.store.toggleCatalogItem(item.id);
  }

  protected edit(item: FurnitureItem): void {
    this.editRequested.emit(item);
  }
}
