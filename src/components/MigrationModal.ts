import { MigrationService } from '../services/MigrationService';

/**
 * MigrationModal Component
 * 
 * Displays a modal to users when legacy data is detected, offering options to:
 * 1. Migrate data to a new account (register + login + transfer credentials)
 * 2. Export data for backup before starting fresh
 * 3. Start fresh without migrating (with confirmation)
 * 
 * Shows automatically on app load if checkForOldData() returns true.
 */
export class MigrationModal {
  private container: HTMLElement;
  private migrationService: MigrationService;
  private modal: HTMLElement | null = null;
  private currentStep: 'choice' | 'migrate' | 'export' | 'success' = 'choice';

  /**
   * Creates a MigrationModal instance
   * 
   * @param {HTMLElement} container - Parent element to render modal into
   * @param {MigrationService} migrationService - Service for migration operations
   * @throws {Error} If container or migrationService is null/undefined
   */
  constructor(container: HTMLElement, migrationService: MigrationService) {
    if (!container) {
      throw new Error('[MigrationModal] Container element is required');
    }
    if (!migrationService) {
      throw new Error('[MigrationModal] MigrationService is required');
    }

    this.container = container;
    this.migrationService = migrationService;
  }

  /**
   * Shows the migration modal if old data exists
   * 
   * Checks for legacy data and displays modal with statistics.
   * If no legacy data exists, resolves immediately without showing modal.
   * 
   * @returns {Promise<void>} Resolves when modal is closed (migrated, exported, or dismissed)
   */
  async show(): Promise<void> {
    return new Promise((resolve) => {
      // Check if old data exists
      if (!this.migrationService.checkForOldData()) {
        console.log('[MigrationModal] No legacy data found, skipping migration');
        resolve();
        return;
      }

      // Get stats about old data
      const stats = this.migrationService.getOldDataStats();
      console.log('[MigrationModal] Found legacy data:', stats);

      // Render modal
      this.render(stats);
      this.cacheElements();
      this.attachEventListeners(resolve);

      // Show modal with animation
      setTimeout(() => {
        if (this.modal) {
          this.modal.classList.add('migration-modal--visible');
        }
      }, 10);
    });
  }

