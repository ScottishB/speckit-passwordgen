import { Site } from '../models/Site';
import { SiteService } from '../services/SiteService';
import { AuthService } from '../services/AuthService';

/**
 * Modal component for viewing site details
 * Shows all site information with options to edit, delete, copy password, or regenerate
 * 
 * @fires detail-close - Dispatched when modal is closed
 * @fires detail-edit - Dispatched when user clicks Edit button
 * @fires detail-delete - Dispatched when site is successfully deleted
 * @fires detail-regenerate - Dispatched when user wants to regenerate password
 * 
 * @example
 * const modal = new SiteDetailModal(container, siteService, authService, siteId);
 * modal.show();
 * 
 * container.addEventListener('detail-edit', (e) => {
 *   console.log('Edit site:', e.detail.siteId);
 * });
 */
export class SiteDetailModal {
  private container: HTMLElement;
  private siteService: SiteService;
  private authService: AuthService;
  private siteId: string;
  private site: Site | null = null;
  private modalElement: HTMLElement | null = null;

  constructor(
    container: HTMLElement,
    siteService: SiteService,
    authService: AuthService,
    siteId: string
  ) {
    if (!container) {
      throw new Error('Container element is required');
    }
    if (!siteService) {
      throw new Error('SiteService is required');
    }
    if (!authService) {
      throw new Error('AuthService is required');
    }
    if (!siteId) {
      throw new Error('Site ID is required');
    }

    this.container = container;
    this.siteService = siteService;
    this.authService = authService;
    this.siteId = siteId;
  }

  /**
   * Show the modal and load site data
   */
  public async show(): Promise<void> {
    try {
      this.site = await this.siteService.getSite(this.siteId);
      
      if (!this.site) {
        throw new Error('Site not found');
      }

      this.render();
      this.attachEventListeners();
    } catch (error) {
      console.error('[SiteDetailModal] Failed to load site:', error);
      this.handleError('Failed to load site details');
    }
  }

  /**
   * Hide and destroy the modal
   */
  public hide(): void {
    if (this.modalElement) {
      this.modalElement.remove();
      this.modalElement = null;
    }

    // Dispatch close event
    const event = new CustomEvent('detail-close', {
      bubbles: true
    });
    this.container.dispatchEvent(event);
  }

