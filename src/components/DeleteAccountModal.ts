/**
 * DeleteAccountModal.ts
 * 
 * Modal component for account deletion with confirmation.
 * Requires user to type "DELETE" exactly and confirm password before deletion.
 * 
 * Features:
 * - Text confirmation (must type "DELETE")
 * - Password verification
 * - Loading state during deletion
 * - Error handling
 * - Keyboard navigation (Enter/Escape)
 * - Accessibility (ARIA attributes, focus management)
 */

import { AuthService } from '../services/AuthService';

export class DeleteAccountModal {
  private container: HTMLElement;
  private authService: AuthService;
  private userId: string;

  // Cached element references
  private modal: HTMLElement | null = null;
  private confirmationInput: HTMLInputElement | null = null;
  private passwordInput: HTMLInputElement | null = null;
  private confirmButton: HTMLButtonElement | null = null;
  private cancelButton: HTMLButtonElement | null = null;
  private errorElement: HTMLElement | null = null;

  // State
  private isLoading = false;

  /**
   * Creates a new DeleteAccountModal instance
   * @param container - Container element for the modal
   * @param authService - AuthService instance for account deletion
   * @param userId - ID of the user account to delete
   */
  constructor(container: HTMLElement, authService: AuthService, userId: string) {
    if (!container) {
      throw new Error('DeleteAccountModal: container is required');
    }
    if (!authService) {
      throw new Error('DeleteAccountModal: authService is required');
    }
    if (!userId) {
      throw new Error('DeleteAccountModal: userId is required');
    }

    this.container = container;
    this.authService = authService;
    this.userId = userId;
  }

  /**
   * Shows the delete account modal
   */
  public show(): void {
    this.render();
    this.cacheElements();
    this.attachEventListeners();
    this.updateButtonState();

    // Focus the confirmation input
    setTimeout(() => {
      this.confirmationInput?.focus();
    }, 100);
  }

