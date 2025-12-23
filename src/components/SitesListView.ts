import type { Site } from '../models/Site';
import type { SiteService } from '../services/SiteService';

/**
 * SitesListView Component
 * 
 * Displays a searchable, sortable list of saved site passwords.
 * Provides password visibility controls, copy functionality, and edit/delete actions.
 * 
 * Features:
 * - Search sites by name or URL (debounced)
 * - Sort by name, date added, or date modified
 * - Masked passwords with temporary reveal (10 seconds)
 * - Copy password to clipboard with visual feedback
 * - Responsive design: cards on mobile, table on desktop
 * - Empty state message when no sites exist
 * 
 * @example
 * const sitesView = new SitesListView(container, siteService);
 * await sitesView.render();
 */
export class SitesListView {
  private container: HTMLElement;
  private siteService: SiteService;
  private sites: Site[] = [];
  private filteredSites: Site[] = [];
  private searchDebounceTimeout: number | null = null;
  private currentSort: 'name' | 'dateAdded' | 'dateModified' = 'dateModified';
  private currentOrder: 'asc' | 'desc' = 'desc';
  private revealedPasswordId: string | null = null;
  private revealTimeout: number | null = null;

  // Cached DOM elements
  private searchInput: HTMLInputElement | null = null;
  private sortSelect: HTMLSelectElement | null = null;
  private siteListContainer: HTMLElement | null = null;
  private emptyState: HTMLElement | null = null;

  constructor(container: HTMLElement, siteService: SiteService) {
    if (!container) {
      throw new Error('Container element is required');
    }
    if (!siteService) {
      throw new Error('SiteService is required');
    }

    this.container = container;
    this.siteService = siteService;
  }

  /**
   * Renders the sites list view
   */
  async render(): Promise<void> {
    this.container.innerHTML = this.getTemplate();
    this.cacheElements();
    this.attachEventListeners();
    await this.loadSites();
  }