  /**
   * Render the modal HTML
   */
  private render(): void {
    if (!this.site) return;

    const formattedDate = (timestamp: number) => {
      return new Date(timestamp).toLocaleString();
    };

    const modalHTML = `
      <div class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="detail-modal-title">
        <div class="modal-dialog modal-dialog--large">
          <div class="modal-header">
            <h2 id="detail-modal-title">Site Details</h2>
            <button type="button" class="modal-close" aria-label="Close modal">×</button>
          </div>
          
          <div class="modal-body">
            <div class="site-detail">
              <div class="site-detail__field">
                <label class="site-detail__label">Site Name</label>
                <div class="site-detail__value">${this.escapeHtml(this.site.siteName)}</div>
              </div>

              <div class="site-detail__field">
                <label class="site-detail__label">URL / IP Address</label>
                <div class="site-detail__value">
                  <a href="${this.escapeHtml(this.site.url)}" target="_blank" rel="noopener noreferrer" class="site-detail__link">
                    ${this.escapeHtml(this.site.url)}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                      <polyline points="15 3 21 3 21 9"></polyline>
                      <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                  </a>
                </div>
              </div>

              <div class="site-detail__field">
                <label class="site-detail__label">Username</label>
                <div class="site-detail__value">${this.escapeHtml(this.site.username || '—')}</div>
              </div>

              <div class="site-detail__field">
                <label class="site-detail__label">Password</label>
                <div class="site-detail__password">
                  <span class="site-detail__password-masked" data-password="${this.escapeHtml(this.site.encryptedPassword)}">
                    ••••••••
                  </span>
                  <button type="button" class="btn btn-icon" id="toggle-password-btn" aria-label="Show password">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  </button>
                </div>
              </div>

              ${this.site.notes ? `
                <div class="site-detail__field">
                  <label class="site-detail__label">Notes</label>
                  <div class="site-detail__value site-detail__value--notes">${this.escapeHtml(this.site.notes)}</div>
                </div>
              ` : ''}

              <div class="site-detail__field site-detail__field--meta">
                <label class="site-detail__label">Created</label>
                <div class="site-detail__value site-detail__value--meta">${formattedDate(this.site.createdAt)}</div>
              </div>

              <div class="site-detail__field site-detail__field--meta">
                <label class="site-detail__label">Last Modified</label>
                <div class="site-detail__value site-detail__value--meta">${formattedDate(this.site.lastModified)}</div>
              </div>
            </div>

            <div class="modal-error" role="alert" aria-live="assertive" style="display: none;"></div>
          </div>
          
          <div class="modal-footer modal-footer--actions">
            <div class="modal-footer__group">
              <button type="button" class="btn btn-secondary" id="copy-password-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                Copy Password
              </button>
              <button type="button" class="btn btn-secondary" id="regenerate-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <polyline points="1 20 1 14 7 14"></polyline>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                </svg>
                Regenerate Password
              </button>
            </div>
            <div class="modal-footer__group">
              <button type="button" class="btn btn-danger" id="delete-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                Delete
              </button>
              <button type="button" class="btn btn-primary" id="edit-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                Edit
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.container.insertAdjacentHTML('beforeend', modalHTML);
    this.modalElement = this.container.querySelector('.modal-overlay');
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    if (!this.modalElement) return;

    // Close button
    const closeBtn = this.modalElement.querySelector('.modal-close');
    closeBtn?.addEventListener('click', () => this.hide());

    // Toggle password visibility
    const toggleBtn = this.modalElement.querySelector('#toggle-password-btn');
    toggleBtn?.addEventListener('click', () => this.togglePassword());

    // Copy password
    const copyBtn = this.modalElement.querySelector('#copy-password-btn');
    copyBtn?.addEventListener('click', () => this.copyPassword());

    // Edit button
    const editBtn = this.modalElement.querySelector('#edit-btn');
    editBtn?.addEventListener('click', () => this.handleEdit());

    // Delete button
    const deleteBtn = this.modalElement.querySelector('#delete-btn');
    deleteBtn?.addEventListener('click', () => this.handleDelete());

    // Regenerate button
    const regenerateBtn = this.modalElement.querySelector('#regenerate-btn');
    regenerateBtn?.addEventListener('click', () => this.handleRegenerate());

    // Keyboard navigation
    this.modalElement.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hide();
      }
    });

    // Click outside to close
    this.modalElement.addEventListener('click', (e) => {
      if (e.target === this.modalElement) {
        this.hide();
      }
    });
  }

  /**
   * Toggle password visibility
   */
  private togglePassword(): void {
    const passwordMasked = this.modalElement?.querySelector('.site-detail__password-masked');
    const toggleBtn = this.modalElement?.querySelector('#toggle-password-btn');
    
    if (!passwordMasked || !toggleBtn || !this.site) return;

    const isHidden = passwordMasked.textContent === '••••••••';

    if (isHidden) {
      passwordMasked.textContent = this.site.encryptedPassword;
      toggleBtn.setAttribute('aria-label', 'Hide password');
      toggleBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
          <line x1="1" y1="1" x2="23" y2="23"></line>
        </svg>
      `;
    } else {
      passwordMasked.textContent = '••••••••';
      toggleBtn.setAttribute('aria-label', 'Show password');
      toggleBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
      `;
    }
  }

  /**
   * Copy password to clipboard
   */
  private async copyPassword(): Promise<void> {
    if (!this.site) return;

    try {
      await navigator.clipboard.writeText(this.site.encryptedPassword);
      
      const copyBtn = this.modalElement?.querySelector('#copy-password-btn');
      if (copyBtn) {
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          Copied!
        `;
        copyBtn.classList.add('btn--success');

        setTimeout(() => {
          copyBtn.innerHTML = originalText;
          copyBtn.classList.remove('btn--success');
        }, 2000);
      }
    } catch (error) {
      console.error('[SiteDetailModal] Failed to copy password:', error);
      this.showError('Failed to copy password to clipboard');
    }
  }

  /**
   * Handle edit button click
   */
  private handleEdit(): void {
    // Dispatch edit event with siteId
    const event = new CustomEvent('detail-edit', {
      detail: { siteId: this.siteId },
      bubbles: true
    });
    this.container.dispatchEvent(event);

    // Close this modal
    this.hide();
  }

  /**
   * Handle delete button click
   */
  private async handleDelete(): Promise<void> {
    if (!this.site) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${this.site.siteName}"?\n\n` +
      'This action cannot be undone. The site and its password will be permanently removed.'
    );

    if (!confirmed) return;

    try {
      await this.siteService.deleteSite(this.siteId);

      // Dispatch delete event
      const event = new CustomEvent('detail-delete', {
        detail: { siteId: this.siteId, siteName: this.site.siteName },
        bubbles: true
      });
      this.container.dispatchEvent(event);

      // Close modal
      this.hide();
    } catch (error) {
      console.error('[SiteDetailModal] Failed to delete site:', error);
      this.showError('Failed to delete site. Please try again.');
    }
  }

  /**
   * Handle regenerate password button click
   */
  private handleRegenerate(): void {
    // Dispatch regenerate event with siteId
    const event = new CustomEvent('detail-regenerate', {
      detail: { siteId: this.siteId, site: this.site },
      bubbles: true
    });
    this.container.dispatchEvent(event);

    // Close this modal
    this.hide();
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    const errorContainer = this.modalElement?.querySelector('.modal-error');
    
    if (errorContainer) {
      errorContainer.textContent = message;
      (errorContainer as HTMLElement).style.display = 'block';

      setTimeout(() => {
        (errorContainer as HTMLElement).style.display = 'none';
      }, 5000);
    }
  }

  /**
   * Handle initialization error
   */
  private handleError(message: string): void {
    alert(message);
    this.hide();
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Destroy the component
   */
  public destroy(): void {
    this.hide();
  }
}
