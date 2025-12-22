import { Site, CreateSiteInput } from '../models/Site';
import { SiteService } from '../services/SiteService';
import { AuthService } from '../services/AuthService';

/**
 * Modal component for assigning a generated password to a site
 * Shows after password generation with option to save to a site or skip
 * 
 * @fires assign-complete - Dispatched when site is successfully created
 * @fires assign-skip - Dispatched when user skips assignment
 * 
 * @example
 * const modal = new SiteAssignModal(container, siteService, authService, generatedPassword);
 * modal.show();
 * 
 * container.addEventListener('assign-complete', (e) => {
 *   console.log('Site created:', e.detail.site);
 * });
 */
export class SiteAssignModal {
  private container: HTMLElement;
  private siteService: SiteService;
  private authService: AuthService;
  private generatedPassword: string;
  private modalElement: HTMLElement | null = null;
  private inactivityTimeout: number | null = null;
  private readonly INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes

  constructor(
    container: HTMLElement,
    siteService: SiteService,
    authService: AuthService,
    generatedPassword: string
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
    if (!generatedPassword) {
      throw new Error('Generated password is required');
    }

    this.container = container;
    this.siteService = siteService;
    this.authService = authService;
    this.generatedPassword = generatedPassword;
  }

  /**
   * Show the modal and start inactivity timeout
   */
  public show(): void {
    this.render();
    this.attachEventListeners();
    this.startInactivityTimeout();
    
    // Focus first input
    const siteNameInput = this.modalElement?.querySelector<HTMLInputElement>('#assign-site-name');
    if (siteNameInput) {
      setTimeout(() => siteNameInput.focus(), 100);
    }
  }

  /**
   * Hide and destroy the modal
   */
  public hide(): void {
    this.stopInactivityTimeout();
    
    if (this.modalElement) {
      this.modalElement.remove();
      this.modalElement = null;
    }
  }

