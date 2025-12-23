/**
 * LoginForm Component
 * 
 * Handles user login with username/password and optional 2FA code.
 * Displays appropriate error messages and manages authentication flow.
 */

import { AuthService, AuthError } from '../services/AuthService';

/**
 * LoginForm component for user authentication
 * 
 * Features:
 * - Username and password inputs
 * - 2FA code input (shown when required)
 * - Form validation
 * - Error handling and display
 * - Accessible with ARIA attributes
 * 
 * @example
 * ```typescript
 * const form = new LoginForm(authService);
 * document.body.appendChild(form.render());
 * ```
 */
export class LoginForm {
  private authService: AuthService;
  private container: HTMLElement;
  private usernameInput: HTMLInputElement | null = null;
  private passwordInput: HTMLInputElement | null = null;
  private totpCodeInput: HTMLInputElement | null = null;
  private totpCodeContainer: HTMLElement | null = null;
  private errorContainer: HTMLElement | null = null;
  private submitButton: HTMLButtonElement | null = null;
  private show2FAInput = false;
  private isSubmitting = false;

  /**
   * Creates a new LoginForm instance
   * 
   * @param authService - AuthService instance for authentication
   */
  constructor(authService: AuthService) {
    if (!authService) {
      throw new Error('AuthService is required');
    }

    this.authService = authService;
    this.container = document.createElement('div');
    this.container.className = 'login-form-container';
  }

  /**
   * Renders the login form HTML
   * 
   * @returns HTMLElement containing the login form
   */
  render(): HTMLElement {
    this.container.innerHTML = `
      <form class="login-form" novalidate aria-labelledby="login-heading">
        <h2 id="login-heading" class="login-form__heading">Sign In</h2>
        
        <div class="login-form__field">
          <label for="login-username" class="login-form__label">
            Username
          </label>
          <input
            type="text"
            id="login-username"
            name="username"
            class="login-form__input"
            autocomplete="username"
            required
            aria-required="true"
            aria-describedby="username-error"
          />
          <span id="username-error" class="login-form__field-error" role="alert" aria-live="polite"></span>
        </div>

        <div class="login-form__field">
          <label for="login-password" class="login-form__label">
            Password
          </label>
          <input
            type="password"
            id="login-password"
            name="password"
            class="login-form__input"
            autocomplete="current-password"
            required
            aria-required="true"
            aria-describedby="password-error"
          />
          <span id="password-error" class="login-form__field-error" role="alert" aria-live="polite"></span>
        </div>

        <div class="login-form__field login-form__field--2fa" style="display: none;">
          <label for="login-totp-code" class="login-form__label">
            Two-Factor Authentication Code
          </label>
          <input
            type="text"
            id="login-totp-code"
            name="totpCode"
            class="login-form__input login-form__input--totp"
            autocomplete="one-time-code"
            pattern="[0-9A-Z]{6,8}"
            maxlength="8"
            aria-describedby="totp-code-error totp-code-help"
          />
          <span id="totp-code-help" class="login-form__help-text">
            Enter 6-digit code from authenticator app or 8-character backup code
          </span>
          <span id="totp-code-error" class="login-form__field-error" role="alert" aria-live="polite"></span>
        </div>

        <div class="login-form__error" role="alert" aria-live="assertive" aria-atomic="true"></div>

        <button type="submit" class="login-form__submit">
          Sign In
        </button>

        <div class="login-form__links">
          <a href="#register" class="login-form__link">Create an account</a>
        </div>

        <div class="login-form__demo-note">
          <p>💡 <strong>Demo:</strong> Use username <code>test</code> and password <code>Demo1234!</code> to demo or create your own account</p>
        </div>
      </form>
    `;

    // Cache DOM references
    this.usernameInput = this.container.querySelector('#login-username');
    this.passwordInput = this.container.querySelector('#login-password');
    this.totpCodeInput = this.container.querySelector('#login-totp-code');
    this.totpCodeContainer = this.container.querySelector('.login-form__field--2fa');
    this.errorContainer = this.container.querySelector('.login-form__error');
    this.submitButton = this.container.querySelector('.login-form__submit');

    // Attach event listeners
    this.attachEventListeners();

    return this.container;
  }