  /**
   * Returns the HTML template for the component
   */
  private getTemplate(): string {
    return `
      <div class="sites-view">
        <div class="sites-view__header">
          <h2 class="sites-view__title">Saved Sites</h2>
          <button type="button" class="btn btn--secondary" data-action="close-sites" aria-label="Close sites view">
            Close
          </button>
        </div>
        <div class="sites-view__controls">
          <div class="sites-view__search">
            <label for="sites-search" class="sr-only">Search sites</label>
            <input
              type="search"
              id="sites-search"
              class="sites-view__search-input"
              placeholder="Search by name or URL..."
              aria-label="Search sites by name or URL"
              autocomplete="off"
            />
          </div>
          <div class="sites-view__sort">
            <label for="sites-sort" class="sr-only">Sort sites</label>
            <select
              id="sites-sort"
              class="sites-view__sort-select"
              aria-label="Sort sites by"
            >
              <option value="dateModified-desc">Recently Modified</option>
              <option value="dateModified-asc">Oldest Modified</option>
              <option value="dateAdded-desc">Recently Added</option>
              <option value="dateAdded-asc">Oldest Added</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
            </select>
          </div>
        </div>

        <div class="sites-view__content">
          <!-- Desktop table view -->
          <div class="sites-view__table-container">
            <table class="sites-view__table" role="table" aria-label="Saved sites">
              <thead>
                <tr>
                  <th scope="col">Site Name</th>
                  <th scope="col">URL</th>
                  <th scope="col">Username</th>
                  <th scope="col">Password</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody class="sites-view__table-body">
                <!-- Sites populated by JavaScript -->
              </tbody>
            </table>
          </div>

          <!-- Mobile card view -->
          <div class="sites-view__cards">
            <!-- Sites populated by JavaScript -->
          </div>

          <!-- Empty state -->
          <div class="sites-view__empty" style="display: none;">
            <svg class="sites-view__empty-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h3 class="sites-view__empty-title">No saved sites</h3>
            <p class="sites-view__empty-text">
              Generate a password and assign it to a site to get started.
            </p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Caches DOM element references for performance
   */
  private cacheElements(): void {
    this.searchInput = this.container.querySelector('#sites-search');
    this.sortSelect = this.container.querySelector('#sites-sort');
    this.siteListContainer = this.container.querySelector('.sites-view__cards');
    this.emptyState = this.container.querySelector('.sites-view__empty');
  }

  /**
   * Attaches event listeners to DOM elements
   */
  private attachEventListeners(): void {
    if (this.searchInput) {
      this.searchInput.addEventListener('input', (e) => this.handleSearchInput(e));
    }

    if (this.sortSelect) {
      this.sortSelect.addEventListener('change', (e) => this.handleSortChange(e));
    }

    // Listen for sites updated event
    window.addEventListener('sites-updated', () => {
      this.loadSites();
    });
  }

  /**
   * Loads all sites from the service
   */
  private async loadSites(): Promise<void> {
    try {
      this.sites = await this.siteService.getAllSites();
      this.filteredSites = [...this.sites];
      this.applySorting();
      this.renderSites();
    } catch (error) {
      console.error('Failed to load sites:', error);
      this.showError('Failed to load saved sites. Please try refreshing the page.');
    }
  }

  /**
   * Handles search input with debouncing
   */
  private handleSearchInput(event: Event): void {
    const query = (event.target as HTMLInputElement).value;

    // Clear previous timeout
    if (this.searchDebounceTimeout !== null) {
      window.clearTimeout(this.searchDebounceTimeout);
    }

    // Debounce search by 300ms
    this.searchDebounceTimeout = window.setTimeout(() => {
      this.performSearch(query);
    }, 300);
  }

  /**
   * Performs the search operation
   */
  private async performSearch(query: string): Promise<void> {
    try {
      if (query.trim() === '') {
        this.filteredSites = [...this.sites];
      } else {
        this.filteredSites = await this.siteService.searchSites(query);
      }
      this.applySorting();
      this.renderSites();
    } catch (error) {
      console.error('Search failed:', error);
    }
  }

  /**
   * Handles sort dropdown change
   */
  private handleSortChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    const [sortBy, order] = value.split('-') as ['name' | 'dateAdded' | 'dateModified', 'asc' | 'desc'];
    
    this.currentSort = sortBy;
    this.currentOrder = order;
    this.applySorting();
    this.renderSites();
  }

  /**
   * Applies current sorting to filtered sites
   */
  private applySorting(): void {
    this.filteredSites = this.siteService.sortSites(
      this.filteredSites,
      this.currentSort,
      this.currentOrder
    );
  }

  /**
   * Renders the sites list (both table and cards)
   */
  private renderSites(): void {
    const tableBody = this.container.querySelector('.sites-view__table-body');
    const cardsContainer = this.container.querySelector('.sites-view__cards');

    if (this.filteredSites.length === 0) {
      this.showEmptyState();
      if (tableBody) tableBody.innerHTML = '';
      if (cardsContainer) cardsContainer.innerHTML = '';
      return;
    }

    this.hideEmptyState();

    // Render table rows (desktop)
    if (tableBody) {
      tableBody.innerHTML = this.filteredSites.map(site => this.getSiteRowTemplate(site)).join('');
      this.attachSiteRowListeners(tableBody);
    }

    // Render cards (mobile)
    if (cardsContainer) {
      cardsContainer.innerHTML = this.filteredSites.map(site => this.getSiteCardTemplate(site)).join('');
      this.attachSiteCardListeners(cardsContainer);
    }
  }

  /**
   * Returns HTML template for a site table row
   */
  private getSiteRowTemplate(site: Site): string {
    const isRevealed = this.revealedPasswordId === site.id;
    const maskedPassword = '••••••••';

    return `
      <tr class="sites-view__row" data-site-id="${site.id}">
        <td class="sites-view__cell sites-view__cell--name">${this.escapeHtml(site.siteName)}</td>
        <td class="sites-view__cell sites-view__cell--url">
          <a href="${this.escapeHtml(site.url)}" target="_blank" rel="noopener noreferrer" class="sites-view__url-link">
            ${this.escapeHtml(site.url)}
          </a>
        </td>
        <td class="sites-view__cell sites-view__cell--username">${this.escapeHtml(site.username)}</td>
        <td class="sites-view__cell sites-view__cell--password">
          <span class="sites-view__password" data-site-id="${site.id}">
            ${isRevealed ? this.escapeHtml(site.encryptedPassword) : maskedPassword}
          </span>
          <button
            class="sites-view__reveal-btn"
            data-site-id="${site.id}"
            aria-label="${isRevealed ? 'Hide' : 'Show'} password"
            title="${isRevealed ? 'Hide' : 'Show'} password"
          >
            <svg class="sites-view__icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              ${isRevealed 
                ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />'
                : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />'
              }
            </svg>
          </button>
        </td>
        <td class="sites-view__cell sites-view__cell--actions">
          <div class="sites-view__actions">
            <button
              class="sites-view__action-btn sites-view__action-btn--copy"
              data-site-id="${site.id}"
              aria-label="Copy password"
              title="Copy password"
            >
              <svg class="sites-view__icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              class="sites-view__action-btn sites-view__action-btn--edit"
              data-site-id="${site.id}"
              aria-label="Edit site"
              title="Edit site"
            >
              <svg class="sites-view__icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  /**
   * Returns HTML template for a site card (mobile)
   */
  private getSiteCardTemplate(site: Site): string {
    const isRevealed = this.revealedPasswordId === site.id;
    const maskedPassword = '••••••••';

    return `
      <div class="sites-view__card" data-site-id="${site.id}">
        <div class="sites-view__card-header">
          <h3 class="sites-view__card-title">${this.escapeHtml(site.siteName)}</h3>
          <div class="sites-view__card-actions">
            <button
              class="sites-view__action-btn sites-view__action-btn--copy"
              data-site-id="${site.id}"
              aria-label="Copy password"
              title="Copy password"
            >
              <svg class="sites-view__icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              class="sites-view__action-btn sites-view__action-btn--edit"
              data-site-id="${site.id}"
              aria-label="Edit site"
              title="Edit site"
            >
              <svg class="sites-view__icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          </div>
        </div>
        <div class="sites-view__card-body">
          <div class="sites-view__card-field">
            <span class="sites-view__card-label">URL:</span>
            <a href="${this.escapeHtml(site.url)}" target="_blank" rel="noopener noreferrer" class="sites-view__url-link">
              ${this.escapeHtml(site.url)}
            </a>
          </div>
          <div class="sites-view__card-field">
            <span class="sites-view__card-label">Username:</span>
            <span class="sites-view__card-value">${this.escapeHtml(site.username)}</span>
          </div>
          <div class="sites-view__card-field">
            <span class="sites-view__card-label">Password:</span>
            <div class="sites-view__password-container">
              <span class="sites-view__password" data-site-id="${site.id}">
                ${isRevealed ? this.escapeHtml(site.encryptedPassword) : maskedPassword}
              </span>
              <button
                class="sites-view__reveal-btn"
                data-site-id="${site.id}"
                aria-label="${isRevealed ? 'Hide' : 'Show'} password"
                title="${isRevealed ? 'Hide' : 'Show'} password"
              >
                <svg class="sites-view__icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  ${isRevealed 
                    ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />'
                    : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />'
                  }
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Attaches event listeners to table row elements
   */
  private attachSiteRowListeners(tableBody: Element): void {
    const revealButtons = tableBody.querySelectorAll('.sites-view__reveal-btn');
    const copyButtons = tableBody.querySelectorAll('.sites-view__action-btn--copy');
    const editButtons = tableBody.querySelectorAll('.sites-view__action-btn--edit');

    revealButtons.forEach(btn => {
      btn.addEventListener('click', (e) => this.handleRevealPassword(e));
    });

    copyButtons.forEach(btn => {
      btn.addEventListener('click', (e) => this.handleCopyPassword(e));
    });

    editButtons.forEach(btn => {
      btn.addEventListener('click', (e) => this.handleEditSite(e));
    });
  }

  /**
   * Attaches event listeners to card elements
   */
  private attachSiteCardListeners(cardsContainer: Element): void {
    const revealButtons = cardsContainer.querySelectorAll('.sites-view__reveal-btn');
    const copyButtons = cardsContainer.querySelectorAll('.sites-view__action-btn--copy');
    const editButtons = cardsContainer.querySelectorAll('.sites-view__action-btn--edit');

    revealButtons.forEach(btn => {
      btn.addEventListener('click', (e) => this.handleRevealPassword(e));
    });

    copyButtons.forEach(btn => {
      btn.addEventListener('click', (e) => this.handleCopyPassword(e));
    });

    editButtons.forEach(btn => {
      btn.addEventListener('click', (e) => this.handleEditSite(e));
    });
  }

  /**
   * Handles password reveal/hide toggle
   */
  private handleRevealPassword(event: Event): void {
    const button = event.currentTarget as HTMLElement;
    const siteId = button.dataset.siteId;

    if (!siteId) return;

    if (this.revealedPasswordId === siteId) {
      // Hide password
      this.hidePassword();
    } else {
      // Show password
      this.revealPassword(siteId);
    }
  }

  /**
   * Reveals a password temporarily (10 seconds)
   */
  private revealPassword(siteId: string): void {
    // Clear any existing timeout
    if (this.revealTimeout !== null) {
      window.clearTimeout(this.revealTimeout);
    }

    this.revealedPasswordId = siteId;
    this.renderSites();

    // Auto-hide after 10 seconds
    this.revealTimeout = window.setTimeout(() => {
      this.hidePassword();
    }, 10000);
  }

  /**
   * Hides the currently revealed password
   */
  private hidePassword(): void {
    if (this.revealTimeout !== null) {
      window.clearTimeout(this.revealTimeout);
      this.revealTimeout = null;
    }

    this.revealedPasswordId = null;
    this.renderSites();
  }

  /**
   * Handles copy password to clipboard
   */
  private async handleCopyPassword(event: Event): Promise<void> {
    const button = event.currentTarget as HTMLElement;
    const siteId = button.dataset.siteId;

    if (!siteId) return;

    const site = this.sites.find(s => s.id === siteId);
    if (!site) return;

    try {
      await navigator.clipboard.writeText(site.encryptedPassword);
      this.showCopyConfirmation(button);
    } catch (error) {
      console.error('Failed to copy password:', error);
      this.showError('Failed to copy password to clipboard');
    }
  }

  /**
   * Shows visual confirmation that password was copied
   */
  private showCopyConfirmation(button: HTMLElement): void {
    const originalHTML = button.innerHTML;
    button.classList.add('sites-view__action-btn--copied');
    button.innerHTML = `
      <svg class="sites-view__icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>
    `;

    setTimeout(() => {
      button.classList.remove('sites-view__action-btn--copied');
      button.innerHTML = originalHTML;
    }, 2000);
  }

  /**
   * Handles edit site button click
   */
  private handleEditSite(event: Event): void {
    const button = event.currentTarget as HTMLElement;
    const siteId = button.dataset.siteId;

    if (!siteId) return;

    // Dispatch custom event to open detail modal (which has edit functionality)
    window.dispatchEvent(new CustomEvent('open-detail-modal', {
      detail: { siteId },
      bubbles: true
    }));
  }

  /**
   * Shows the empty state message
   */
  private showEmptyState(): void {
    if (this.emptyState) {
      this.emptyState.style.display = 'flex';
    }
  }

  /**
   * Hides the empty state message
   */
  private hideEmptyState(): void {
    if (this.emptyState) {
      this.emptyState.style.display = 'none';
    }
  }

  /**
   * Shows an error message to the user
   */
  private showError(message: string): void {
    // Dispatch error event for parent component to handle
    this.container.dispatchEvent(new CustomEvent('sites-error', {
      detail: { message },
      bubbles: true
    }));
  }

  /**
   * Escapes HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Refreshes the sites list
   */
  async refresh(): Promise<void> {
    await this.loadSites();
  }

  /**
   * Cleans up event listeners and timers
   */
  destroy(): void {
    // Clear timers
    if (this.searchDebounceTimeout !== null) {
      window.clearTimeout(this.searchDebounceTimeout);
    }
    if (this.revealTimeout !== null) {
      window.clearTimeout(this.revealTimeout);
    }

    // Remove event listeners
    if (this.searchInput) {
      this.searchInput.removeEventListener('input', this.handleSearchInput);
    }
    if (this.sortSelect) {
      this.sortSelect.removeEventListener('change', this.handleSortChange);
    }

    // Clear container
    this.container.innerHTML = '';
  }
}
