import { Site, UpdateSiteInput } from '../models/Site';
import { SiteService } from '../services/SiteService';
import { AuthService } from '../services/AuthService';

/**
 * Modal component for editing existing site details
 * Allows updating site name, URL, username, password, and notes
 * 
 * @fires edit-save - Dispatched when site is successfully updated
 * @fires edit-cancel - Dispatched when user cancels editing
 * 
 * @example
 * const modal = new SiteEditModal(container, siteService, authService, siteId);
 * modal.show();
 * 
 * container.addEventListener('edit-save', (e) => {
 *   console.log('Site updated:', e.detail.site);
 * });
 */
export class SiteEditModal {
  private container: HTMLElement;
  private siteService: SiteService;
  private authService: AuthService;
  private siteId: string;
  private site: Site | null = null;
  private modalElement: HTMLElement | null = null;
  private isDirty: boolean = false;
  private originalValues: Record<string, string> = {};

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

      // Store original values for dirty checking
      this.originalValues = {
        siteName: this.site.siteName,
        url: this.site.url,
        username: this.site.username || '',
        password: this.site.encryptedPassword,
        notes: this.site.notes || ''
      };

      this.render();
      this.attachEventListeners();
      
      // Focus first input
      const firstInput = this.modalElement?.querySelector<HTMLInputElement>('#edit-site-name');
      firstInput?.focus();
    } catch (error) {
      console.error('[SiteEditModal] Failed to load site:', error);
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
  }

  /**
   * Render the modal HTML
   */
  private render(): void {
    if (!this.site) return;

    const modalHTML = `
      <div class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="edit-modal-title">
        <div class="modal-dialog">
          <div class="modal-header">
            <h2 id="edit-modal-title">Edit Site</h2>
            <button type="button" class="modal-close" aria-label="Close modal">×</button>
          </div>
          
          <form id="edit-site-form" class="modal-body">
            <div class="form-group">
              <label for="edit-site-name" class="form-label">
                Site Name <span class="form-required">*</span>
              </label>
              <input
                type="text"
                id="edit-site-name"
                class="form-input"
                value="${this.escapeHtml(this.site.siteName)}"
                required
                maxlength="100"
                aria-describedby="edit-site-name-error"
              />
              <div id="edit-site-name-error" class="form-error" role="alert" style="display: none;"></div>
            </div>

            <div class="form-group">
              <label for="edit-url" class="form-label">
                URL / IP Address <span class="form-required">*</span>
              </label>
              <input
                type="text"
                id="edit-url"
                class="form-input"
                value="${this.escapeHtml(this.site.url)}"
                required
                placeholder="https://example.com or 192.168.1.1"
                aria-describedby="edit-url-error edit-url-help"
              />
              <div id="edit-url-error" class="form-error" role="alert" style="display: none;"></div>
              <div id="edit-url-help" class="form-help">Enter a valid URL (with http/https) or IP address</div>
            </div>

            <div class="form-group">
              <label for="edit-username" class="form-label">
                Username
              </label>
              <input
                type="text"
                id="edit-username"
                class="form-input"
                value="${this.escapeHtml(this.site.username || '')}"
                maxlength="100"
              />
            </div>

            <div class="form-group">
              <label for="edit-password" class="form-label">
                Password <span class="form-required">*</span>
              </label>
              <div class="form-input-group">
                <input
                  type="password"
                  id="edit-password"
                  class="form-input"
                  value="${this.escapeHtml(this.site.encryptedPassword)}"
                  required
                  aria-describedby="edit-password-error"
                />
                <button type="button" class="btn btn-icon" id="toggle-edit-password" aria-label="Show password">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </button>
              </div>
              <div id="edit-password-error" class="form-error" role="alert" style="display: none;"></div>
            </div>

            <div class="form-group">
              <label for="edit-notes" class="form-label">
                Notes
              </label>
              <textarea
                id="edit-notes"
                class="form-textarea"
                rows="4"
                maxlength="500"
                placeholder="Optional notes about this site"
              >${this.escapeHtml(this.site.notes || '')}</textarea>
              <div class="form-help">Optional notes about this site (max 500 characters)</div>
            </div>

            <div class="form-error form-error--general" role="alert" aria-live="assertive" style="display: none;"></div>
            
            <div class="password-reuse-warning" role="alert" style="display: none;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <div class="password-reuse-warning__content">
                <strong>Password Already in Use</strong>
                <p></p>
              </div>
            </div>
          </form>
          
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" id="cancel-edit-btn">Cancel</button>
            <button type="submit" form="edit-site-form" class="btn btn-primary" id="save-edit-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                <polyline points="7 3 7 8 15 8"></polyline>
              </svg>
              Save Changes
            </button>
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

    // Form submission
    const form = this.modalElement.querySelector('#edit-site-form');
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSave();
    });

    // Cancel button
    const cancelBtn = this.modalElement.querySelector('#cancel-edit-btn');
    cancelBtn?.addEventListener('click', () => this.handleCancel());

    // Close button
    const closeBtn = this.modalElement.querySelector('.modal-close');
    closeBtn?.addEventListener('click', () => this.handleCancel());

    // URL validation on blur
    const urlInput = this.modalElement.querySelector<HTMLInputElement>('#edit-url');
    urlInput?.addEventListener('blur', () => this.validateUrl());

    // Password validation on blur
    const passwordInput = this.modalElement.querySelector<HTMLInputElement>('#edit-password');
    passwordInput?.addEventListener('blur', () => this.checkPasswordReuse());

    // Toggle password visibility
    const toggleBtn = this.modalElement.querySelector('#toggle-edit-password');
    toggleBtn?.addEventListener('click', () => this.togglePasswordVisibility());

    // Track dirty state
    const inputs = this.modalElement.querySelectorAll('input, textarea');
    inputs.forEach(input => {
      input.addEventListener('input', () => this.updateDirtyState());
    });

    // Keyboard navigation
    this.modalElement.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.handleCancel();
      }
    });
  }

  /**
   * Update dirty state by comparing current values with originals
   */
  private updateDirtyState(): void {
    const siteNameInput = this.modalElement?.querySelector<HTMLInputElement>('#edit-site-name');
    const urlInput = this.modalElement?.querySelector<HTMLInputElement>('#edit-url');
    const usernameInput = this.modalElement?.querySelector<HTMLInputElement>('#edit-username');
    const passwordInput = this.modalElement?.querySelector<HTMLInputElement>('#edit-password');
    const notesInput = this.modalElement?.querySelector<HTMLTextAreaElement>('#edit-notes');

    if (!siteNameInput || !urlInput || !usernameInput || !passwordInput || !notesInput) return;

    this.isDirty = (
      siteNameInput.value !== this.originalValues.siteName ||
      urlInput.value !== this.originalValues.url ||
      usernameInput.value !== this.originalValues.username ||
      passwordInput.value !== this.originalValues.password ||
      notesInput.value !== this.originalValues.notes
    );
  }

  /**
   * Toggle password visibility
   */
  private togglePasswordVisibility(): void {
    const passwordInput = this.modalElement?.querySelector<HTMLInputElement>('#edit-password');
    const toggleBtn = this.modalElement?.querySelector('#toggle-edit-password');
    
    if (!passwordInput || !toggleBtn) return;

    const isPassword = passwordInput.type === 'password';

    if (isPassword) {
      passwordInput.type = 'text';
      toggleBtn.setAttribute('aria-label', 'Hide password');
      toggleBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
          <line x1="1" y1="1" x2="23" y2="23"></line>
        </svg>
      `;
    } else {
      passwordInput.type = 'password';
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
   * Validate URL format
   */
  private validateUrl(): void {
    const urlInput = this.modalElement?.querySelector<HTMLInputElement>('#edit-url');
    const urlError = this.modalElement?.querySelector<HTMLElement>('#edit-url-error');
    
    if (!urlInput || !urlError) return;

    const url = urlInput.value.trim();
    
    if (!url) {
      this.showFieldError(urlInput, urlError, 'URL is required');
      return;
    }

    try {
      const isValid = this.siteService.validateUrlOrIp(url);
      
      if (isValid) {
        this.clearFieldError(urlInput, urlError);
      } else {
        this.showFieldError(urlInput, urlError, 'Please enter a valid URL (with http/https) or IP address');
      }
    } catch (error) {
      this.showFieldError(urlInput, urlError, 'Invalid URL format');
    }
  }

  /**
   * Check if password is being reused on other sites
   */
  private async checkPasswordReuse(): Promise<void> {
    const passwordInput = this.modalElement?.querySelector<HTMLInputElement>('#edit-password');
    const warning = this.modalElement?.querySelector<HTMLElement>('.password-reuse-warning');
    
    if (!passwordInput || !warning) return;

    const password = passwordInput.value;
    
    // Skip check if password hasn't changed
    if (password === this.originalValues.password) {
      warning.style.display = 'none';
      return;
    }

    if (!password) {
      warning.style.display = 'none';
      return;
    }

    try {
      const allReusedSites = await this.siteService.checkPasswordReuse(password);
      // Filter out the current site from results
      const reusedSites = allReusedSites.filter(site => site.id !== this.siteId);
      
      if (reusedSites.length > 0) {
        const siteNames = reusedSites.map(s => s.siteName).join(', ');
        const warningText = warning.querySelector('p');
        if (warningText) {
          warningText.textContent = `This password is already used on: ${siteNames}`;
        }
        warning.style.display = 'flex';
      } else {
        warning.style.display = 'none';
      }
    } catch (error) {
      console.error('[SiteEditModal] Failed to check password reuse:', error);
    }
  }

  /**
   * Handle save button click
   */
  private async handleSave(): Promise<void> {
    const siteNameInput = this.modalElement?.querySelector<HTMLInputElement>('#edit-site-name');
    const urlInput = this.modalElement?.querySelector<HTMLInputElement>('#edit-url');
    const usernameInput = this.modalElement?.querySelector<HTMLInputElement>('#edit-username');
    const passwordInput = this.modalElement?.querySelector<HTMLInputElement>('#edit-password');
    const notesInput = this.modalElement?.querySelector<HTMLTextAreaElement>('#edit-notes');
    const saveBtn = this.modalElement?.querySelector<HTMLButtonElement>('#save-edit-btn');

    if (!siteNameInput || !urlInput || !usernameInput || !passwordInput || !notesInput || !saveBtn) return;

    // Clear previous errors
    this.clearAllErrors();

    // Validate required fields
    let hasErrors = false;

    const siteName = siteNameInput.value.trim();
    if (!siteName) {
      const error = this.modalElement?.querySelector('#edit-site-name-error');
      if (error) this.showFieldError(siteNameInput, error as HTMLElement, 'Site name is required');
      hasErrors = true;
    }

    const url = urlInput.value.trim();
    if (!url) {
      const error = this.modalElement?.querySelector('#edit-url-error');
      if (error) this.showFieldError(urlInput, error as HTMLElement, 'URL is required');
      hasErrors = true;
    } else {
      const isValidUrl = this.siteService.validateUrlOrIp(url);
      if (!isValidUrl) {
        const error = this.modalElement?.querySelector('#edit-url-error');
        if (error) this.showFieldError(urlInput, error as HTMLElement, 'Please enter a valid URL or IP address');
        hasErrors = true;
      }
    }

    const password = passwordInput.value;
    if (!password) {
      const error = this.modalElement?.querySelector('#edit-password-error');
      if (error) this.showFieldError(passwordInput, error as HTMLElement, 'Password is required');
      hasErrors = true;
    }

    if (hasErrors) return;

    // Prepare update data
    const updateData: UpdateSiteInput = {
      siteName,
      url,
      username: usernameInput.value.trim() || undefined,
      password: password,
      notes: notesInput.value.trim() || undefined
    };

    // Show loading state
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
      const updatedSite = await this.siteService.updateSite(this.siteId, updateData);

      // Dispatch success event
      const event = new CustomEvent('edit-save', {
        detail: { site: updatedSite },
        bubbles: true
      });
      this.container.dispatchEvent(event);

      // Close modal
      this.hide();
    } catch (error) {
      console.error('[SiteEditModal] Failed to update site:', error);
      this.showGeneralError('Failed to save changes. Please try again.');
      
      // Restore button state
      saveBtn.disabled = false;
      saveBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
          <polyline points="17 21 17 13 7 13 7 21"></polyline>
          <polyline points="7 3 7 8 15 8"></polyline>
        </svg>
        Save Changes
      `;
    }
  }

  /**
   * Handle cancel button click
   */
  private handleCancel(): void {
    // Check if form is dirty
    this.updateDirtyState();

    if (this.isDirty) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to discard them?'
      );

      if (!confirmed) return;
    }

    // Dispatch cancel event
    const event = new CustomEvent('edit-cancel', {
      bubbles: true
    });
    this.container.dispatchEvent(event);

    // Close modal
    this.hide();
  }

  /**
   * Show field-specific error
   */
  private showFieldError(input: HTMLElement, errorElement: HTMLElement, message: string): void {
    input.classList.add('form-input--error');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
  }

  /**
   * Clear field-specific error
   */
  private clearFieldError(input: HTMLElement, errorElement: HTMLElement): void {
    input.classList.remove('form-input--error');
    errorElement.textContent = '';
    errorElement.style.display = 'none';
  }

  /**
   * Show general error message
   */
  private showGeneralError(message: string): void {
    const errorContainer = this.modalElement?.querySelector<HTMLElement>('.form-error--general');
    
    if (errorContainer) {
      errorContainer.textContent = message;
      errorContainer.style.display = 'block';
    }
  }

  /**
   * Clear all errors
   */
  private clearAllErrors(): void {
    const errorElements = this.modalElement?.querySelectorAll('.form-error');
    errorElements?.forEach(el => {
      (el as HTMLElement).style.display = 'none';
      el.textContent = '';
    });

    const inputs = this.modalElement?.querySelectorAll('.form-input--error');
    inputs?.forEach(input => {
      input.classList.remove('form-input--error');
    });
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