  /**
   * Closes the modal and removes from DOM
   */
  public close(): void {
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
    }
  }

  /**
   * Renders the modal HTML
   */
  private render(): void {
    const html = `
      <div class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-account-title">
        <div class="modal-dialog modal-dialog--danger">
          <div class="modal-header">
            <h2 id="delete-account-title" class="modal-title">Delete Account</h2>
          </div>
          
          <div class="modal-body">
            <div class="warning-box warning-box--danger">
              <svg class="warning-box__icon" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <div class="warning-box__content">
                <h3 class="warning-box__title">This action cannot be undone</h3>
                <p class="warning-box__text">
                  Deleting your account will permanently remove:
                </p>
                <ul class="warning-box__list">
                  <li>Your account and profile</li>
                  <li>All saved passwords</li>
                  <li>Password generation history</li>
                  <li>Two-factor authentication settings</li>
                  <li>All active sessions</li>
                </ul>
                <p class="warning-box__text">
                  <strong>You will not be able to recover this data.</strong>
                </p>
              </div>
            </div>

            <div class="form-group">
              <label for="delete-confirmation" class="form-label">
                Type <code>DELETE</code> to confirm
              </label>
              <input
                type="text"
                id="delete-confirmation"
                class="form-input"
                placeholder="DELETE"
                autocomplete="off"
                spellcheck="false"
                aria-required="true"
                aria-describedby="delete-confirmation-help"
              />
              <small id="delete-confirmation-help" class="form-help">
                Type the word DELETE in all capital letters
              </small>
              <div class="form-error" role="alert" aria-live="polite"></div>
            </div>

            <div class="form-group">
              <label for="delete-password" class="form-label">
                Confirm your password
              </label>
              <input
                type="password"
                id="delete-password"
                class="form-input"
                placeholder="Enter your password"
                autocomplete="current-password"
                aria-required="true"
                aria-describedby="delete-password-help"
              />
              <small id="delete-password-help" class="form-help">
                Enter your current password to verify your identity
              </small>
              <div class="form-error" role="alert" aria-live="polite"></div>
            </div>

            <div class="form-error form-error--global" role="alert" aria-live="assertive"></div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn--secondary" data-action="cancel">
              Cancel
            </button>
            <button type="button" class="btn btn--danger" data-action="confirm" disabled>
              <span class="btn__text">Delete Account</span>
              <span class="btn__spinner" style="display: none;">
                <svg class="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="10" stroke-width="4" stroke-opacity="0.25"/>
                  <path d="M12 2a10 10 0 0 1 10 10" stroke-width="4" stroke-linecap="round"/>
                </svg>
              </span>
            </button>
          </div>
        </div>
      </div>
    `;

    this.container.insertAdjacentHTML('beforeend', html);
  }

  /**
   * Caches DOM element references
   */
  private cacheElements(): void {
    this.modal = this.container.querySelector('.modal-overlay');
    this.confirmationInput = this.modal?.querySelector('#delete-confirmation') as HTMLInputElement;
    this.passwordInput = this.modal?.querySelector('#delete-password') as HTMLInputElement;
    this.confirmButton = this.modal?.querySelector('[data-action="confirm"]') as HTMLButtonElement;
    this.cancelButton = this.modal?.querySelector('[data-action="cancel"]') as HTMLButtonElement;
    this.errorElement = this.modal?.querySelector('.form-error--global') as HTMLElement;
  }

  /**
   * Attaches event listeners
   */
  private attachEventListeners(): void {
    // Input validation
    this.confirmationInput?.addEventListener('input', () => this.handleInputChange());
    this.passwordInput?.addEventListener('input', () => this.handleInputChange());

    // Button clicks
    this.confirmButton?.addEventListener('click', () => this.handleConfirm());
    this.cancelButton?.addEventListener('click', () => this.handleCancel());

    // Keyboard navigation
    this.modal?.addEventListener('keydown', (e) => this.handleKeydown(e as KeyboardEvent));

    // Click outside to close (optional - currently disabled for safety)
    // this.modal?.addEventListener('click', (e) => {
    //   if (e.target === this.modal) {
    //     this.handleCancel();
    //   }
    // });
  }

  /**
   * Handles input changes and updates button state
   */
  private handleInputChange(): void {
    this.clearError();
    this.clearFieldErrors();
    this.updateButtonState();
  }

  /**
   * Updates the confirm button enabled/disabled state
   */
  private updateButtonState(): void {
    if (!this.confirmButton || !this.confirmationInput || !this.passwordInput) {
      return;
    }

    const confirmationText = this.confirmationInput.value.trim();
    const password = this.passwordInput.value.trim();

    // Button enabled only if both fields are valid
    const isValid = confirmationText === 'DELETE' && password.length > 0;
    this.confirmButton.disabled = !isValid;
  }

  /**
   * Validates the confirmation text
   */
  private validateConfirmationText(): boolean {
    if (!this.confirmationInput) return false;

    const value = this.confirmationInput.value.trim();
    const errorContainer = this.confirmationInput.parentElement?.querySelector('.form-error') as HTMLElement;

    if (value !== 'DELETE') {
      this.confirmationInput.classList.add('form-input--error');
      this.confirmationInput.setAttribute('aria-invalid', 'true');
      if (errorContainer) {
        errorContainer.textContent = 'You must type DELETE exactly (all capital letters)';
      }
      return false;
    }

    this.confirmationInput.classList.remove('form-input--error');
    this.confirmationInput.setAttribute('aria-invalid', 'false');
    if (errorContainer) {
      errorContainer.textContent = '';
    }
    return true;
  }

  /**
   * Validates the password field
   */
  private validatePassword(): boolean {
    if (!this.passwordInput) return false;

    const value = this.passwordInput.value.trim();
    const errorContainer = this.passwordInput.parentElement?.querySelector('.form-error') as HTMLElement;

    if (value.length === 0) {
      this.passwordInput.classList.add('form-input--error');
      this.passwordInput.setAttribute('aria-invalid', 'true');
      if (errorContainer) {
        errorContainer.textContent = 'Password is required';
      }
      return false;
    }

    this.passwordInput.classList.remove('form-input--error');
    this.passwordInput.setAttribute('aria-invalid', 'false');
    if (errorContainer) {
      errorContainer.textContent = '';
    }
    return true;
  }

  /**
   * Handles the confirm button click
   */
  private async handleConfirm(): Promise<void> {
    if (this.isLoading) return;

    // Validate both fields
    const isConfirmationValid = this.validateConfirmationText();
    const isPasswordValid = this.validatePassword();

    if (!isConfirmationValid || !isPasswordValid) {
      return;
    }

    const password = this.passwordInput!.value.trim();

    try {
      this.setLoading(true);
      this.clearError();

      // Call AuthService to delete the account
      await this.authService.deleteAccount(this.userId, password);

      // Dispatch success event
      window.dispatchEvent(
        new CustomEvent('account-deleted', {
          detail: { userId: this.userId },
        })
      );

      // Close the modal
      this.close();
    } catch (error) {
      this.setLoading(false);

      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.toLowerCase().includes('password')) {
          this.showFieldError(this.passwordInput, 'Incorrect password. Please try again.');
          this.passwordInput?.focus();
        } else {
          this.showError(error.message);
        }
      } else {
        this.showError('An unexpected error occurred. Please try again.');
      }
    }
  }

  /**
   * Handles the cancel button click
   */
  private handleCancel(): void {
    if (this.isLoading) return;

    // Dispatch cancel event
    window.dispatchEvent(
      new CustomEvent('account-delete-cancelled', {
        detail: { userId: this.userId },
      })
    );

    this.close();
  }

  /**
   * Handles keyboard events
   */
  private handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape' && !this.isLoading) {
      e.preventDefault();
      this.handleCancel();
    } else if (e.key === 'Enter' && !this.isLoading && !this.confirmButton?.disabled) {
      e.preventDefault();
      this.handleConfirm();
    }
  }

  /**
   * Sets the loading state
   */
  private setLoading(loading: boolean): void {
    this.isLoading = loading;

    if (!this.confirmButton) return;

    const btnText = this.confirmButton.querySelector('.btn__text') as HTMLElement;
    const btnSpinner = this.confirmButton.querySelector('.btn__spinner') as HTMLElement;

    if (loading) {
      this.confirmButton.disabled = true;
      this.cancelButton!.disabled = true;
      this.confirmationInput!.disabled = true;
      this.passwordInput!.disabled = true;

      if (btnText) btnText.textContent = 'Deleting...';
      if (btnSpinner) btnSpinner.style.display = 'inline-block';
    } else {
      this.updateButtonState(); // Re-evaluate button state
      this.cancelButton!.disabled = false;
      this.confirmationInput!.disabled = false;
      this.passwordInput!.disabled = false;

      if (btnText) btnText.textContent = 'Delete Account';
      if (btnSpinner) btnSpinner.style.display = 'none';
    }
  }

  /**
   * Shows an error message
   */
  private showError(message: string): void {
    if (this.errorElement) {
      this.errorElement.textContent = message;
      this.errorElement.style.display = 'block';
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
  }

  /**
   * Shows a field-specific error
   */
  private showFieldError(input: HTMLInputElement | null, message: string): void {
    if (!input) return;

    const errorContainer = input.parentElement?.querySelector('.form-error') as HTMLElement;
    input.classList.add('form-input--error');
    input.setAttribute('aria-invalid', 'true');

    if (errorContainer) {
      errorContainer.textContent = message;
    }
  }

  /**
   * Clears all field-specific errors
   */
  private clearFieldErrors(): void {
    const errorContainers = this.modal?.querySelectorAll('.form-group .form-error');
    errorContainers?.forEach((container) => {
      (container as HTMLElement).textContent = '';
    });

    const inputs = this.modal?.querySelectorAll('.form-input');
    inputs?.forEach((input) => {
      input.classList.remove('form-input--error');
      input.setAttribute('aria-invalid', 'false');
    });
  }

  /**
   * Destroys the modal and cleans up
   */
  public destroy(): void {
    this.close();
  }
}