  /**
   * Renders the migration modal HTML
   * 
   * @private
   * @param {object} stats - Statistics about legacy data
   */
  private render(stats: ReturnType<typeof this.migrationService.getOldDataStats>): void {
    const html = `
      <div class="migration-modal" role="dialog" aria-modal="true" aria-labelledby="migration-modal-title">
        <div class="migration-modal__overlay"></div>
        <div class="migration-modal__content">
          <!-- Step 1: Choice -->
          <div class="migration-modal__step migration-modal__step--choice" data-step="choice">
            <div class="migration-modal__icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                <polyline points="13 2 13 9 20 9"></polyline>
                <path d="M12 12v6m-3-3h6"></path>
              </svg>
            </div>
            <h2 id="migration-modal-title" class="migration-modal__title">Legacy Data Found</h2>
            <p class="migration-modal__message">
              We detected ${stats.count} password${stats.count !== 1 ? 's' : ''} from the previous version of this application.
            </p>
            <div class="migration-modal__stats">
              <div class="migration-modal__stat">
                <span class="migration-modal__stat-label">Total Passwords:</span>
                <span class="migration-modal__stat-value">${stats.count}</span>
              </div>
              ${stats.passwords > 0 ? `
                <div class="migration-modal__stat">
                  <span class="migration-modal__stat-label">Random Passwords:</span>
                  <span class="migration-modal__stat-value">${stats.passwords}</span>
                </div>
              ` : ''}
              ${stats.passphrases > 0 ? `
                <div class="migration-modal__stat">
                  <span class="migration-modal__stat-label">Passphrases:</span>
                  <span class="migration-modal__stat-value">${stats.passphrases}</span>
                </div>
              ` : ''}
              ${stats.oldestDate ? `
                <div class="migration-modal__stat">
                  <span class="migration-modal__stat-label">Oldest:</span>
                  <span class="migration-modal__stat-value">${new Date(stats.oldestDate).toLocaleDateString()}</span>
                </div>
              ` : ''}
            </div>
            <p class="migration-modal__info">
              Choose an option below to continue:
            </p>
            <div class="migration-modal__actions">
              <button type="button" class="migration-modal__button migration-modal__button--primary" data-action="migrate">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="8.5" cy="7" r="4"></circle>
                  <polyline points="17 11 19 13 23 9"></polyline>
                </svg>
                Migrate to New Account
              </button>
              <button type="button" class="migration-modal__button" data-action="export">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Export & Start Fresh
              </button>
              <button type="button" class="migration-modal__button migration-modal__button--text" data-action="skip">
                Start Fresh Without Export
              </button>
            </div>
          </div>

          <!-- Step 2: Migrate Form -->
          <div class="migration-modal__step migration-modal__step--migrate" data-step="migrate" style="display: none;">
            <h2 class="migration-modal__title">Create New Account</h2>
            <p class="migration-modal__message">
              Enter your desired username and password. Your ${stats.count} password${stats.count !== 1 ? 's' : ''} will be encrypted and saved to your new account.
            </p>
            <form class="migration-modal__form" data-form="migrate">
              <div class="form-group">
                <label for="migrate-username" class="form-label">
                  Username
                  <span class="form-label__required" aria-label="required">*</span>
                </label>
                <input
                  type="text"
                  id="migrate-username"
                  name="username"
                  class="form-input"
                  autocomplete="username"
                  required
                  aria-required="true"
                  aria-describedby="migrate-username-help"
                  minlength="3"
                  maxlength="20"
                />
                <p id="migrate-username-help" class="form-help">3-20 characters, letters, numbers, underscore, hyphen</p>
                <div class="form-error" role="alert" aria-live="polite"></div>
              </div>

              <div class="form-group">
                <label for="migrate-password" class="form-label">
                  Password
                  <span class="form-label__required" aria-label="required">*</span>
                </label>
                <input
                  type="password"
                  id="migrate-password"
                  name="password"
                  class="form-input"
                  autocomplete="new-password"
                  required
                  aria-required="true"
                  aria-describedby="migrate-password-help"
                />
                <p id="migrate-password-help" class="form-help">Minimum 12 characters, include uppercase, lowercase, number, and special character</p>
                <div class="form-error" role="alert" aria-live="polite"></div>
              </div>

              <div class="form-group">
                <label for="migrate-password-confirm" class="form-label">
                  Confirm Password
                  <span class="form-label__required" aria-label="required">*</span>
                </label>
                <input
                  type="password"
                  id="migrate-password-confirm"
                  name="passwordConfirm"
                  class="form-input"
                  autocomplete="new-password"
                  required
                  aria-required="true"
                />
                <div class="form-error" role="alert" aria-live="polite"></div>
              </div>

              <div class="migration-modal__form-error" role="alert" aria-live="assertive"></div>

              <div class="migration-modal__actions">
                <button type="submit" class="migration-modal__button migration-modal__button--primary">
                  <span class="migration-modal__button-text">Migrate Data</span>
                  <span class="migration-modal__spinner" style="display: none;"></span>
                </button>
                <button type="button" class="migration-modal__button" data-action="back">
                  Back
                </button>
              </div>
            </form>
          </div>

          <!-- Step 3: Export -->
          <div class="migration-modal__step migration-modal__step--export" data-step="export" style="display: none;">
            <div class="migration-modal__icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
            </div>
            <h2 class="migration-modal__title">Export Your Data</h2>
            <p class="migration-modal__message">
              Your ${stats.count} password${stats.count !== 1 ? 's' : ''} will be exported to a JSON file. Save this file in a secure location.
            </p>
            <div class="migration-modal__warning">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <span>After exporting, your old data will be deleted from this application.</span>
            </div>
            <div class="migration-modal__actions">
              <button type="button" class="migration-modal__button migration-modal__button--primary" data-action="download-export">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Download & Delete Old Data
              </button>
              <button type="button" class="migration-modal__button" data-action="back">
                Back
              </button>
            </div>
          </div>

          <!-- Step 4: Success -->
          <div class="migration-modal__step migration-modal__step--success" data-step="success" style="display: none;">
            <div class="migration-modal__icon migration-modal__icon--success">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <h2 class="migration-modal__title">Migration Complete!</h2>
            <p class="migration-modal__message" data-success-message>
              Your passwords have been successfully migrated to your new account.
            </p>
            <div class="migration-modal__actions">
              <button type="button" class="migration-modal__button migration-modal__button--primary" data-action="close">
                Continue to Application
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.container.insertAdjacentHTML('beforeend', html);
  }

  /**
   * Caches references to DOM elements
   * 
   * @private
   */
  private cacheElements(): void {
    this.modal = this.container.querySelector('.migration-modal');
  }

  /**
   * Attaches event listeners to modal elements
   * 
   * @private
   * @param {Function} resolve - Promise resolve function to call when modal closes
   */
  private attachEventListeners(resolve: () => void): void {
    if (!this.modal) return;

    // Button actions
    this.modal.addEventListener('click', async (e: Event) => {
      const target = e.target as HTMLElement;
      const button = target.closest('[data-action]') as HTMLElement;
      if (!button) return;

      const action = button.dataset.action;

      switch (action) {
        case 'migrate':
          this.showStep('migrate');
          break;
        case 'export':
          this.showStep('export');
          break;
        case 'skip':
          await this.handleSkip();
          this.close(resolve);
          break;
        case 'back':
          this.showStep('choice');
          break;
        case 'download-export':
          await this.handleExport();
          this.close(resolve);
          break;
        case 'close':
          this.close(resolve);
          break;
      }
    });

    // Form submission
    const migrateForm = this.modal.querySelector('[data-form="migrate"]') as HTMLFormElement;
    if (migrateForm) {
      migrateForm.addEventListener('submit', async (e: Event) => {
        e.preventDefault();
        await this.handleMigrate();
      });
    }

    // Prevent closing by clicking overlay during migration
    const overlay = this.modal.querySelector('.migration-modal__overlay') as HTMLElement;
    if (overlay) {
      overlay.addEventListener('click', () => {
        if (this.currentStep === 'choice' || this.currentStep === 'success') {
          this.close(resolve);
        }
      });
    }
  }

  /**
   * Shows a specific step of the modal
   * 
   * @private
   * @param {string} step - Step to show ('choice', 'migrate', 'export', 'success')
   */
  private showStep(step: 'choice' | 'migrate' | 'export' | 'success'): void {
    if (!this.modal) return;

    const steps = this.modal.querySelectorAll('[data-step]');
    steps.forEach((stepEl) => {
      const stepName = (stepEl as HTMLElement).dataset.step;
      (stepEl as HTMLElement).style.display = stepName === step ? '' : 'none';
    });

    this.currentStep = step;

    // Focus first input when showing migrate step
    if (step === 'migrate') {
      setTimeout(() => {
        const usernameInput = this.modal?.querySelector('#migrate-username') as HTMLInputElement;
        usernameInput?.focus();
      }, 100);
    }
  }

  /**
   * Handles the migration process
   * 
   * @private
   */
  private async handleMigrate(): Promise<void> {
    if (!this.modal) return;

    const form = this.modal.querySelector('[data-form="migrate"]') as HTMLFormElement;
    const usernameInput = form.querySelector('#migrate-username') as HTMLInputElement;
    const passwordInput = form.querySelector('#migrate-password') as HTMLInputElement;
    const confirmInput = form.querySelector('#migrate-password-confirm') as HTMLInputElement;
    const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement;
    const formError = form.querySelector('.migration-modal__form-error') as HTMLElement;

    // Clear previous errors
    this.clearFormErrors(form);

    // Validate inputs
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const confirm = confirmInput.value;

    if (!username || username.length < 3 || username.length > 20) {
      this.showFieldError(usernameInput, 'Username must be 3-20 characters');
      return;
    }

    if (password.length < 12) {
      this.showFieldError(passwordInput, 'Password must be at least 12 characters');
      return;
    }

    if (password !== confirm) {
      this.showFieldError(confirmInput, 'Passwords do not match');
      return;
    }

    // Show loading state
    this.setLoading(submitButton, true);

    try {
      // Perform migration
      await this.migrationService.migrateToNewUser(username, password);

      // Show success step
      this.showStep('success');
      const successMessage = this.modal.querySelector('[data-success-message]') as HTMLElement;
      if (successMessage) {
        const stats = this.migrationService.getOldDataStats();
        successMessage.textContent = `Your ${stats.count} password${stats.count !== 1 ? 's have' : ' has'} been successfully migrated to your new account. You can now access them in your password vault.`;
      }
    } catch (error) {
      console.error('[MigrationModal] Migration failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Migration failed. Please try again.';
      formError.textContent = errorMessage;
      formError.style.display = 'block';
      this.setLoading(submitButton, false);
    }
  }

  /**
   * Handles the export process
   * 
   * @private
   */
  private async handleExport(): Promise<void> {
    try {
      // Export data
      const exportData = this.migrationService.exportOldData();

      // Create download
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `password-generator-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Delete old data
      this.migrationService.deleteOldData();

      console.log('[MigrationModal] Data exported and old data deleted');
    } catch (error) {
      console.error('[MigrationModal] Export failed:', error);
      alert('Failed to export data. Please try again.');
    }
  }

  /**
   * Handles the skip action (start fresh without export)
   * 
   * @private
   */
  private async handleSkip(): Promise<void> {
    const confirmed = window.confirm(
      'Are you sure you want to start fresh?\n\n' +
      'Your old passwords will be permanently deleted without backup. ' +
      'This action cannot be undone.'
    );

    if (confirmed) {
      try {
        this.migrationService.deleteOldData();
        console.log('[MigrationModal] Old data deleted');
      } catch (error) {
        console.error('[MigrationModal] Failed to delete old data:', error);
        alert('Failed to delete old data. Please try again.');
      }
    }
  }

  /**
   * Shows an error message for a specific form field
   * 
   * @private
   * @param {HTMLInputElement} input - Input element that has the error
   * @param {string} message - Error message to display
   */
  private showFieldError(input: HTMLInputElement, message: string): void {
    const formGroup = input.closest('.form-group');
    if (!formGroup) return;

    const errorContainer = formGroup.querySelector('.form-error') as HTMLElement;
    if (errorContainer) {
      errorContainer.textContent = message;
      errorContainer.style.display = 'block';
    }

    input.classList.add('form-input--error');
    input.setAttribute('aria-invalid', 'true');
    input.focus();
  }

  /**
   * Clears all form errors
   * 
   * @private
   * @param {HTMLFormElement} form - Form to clear errors from
   */
  private clearFormErrors(form: HTMLFormElement): void {
    const errorContainers = form.querySelectorAll('.form-error');
    errorContainers.forEach((container) => {
      (container as HTMLElement).textContent = '';
      (container as HTMLElement).style.display = 'none';
    });

    const inputs = form.querySelectorAll('.form-input');
    inputs.forEach((input) => {
      input.classList.remove('form-input--error');
      input.removeAttribute('aria-invalid');
    });

    const formError = form.querySelector('.migration-modal__form-error') as HTMLElement;
    if (formError) {
      formError.textContent = '';
      formError.style.display = 'none';
    }
  }

  /**
   * Sets loading state for a button
   * 
   * @private
   * @param {HTMLButtonElement} button - Button element
   * @param {boolean} loading - Whether button is in loading state
   */
  private setLoading(button: HTMLButtonElement, loading: boolean): void {
    const text = button.querySelector('.migration-modal__button-text') as HTMLElement;
    const spinner = button.querySelector('.migration-modal__spinner') as HTMLElement;

    if (loading) {
      button.disabled = true;
      if (text) text.style.display = 'none';
      if (spinner) spinner.style.display = 'inline-block';
    } else {
      button.disabled = false;
      if (text) text.style.display = '';
      if (spinner) spinner.style.display = 'none';
    }
  }

  /**
   * Closes the modal
   * 
   * @private
   * @param {Function} resolve - Promise resolve function
   */
  private close(resolve: () => void): void {
    if (!this.modal) return;

    this.modal.classList.remove('migration-modal--visible');
    
    setTimeout(() => {
      this.destroy();
      resolve();
    }, 300); // Wait for fade-out animation
  }

  /**
   * Destroys the modal and removes it from DOM
   */
  destroy(): void {
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
    }
  }
}