  /**
   * Attaches event listeners to form elements
   * @private
   */
  private attachEventListeners(): void {
    const form = this.container.querySelector('form');
    if (!form) return;

    // Form submission
    form.addEventListener('submit', (e) => this.handleSubmit(e));

    // Input validation on blur
    this.usernameInput?.addEventListener('blur', () => this.validateUsername());
    this.passwordInput?.addEventListener('blur', () => this.validatePassword());
    this.totpCodeInput?.addEventListener('blur', () => this.validate2FACode());

    // Clear errors on input
    this.usernameInput?.addEventListener('input', () => this.clearFieldError('username'));
    this.passwordInput?.addEventListener('input', () => this.clearFieldError('password'));
    this.totpCodeInput?.addEventListener('input', () => this.clearFieldError('totp-code'));
  }

  /**
   * Validates username field
   * @private
   * @returns True if valid, false otherwise
   */
  private validateUsername(): boolean {
    if (!this.usernameInput) return false;

    const username = this.usernameInput.value.trim();
    
    if (!username) {
      this.showFieldError('username', 'Username is required');
      return false;
    }

    this.clearFieldError('username');
    return true;
  }

  /**
   * Validates password field
   * @private
   * @returns True if valid, false otherwise
   */
  private validatePassword(): boolean {
    if (!this.passwordInput) return false;

    const password = this.passwordInput.value;
    
    if (!password) {
      this.showFieldError('password', 'Password is required');
      return false;
    }

    this.clearFieldError('password');
    return true;
  }

  /**
   * Validates 2FA code field
   * @private
   * @returns True if valid, false otherwise
   */
  private validate2FACode(): boolean {
    if (!this.totpCodeInput || !this.show2FAInput) return true;

    const code = this.totpCodeInput.value.trim().toUpperCase();
    
    if (!code) {
      this.showFieldError('totp-code', '2FA code is required');
      return false;
    }

    // Validate format: 6 digits (TOTP) or 8 alphanumeric (backup code)
    const is6Digit = /^[0-9]{6}$/.test(code);
    const is8Char = /^[A-Z0-9]{8}$/.test(code);
    
    if (!is6Digit && !is8Char) {
      this.showFieldError('totp-code', 'Invalid code format');
      return false;
    }

    this.clearFieldError('totp-code');
    return true;
  }

  /**
   * Shows 2FA code input field
   * @private
   */
  private show2FACodeInput(): void {
    this.show2FAInput = true;
    
    if (this.totpCodeContainer) {
      this.totpCodeContainer.style.display = 'block';
    }
    
    // Focus on 2FA code input
    setTimeout(() => {
      this.totpCodeInput?.focus();
    }, 100);
  }

  /**
   * Hides 2FA code input field
   * @private
   */
  private hide2FACodeInput(): void {
    this.show2FAInput = false;
    
    if (this.totpCodeContainer) {
      this.totpCodeContainer.style.display = 'none';
    }
    
    if (this.totpCodeInput) {
      this.totpCodeInput.value = '';
    }
  }

  /**
   * Shows field-specific error message
   * @private
   * @param field - Field identifier (username, password, totp-code)
   * @param message - Error message to display
   */
  private showFieldError(field: string, message: string): void {
    const errorElement = this.container.querySelector(`#${field}-error`);
    const inputElement = this.container.querySelector(`#login-${field}`) as HTMLInputElement;
    
    if (errorElement) {
      errorElement.textContent = message;
    }
    
    if (inputElement) {
      inputElement.setAttribute('aria-invalid', 'true');
      inputElement.classList.add('login-form__input--error');
    }
  }

  /**
   * Clears field-specific error message
   * @private
   * @param field - Field identifier (username, password, totp-code)
   */
  private clearFieldError(field: string): void {
    const errorElement = this.container.querySelector(`#${field}-error`);
    const inputElement = this.container.querySelector(`#login-${field}`) as HTMLInputElement;
    
    if (errorElement) {
      errorElement.textContent = '';
    }
    
    if (inputElement) {
      inputElement.removeAttribute('aria-invalid');
      inputElement.classList.remove('login-form__input--error');
    }
  }