  /**
   * Render the modal HTML
   */
  private render(): void {
    const modalHTML = `
      <div class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="assign-modal-title">
        <div class="modal-dialog">
          <div class="modal-header">
            <h2 id="assign-modal-title">Assign Password to Site</h2>
            <button type="button" class="modal-close" aria-label="Close modal">×</button>
          </div>
          
          <div class="modal-body">
            <p class="modal-description">
              Save this password to a site for easy management and tracking.
            </p>
            
            <form id="assign-site-form" novalidate>
              <div class="form-group">
                <label for="assign-site-name">
                  Site Name <span class="required">*</span>
                </label>
                <input
                  type="text"
                  id="assign-site-name"
                  name="siteName"
                  class="form-input"
                  placeholder="e.g., GitHub, Gmail"
                  aria-required="true"
                  aria-describedby="site-name-help"
                  autocomplete="off"
                  required
                />
                <small id="site-name-help" class="form-help">
                  A friendly name to identify this site
                </small>
                <div class="form-error" role="alert" aria-live="polite"></div>
              </div>

              <div class="form-group">
                <label for="assign-url">
                  URL or IP Address <span class="required">*</span>
                </label>
                <input
                  type="text"
                  id="assign-url"
                  name="url"
                  class="form-input"
                  placeholder="e.g., https://github.com or 192.168.1.1"
                  aria-required="true"
                  aria-describedby="url-help"
                  autocomplete="off"
                  required
                />
                <small id="url-help" class="form-help">
                  The website URL or IP address where you'll use this password
                </small>
                <div class="form-error" role="alert" aria-live="polite"></div>
              </div>

              <div class="form-group">
                <label for="assign-username">
                  Username
                </label>
                <input
                  type="text"
                  id="assign-username"
                  name="username"
                  class="form-input"
                  placeholder="e.g., john.doe@example.com"
                  aria-describedby="username-help"
                  autocomplete="username"
                />
                <small id="username-help" class="form-help">
                  Optional: Your username or email for this site
                </small>
                <div class="form-error" role="alert" aria-live="polite"></div>
              </div>

              <div class="form-group">
                <label for="assign-password">
                  Generated Password
                </label>
                <input
                  type="text"
                  id="assign-password"
                  name="password"
                  class="form-input form-input--readonly"
                  value="${this.escapeHtml(this.generatedPassword)}"
                  readonly
                  aria-describedby="password-help"
                />
                <small id="password-help" class="form-help">
                  This is the password you just generated
                </small>
              </div>

              <div class="form-group">
                <label for="assign-notes">
                  Notes
                </label>
                <textarea
                  id="assign-notes"
                  name="notes"
                  class="form-input form-textarea"
                  placeholder="Optional notes about this site..."
                  aria-describedby="notes-help"
                  rows="3"
                ></textarea>
                <small id="notes-help" class="form-help">
                  Any additional information (security questions, etc.)
                </small>
              </div>

              <div class="password-reuse-warning" style="display: none;">
                <div class="warning-message" role="alert">
                  <strong>⚠ Warning:</strong>
                  <span class="warning-text">This password is already used on other sites.</span>
                </div>
              </div>

              <div class="form-error form-error--general" role="alert" aria-live="assertive"></div>
            </form>
          </div>
          
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" id="skip-assign-btn">
              Skip (Not Recommended)
            </button>
            <button type="submit" form="assign-site-form" class="btn btn-primary" id="assign-btn">
              Assign to Site
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

    // Close button
    const closeBtn = this.modalElement.querySelector('.modal-close');
    closeBtn?.addEventListener('click', () => this.handleSkip());

    // Skip button
    const skipBtn = this.modalElement.querySelector('#skip-assign-btn');
    skipBtn?.addEventListener('click', () => this.handleSkip());

    // Form submission
    const form = this.modalElement.querySelector<HTMLFormElement>('#assign-site-form');
    form?.addEventListener('submit', (e) => this.handleSubmit(e));

    // URL validation on blur
    const urlInput = this.modalElement.querySelector<HTMLInputElement>('#assign-url');
    urlInput?.addEventListener('blur', () => this.validateUrl());

    // Reset inactivity timeout on any interaction
    const inputs = this.modalElement.querySelectorAll('input, textarea');
    inputs.forEach(input => {
      input.addEventListener('input', () => this.resetInactivityTimeout());
      input.addEventListener('focus', () => this.resetInactivityTimeout());
    });

    // Keyboard navigation
    this.modalElement.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.handleSkip();
      }
    });

    // Click outside to close
    this.modalElement.addEventListener('click', (e) => {
      if (e.target === this.modalElement) {
        this.handleSkip();
      }
    });
  }

  /**
   * Handle form submission
   */
  private async handleSubmit(event: Event): Promise<void> {
    event.preventDefault();
    
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const siteName = (formData.get('siteName') as string || '').trim();
    const url = (formData.get('url') as string || '').trim();
    const username = (formData.get('username') as string || '').trim();
    const notes = (formData.get('notes') as string || '').trim();

    // Clear previous errors
    this.clearErrors();

    // Validate required fields
    let hasErrors = false;
    
    if (!siteName) {
      this.showFieldError('assign-site-name', 'Site name is required');
      hasErrors = true;
    }

    if (!url) {
      this.showFieldError('assign-url', 'URL or IP address is required');
      hasErrors = true;
    } else if (!this.validateUrl()) {
      hasErrors = true;
    }

    if (hasErrors) {
      return;
    }

    try {
      this.setLoading(true);

      // Check password reuse
      await this.checkPasswordReuse();

      // Get current user
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Create site
      const siteInput: CreateSiteInput = {
        userId: currentUser.id,
        siteName,
        url,
        username,
        password: this.generatedPassword,
        notes,
        tags: []
      };

      const site = await this.siteService.createSite(siteInput);

      // Dispatch success event
      const event = new CustomEvent('assign-complete', {
        detail: { site },
        bubbles: true
      });
      this.container.dispatchEvent(event);

      // Hide modal
      this.hide();

    } catch (error) {
      this.setLoading(false);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to assign password to site. Please try again.';
      
      this.showGeneralError(errorMessage);
    }
  }

  /**
   * Handle skip button click
   */
  private handleSkip(): void {
    const confirmed = window.confirm(
      'Are you sure you want to skip assigning this password to a site?\n\n' +
      'You can always add it later from the Sites tab, but you\'ll need to remember or copy it.'
    );

    if (confirmed) {
      // Dispatch skip event
      const event = new CustomEvent('assign-skip', {
        bubbles: true
      });
      this.container.dispatchEvent(event);

      // Hide modal
      this.hide();
    }
  }

  /**
   * Validate URL format
   */
  private validateUrl(): boolean {
    const urlInput = this.modalElement?.querySelector<HTMLInputElement>('#assign-url');
    if (!urlInput) return false;

    const url = urlInput.value.trim();
    if (!url) return true; // Skip validation if empty (handled by required validation)

    const validation = this.siteService.validateUrlOrIp(url);
    
    if (!validation.valid) {
      this.showFieldError('assign-url', validation.warning || 'Invalid URL or IP address format');
      return false;
    }

    this.clearFieldError('assign-url');
    return true;
  }

  /**
   * Check if password is reused on other sites
   */
  private async checkPasswordReuse(): Promise<void> {
    try {
      const reusedSites = await this.siteService.checkPasswordReuse(this.generatedPassword);
      
      const warningContainer = this.modalElement?.querySelector('.password-reuse-warning');
      const warningText = this.modalElement?.querySelector('.warning-text');
      
      if (reusedSites.length > 0 && warningContainer && warningText) {
        const siteNames = reusedSites.map(site => site.siteName).join(', ');
        warningText.textContent = `This password is already used on: ${siteNames}. Consider generating a unique password.`;
        (warningContainer as HTMLElement).style.display = 'block';
      }
    } catch (error) {
      // Non-critical error, just log it
      console.warn('Failed to check password reuse:', error);
    }
  }

  /**
   * Start inactivity timeout (5 minutes)
   */
  private startInactivityTimeout(): void {
    this.inactivityTimeout = window.setTimeout(() => {
      alert('This form has been closed due to inactivity for security reasons.');
      this.handleSkip();
    }, this.INACTIVITY_TIMEOUT);
  }

  /**
   * Reset inactivity timeout
   */
  private resetInactivityTimeout(): void {
    this.stopInactivityTimeout();
    this.startInactivityTimeout();
  }

  /**
   * Stop inactivity timeout
   */
  private stopInactivityTimeout(): void {
    if (this.inactivityTimeout !== null) {
      window.clearTimeout(this.inactivityTimeout);
      this.inactivityTimeout = null;
    }
  }

  /**
   * Set loading state
   */
  private setLoading(loading: boolean): void {
    const assignBtn = this.modalElement?.querySelector<HTMLButtonElement>('#assign-btn');
    const skipBtn = this.modalElement?.querySelector<HTMLButtonElement>('#skip-assign-btn');
    const inputs = this.modalElement?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input:not([readonly]), textarea');

    if (assignBtn) {
      assignBtn.disabled = loading;
      assignBtn.textContent = loading ? 'Assigning...' : 'Assign to Site';
    }

    if (skipBtn) {
      skipBtn.disabled = loading;
    }

    inputs?.forEach(input => {
      input.disabled = loading;
    });
  }

  /**
   * Show field error
   */
  private showFieldError(fieldId: string, message: string): void {
    const input = this.modalElement?.querySelector<HTMLInputElement>(`#${fieldId}`);
    const errorContainer = input?.parentElement?.querySelector('.form-error');

    if (input) {
      input.classList.add('form-input--error');
      input.setAttribute('aria-invalid', 'true');
    }

    if (errorContainer) {
      errorContainer.textContent = message;
      errorContainer.classList.add('form-error--visible');
    }
  }

