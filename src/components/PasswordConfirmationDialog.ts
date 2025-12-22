/**
 * PasswordConfirmationDialog.ts
 * 
 * Reusable password confirmation dialog for sensitive operations.
 * Provides a promise-based API that resolves with the password or rejects on cancel.
 * 
 * Features:
 * - Promise-based API (async/await friendly)
 * - Password visibility toggle
 * - Keyboard navigation (Enter/Escape)
 * - Accessibility (ARIA attributes, focus management)
 * - Error display
 * 
 * Usage:
 * ```typescript
 * const dialog = new PasswordConfirmationDialog(container);
 * try {
 *   const password = await dialog.show('Confirm your password to disable 2FA');
 *   // User confirmed with password
 * } catch (error) {
 *   // User cancelled
 * }
 * ```
 */

export class PasswordConfirmationDialog {
  private container: HTMLElement;
  private modal: HTMLElement | null = null;
  private passwordInput: HTMLInputElement | null = null;
  private confirmButton: HTMLButtonElement | null = null;
  private cancelButton: HTMLButtonElement | null = null;
  private errorElement: HTMLElement | null = null;
  private toggleButton: HTMLButtonElement | null = null;
  private messageElement: HTMLElement | null = null;
  
  private resolvePromise: ((password: string) => void) | null = null;
  private rejectPromise: ((reason?: any) => void) | null = null;

  /**
   * Creates a new PasswordConfirmationDialog instance
   * @param container - Container element for the dialog
   */
  constructor(container: HTMLElement) {
    if (!container) {
      throw new Error('PasswordConfirmationDialog: container is required');
    }
    this.container = container;
  }

  /**
   * Shows the password confirmation dialog
   * @param message - Message to display to the user (e.g., "Confirm your password to disable 2FA")
   * @returns Promise that resolves with the password or rejects on cancel
   */
  public show(message: string = 'Please enter your password to continue'): Promise<string> {
    return new Promise((resolve, reject) => {
      this.resolvePromise = resolve;
      this.rejectPromise = reject;

      this.render(message);
      this.cacheElements();
      this.attachEventListeners();

      // Focus the password input
      setTimeout(() => {
        this.passwordInput?.focus();
      }, 100);
    });
  }

  /**
   * Closes the dialog and cleans up
   */
  private close(cancelled: boolean = false): void {
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
    }