  /**
   * Shows form-level error message
   * @private
   * @param message - Error message to display
   */
  private showError(message: string): void {
    if (this.errorContainer) {
      this.errorContainer.textContent = message;
      this.errorContainer.style.display = 'block';
    }
  }

  /**
   * Clears form-level error message
   * @private
   */
  private clearError(): void {
    if (this.errorContainer) {
      this.errorContainer.textContent = '';
      this.errorContainer.style.display = 'none';
    }
  }

  /**
   * Sets loading state for submit button
   * @private
   * @param loading - Whether form is loading
   */
  private setLoading(loading: boolean): void {
    this.isSubmitting = loading;
    
    if (this.submitButton) {
      this.submitButton.disabled = loading;
      this.submitButton.textContent = loading ? 'Signing in...' : 'Sign In';
    }

    // Disable inputs during submission
    if (this.usernameInput) this.usernameInput.disabled = loading;
    if (this.passwordInput) this.passwordInput.disabled = loading;
    if (this.totpCodeInput) this.totpCodeInput.disabled = loading;
  }

  /**
   * Handles form submission
   * @private
   * @param event - Submit event
   */
  private async handleSubmit(event: Event): Promise<void> {
    event.preventDefault();

    if (this.isSubmitting) return;

    // Clear previous errors
    this.clearError();
    this.clearFieldError('username');
    this.clearFieldError('password');
    this.clearFieldError('totp-code');

    // Validate all fields
    const isUsernameValid = this.validateUsername();
    const isPasswordValid = this.validatePassword();
    const is2FAValid = this.validate2FACode();

    if (!isUsernameValid || !isPasswordValid || !is2FAValid) {
      return;
    }

    // Get form values
    const username = this.usernameInput?.value.trim() || '';
    const password = this.passwordInput?.value || '';
    const totpCode = this.show2FAInput ? (this.totpCodeInput?.value.trim().toUpperCase() || '') : undefined;

    // Set loading state
    this.setLoading(true);

    try {
      // Attempt login
      await this.authService.login(username, password, totpCode);

      // Success - dispatch event for parent component
      this.container.dispatchEvent(new CustomEvent('login-success', {
        bubbles: true,
        detail: { username }
      }));

    } catch (error) {
      this.setLoading(false);

      if (error instanceof AuthError) {
        // Handle specific auth errors
        if (error.message === '2FA_REQUIRED') {
          // Show 2FA input
          this.show2FACodeInput();
          this.showError('Two-factor authentication is required. Please enter your code.');
        } else if (error.message.includes('Account is locked')) {
          this.showError('Your account is temporarily locked due to multiple failed login attempts. Please try again later.');
        } else if (error.message.includes('Invalid 2FA code')) {
          this.showFieldError('totp-code', 'Invalid 2FA code. Please try again.');
          this.totpCodeInput?.select();
        } else if (error.message.includes('Invalid credentials')) {
          this.showError('Invalid username or password. Please try again.');
          this.passwordInput?.select();
        } else {
          this.showError(error.message);
        }
      } else {
        // Generic error
        this.showError('An unexpected error occurred. Please try again.');
        console.error('Login error:', error);
      }
    }
  }

  /**
   * Resets the form to initial state
   */
  reset(): void {
    // Reset form fields
    if (this.usernameInput) this.usernameInput.value = '';
    if (this.passwordInput) this.passwordInput.value = '';
    if (this.totpCodeInput) this.totpCodeInput.value = '';

    // Hide 2FA input
    this.hide2FACodeInput();

    // Clear errors
    this.clearError();
    this.clearFieldError('username');
    this.clearFieldError('password');
    this.clearFieldError('totp-code');

    // Reset loading state
    this.setLoading(false);

    // Focus on username
    this.usernameInput?.focus();
  }

  /**
   * Destroys the component and cleans up event listeners
   */
  destroy(): void {
    this.container.innerHTML = '';
  }
}