  /**
   * Clear field error
   */
  private clearFieldError(fieldId: string): void {
    const input = this.modalElement?.querySelector<HTMLInputElement>(`#${fieldId}`);
    const errorContainer = input?.parentElement?.querySelector('.form-error');

    if (input) {
      input.classList.remove('form-input--error');
      input.removeAttribute('aria-invalid');
    }

    if (errorContainer) {
      errorContainer.textContent = '';
      errorContainer.classList.remove('form-error--visible');
    }
  }

  /**
   * Show general error message
   */
  private showGeneralError(message: string): void {
    const errorContainer = this.modalElement?.querySelector('.form-error--general');
    
    if (errorContainer) {
      errorContainer.textContent = message;
      errorContainer.classList.add('form-error--visible');
    }
  }

  /**
   * Clear all error messages
   */
  private clearErrors(): void {
    const errorContainers = this.modalElement?.querySelectorAll('.form-error');
    errorContainers?.forEach(container => {
      container.textContent = '';
      container.classList.remove('form-error--visible');
    });

    const inputs = this.modalElement?.querySelectorAll('.form-input--error');
    inputs?.forEach(input => {
      input.classList.remove('form-input--error');
      input.removeAttribute('aria-invalid');
    });

    // Hide password reuse warning
    const warningContainer = this.modalElement?.querySelector('.password-reuse-warning');
    if (warningContainer) {
      (warningContainer as HTMLElement).style.display = 'none';
    }
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