    if (cancelled && this.rejectPromise) {
      this.rejectPromise(new Error('User cancelled password confirmation'));
      this.resolvePromise = null;
      this.rejectPromise = null;
    }
  }

  /**
   * Renders the dialog HTML
   */
  private render(message: string): void {
    const html = `
      <div class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="password-confirm-title">
        <div class="modal-dialog">
          <div class="modal-header">
            <h2 id="password-confirm-title" class="modal-title">Password Confirmation</h2>
          </div>
          
          <div class="modal-body">
            <p class="password-confirm-message" id="password-confirm-message"></p>

            <div class="form-group">
              <label for="password-confirm-input" class="form-label">
                Password
              </label>
              <div class="form-input-group">
                <input
                  type="password"
                  id="password-confirm-input"
                  class="form-input"
                  placeholder="Enter your password"
                  autocomplete="current-password"
                  aria-required="true"
                  aria-describedby="password-confirm-message password-confirm-error"
                />
                <button
                  type="button"
                  class="form-input-toggle"
                  aria-label="Toggle password visibility"
                  data-action="toggle-password"
                >
                  <svg class="icon icon-eye" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                  <svg class="icon icon-eye-off" style="display: none;" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                </button>
              </div>
              <div id="password-confirm-error" class="form-error" role="alert" aria-live="polite"></div>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn--secondary" data-action="cancel">
              Cancel
            </button>
            <button type="button" class="btn btn--primary" data-action="confirm">
              Confirm
            </button>
          </div>
        </div>
      </div>
    `;

    this.container.insertAdjacentHTML('beforeend', html);
    
    // Set the message after rendering
    this.messageElement = this.container.querySelector('.password-confirm-message');
    if (this.messageElement) {
      this.messageElement.textContent = message;
    }
  }

  /**
   * Caches DOM element references
   */
  private cacheElements(): void {
    this.modal = this.container.querySelector('.modal-overlay');
    this.passwordInput = this.modal?.querySelector('#password-confirm-input') as HTMLInputElement;
    this.confirmButton = this.modal?.querySelector('[data-action="confirm"]') as HTMLButtonElement;
    this.cancelButton = this.modal?.querySelector('[data-action="cancel"]') as HTMLButtonElement;
    this.errorElement = this.modal?.querySelector('#password-confirm-error') as HTMLElement;
    this.toggleButton = this.modal?.querySelector('[data-action="toggle-password"]') as HTMLButtonElement;
  }

  /**
   * Attaches event listeners
   */
  private attachEventListeners(): void {
    // Input change - clear error
    this.passwordInput?.addEventListener('input', () => this.clearError());

    // Button clicks
    this.confirmButton?.addEventListener('click', () => this.handleConfirm());
    this.cancelButton?.addEventListener('click', () => this.handleCancel());
    this.toggleButton?.addEventListener('click', () => this.togglePasswordVisibility());

    // Keyboard navigation
    this.modal?.addEventListener('keydown', (e) => this.handleKeydown(e as KeyboardEvent));

    // Click outside to close (optional)
    this.modal?.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.handleCancel();
      }
    });
  }

  /**
   * Handles the confirm button click
   */
  private handleConfirm(): void {
    if (!this.passwordInput) return;

    const password = this.passwordInput.value.trim();

    // Validate password is not empty
    if (password.length === 0) {
      this.showError('Password is required');
      this.passwordInput.focus();
      return;
    }

    // Resolve the promise with the password
    if (this.resolvePromise) {
      this.resolvePromise(password);
      this.resolvePromise = null;
      this.rejectPromise = null;
    }

    this.close(false);
  }

  /**
   * Handles the cancel button click
   */
  private handleCancel(): void {
    this.close(true);
  }

  /**
   * Handles keyboard events
   */
  private handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.handleCancel();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      this.handleConfirm();
    }
  }

  /**
   * Toggles password visibility
   */
  private togglePasswordVisibility(): void {
    if (!this.passwordInput || !this.toggleButton) return;

    const isPassword = this.passwordInput.type === 'password';
    this.passwordInput.type = isPassword ? 'text' : 'password';

    // Toggle icon visibility
    const eyeIcon = this.toggleButton.querySelector('.icon-eye') as HTMLElement;
    const eyeOffIcon = this.toggleButton.querySelector('.icon-eye-off') as HTMLElement;

    if (eyeIcon && eyeOffIcon) {
      eyeIcon.style.display = isPassword ? 'none' : 'block';
      eyeOffIcon.style.display = isPassword ? 'block' : 'none';
    }

    // Update aria-label
    this.toggleButton.setAttribute(
      'aria-label',
      isPassword ? 'Hide password' : 'Show password'
    );
  }

  /**
   * Shows an error message
   */
  private showError(message: string): void {
    if (this.errorElement) {
      this.errorElement.textContent = message;
      this.errorElement.style.display = 'block';
    }

    if (this.passwordInput) {
      this.passwordInput.classList.add('form-input--error');
      this.passwordInput.setAttribute('aria-invalid', 'true');
    }
  }

  /**
   * Clears the error message
   */
  private clearError(): void {
    if (this.errorElement) {
      this.errorElement.textContent = '';
      this.errorElement.style.display = 'none';
    }

    if (this.passwordInput) {
      this.passwordInput.classList.remove('form-input--error');
      this.passwordInput.setAttribute('aria-invalid', 'false');
    }
  }

  /**
   * Destroys the dialog and cleans up
   */
  public destroy(): void {
    this.close(true);
  }
}
