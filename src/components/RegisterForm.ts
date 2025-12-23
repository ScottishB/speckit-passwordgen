import { AuthService, ValidationError } from '../services/AuthService';

/**
 * RegisterForm Component
 * 
 * A user registration form with username and password fields, password strength
 * indicator, and real-time validation. Integrates with AuthService for user creation.
 * 
 * @example
 * ```typescript
 * const authService = new AuthService(cryptoService, sessionService, securityLogService, database);
 * const form = new RegisterForm(
 *   document.getElementById('register-container'),
 *   authService
 * );
 * 
 * // Listen for registration success
 * document.addEventListener('register-success', (event) => {
 *   const { username, userId } = event.detail;
 *   console.log(`User ${username} registered with ID ${userId}`);
 * });
 * ```
 */
export class RegisterForm {
  private container: HTMLElement;
  private authService: AuthService;
  
  // Form elements
  private usernameInput: HTMLInputElement | null = null;
  private passwordInput: HTMLInputElement | null = null;
  private confirmPasswordInput: HTMLInputElement | null = null;
  private submitButton: HTMLButtonElement | null = null;
  
  // State
  private isSubmitting: boolean = false;
  private usernameCheckTimeout: number | null = null;
  private isUsernameAvailable: boolean = false;
  
  /**
   * Creates a new RegisterForm instance
   * @param container - The HTML element to render the form into
   * @param authService - The authentication service for user registration
   * @throws {Error} If container or authService is null/undefined
   */
  constructor(container: HTMLElement | null, authService: AuthService) {
    if (!container) {
      throw new Error('Container element is required');
    }
    if (!authService) {
      throw new Error('AuthService is required');
    }
    
    this.container = container;
    this.authService = authService;
    this.render();
    this.attachEventListeners();
  }
  
  /**
   * Renders the registration form HTML
   */
  private render(): void {
    this.container.innerHTML = `
      <div class="register-form-container">
        <form class="register-form" novalidate>
          <h2 class="register-form__title">Create Account</h2>
          
          <!-- Username Field -->
          <div class="register-form__field">
            <label for="register-username" class="register-form__label">
              Username
            </label>
            <input
              type="text"
              id="register-username"
              class="register-form__input"
              name="username"
              autocomplete="username"
              required
              aria-required="true"
              aria-describedby="username-help username-error"
            />
            <div id="username-help" class="register-form__help">
              Choose a unique username (3-20 characters)
            </div>
            <div id="username-error" class="register-form__field-error" role="alert" aria-live="polite"></div>
            <div id="username-availability" class="register-form__availability" aria-live="polite"></div>
          </div>
          
          <!-- Password Field -->
          <div class="register-form__field">
            <label for="register-password" class="register-form__label">
              Password
            </label>
            <input
              type="password"
              id="register-password"
              class="register-form__input"
              name="password"
              autocomplete="new-password"
              required
              aria-required="true"
              aria-describedby="password-help password-error password-strength"
            />
            <div id="password-help" class="register-form__help">
              At least 12 characters with uppercase, lowercase, number, and special character
            </div>
            <div id="password-error" class="register-form__field-error" role="alert" aria-live="polite"></div>
            
            <!-- Password Strength Indicator -->
            <div id="password-strength" class="password-strength" aria-live="polite">
              <div class="password-strength__label">Password Strength:</div>
              <div class="password-strength__bar-container">
                <div class="password-strength__bar" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
              </div>
              <ul class="password-strength__requirements" aria-label="Password requirements">
                <li class="password-strength__requirement" data-requirement="length">
                  <span class="password-strength__icon" aria-hidden="true">○</span>
                  <span>At least 12 characters</span>
                </li>
                <li class="password-strength__requirement" data-requirement="uppercase">
                  <span class="password-strength__icon" aria-hidden="true">○</span>
                  <span>One uppercase letter</span>
                </li>
                <li class="password-strength__requirement" data-requirement="lowercase">
                  <span class="password-strength__icon" aria-hidden="true">○</span>
                  <span>One lowercase letter</span>
                </li>
                <li class="password-strength__requirement" data-requirement="number">
                  <span class="password-strength__icon" aria-hidden="true">○</span>
                  <span>One number</span>
                </li>
                <li class="password-strength__requirement" data-requirement="special">
                  <span class="password-strength__icon" aria-hidden="true">○</span>
                  <span>One special character</span>
                </li>
              </ul>
            </div>
          </div>
          
          <!-- Confirm Password Field -->
          <div class="register-form__field">
            <label for="register-confirm-password" class="register-form__label">
              Confirm Password
            </label>
            <input
              type="password"
              id="register-confirm-password"
              class="register-form__input"
              name="confirmPassword"
              autocomplete="new-password"
              required
              aria-required="true"
              aria-describedby="confirm-password-help confirm-password-error"
            />
            <div id="confirm-password-help" class="register-form__help">
              Re-enter your password to confirm
            </div>
            <div id="confirm-password-error" class="register-form__field-error" role="alert" aria-live="polite"></div>
          </div>
          
          <!-- Form Error -->
          <div class="register-form__error" role="alert" aria-live="assertive"></div>
          
          <!-- Submit Button -->
          <button type="submit" class="register-form__submit">
            Create Account
          </button>

          <div class="register-form__links">
            <a href="#login" class="register-form__link">Already have an account? Sign in</a>
          </div>
        </form>
      </div>
    `;
    
    // Cache element references
    this.usernameInput = this.container.querySelector('#register-username');
    this.passwordInput = this.container.querySelector('#register-password');
    this.confirmPasswordInput = this.container.querySelector('#register-confirm-password');
    this.submitButton = this.container.querySelector('.register-form__submit');
  }
  
  /**
   * Attaches event listeners to form elements
   */
  private attachEventListeners(): void {
    const form = this.container.querySelector('.register-form');
    if (form) {
      form.addEventListener('submit', (e) => this.handleSubmit(e as SubmitEvent));
    }
    
    // Username input events
    if (this.usernameInput) {
      this.usernameInput.addEventListener('input', () => this.handleUsernameInput());
      this.usernameInput.addEventListener('blur', () => this.validateUsername());
    }
    
    // Password input events
    if (this.passwordInput) {
      this.passwordInput.addEventListener('input', () => this.handlePasswordInput());
      this.passwordInput.addEventListener('blur', () => this.validatePassword());
    }
    
    // Confirm password input events
    if (this.confirmPasswordInput) {
      this.confirmPasswordInput.addEventListener('input', () => this.handleConfirmPasswordInput());
      this.confirmPasswordInput.addEventListener('blur', () => this.validateConfirmPassword());
    }

    // Switch to login form
    const loginLink = this.container.querySelector('.register-form__link');
    loginLink?.addEventListener('click', (e) => {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('show-login', { bubbles: true }));
    });
  }
  
  /**
   * Handles username input changes with debounced availability checking
   */
  private handleUsernameInput(): void {
    this.clearFieldError('username');
    
    // Clear previous timeout
    if (this.usernameCheckTimeout !== null) {
      window.clearTimeout(this.usernameCheckTimeout);
    }
    
    const username = this.usernameInput?.value.trim() || '';
    
    // Clear availability indicator if username is empty or too short
    if (username.length < 3) {
      this.clearUsernameAvailability();
      this.isUsernameAvailable = false;
      return;
    }
    
    // Show checking indicator
    this.showUsernameChecking();
    
    // Debounce availability check (500ms)
    this.usernameCheckTimeout = window.setTimeout(async () => {
      await this.checkUsernameAvailability(username);
    }, 500);
  }
  
  /**
   * Checks if the username is available
   */
  private async checkUsernameAvailability(username: string): Promise<void> {
    try {
      const available = await this.authService.isUsernameAvailable(username);
      
      if (available) {
        this.showUsernameAvailable();
        this.isUsernameAvailable = true;
      } else {
        this.showUsernameUnavailable();
        this.isUsernameAvailable = false;
      }
    } catch (error) {
      console.error('Error checking username availability:', error);
      this.clearUsernameAvailability();
      this.isUsernameAvailable = false;
    }
  }
  
  /**
   * Shows username checking indicator
   */
  private showUsernameChecking(): void {
    const availabilityDiv = this.container.querySelector('#username-availability');
    if (availabilityDiv) {
      availabilityDiv.className = 'register-form__availability register-form__availability--checking';
      availabilityDiv.textContent = 'Checking availability...';
    }
  }
  
  /**
   * Shows username available indicator
   */
  private showUsernameAvailable(): void {
    const availabilityDiv = this.container.querySelector('#username-availability');
    if (availabilityDiv) {
      availabilityDiv.className = 'register-form__availability register-form__availability--available';
      availabilityDiv.textContent = '✓ Username is available';
    }
  }
  
  /**
   * Shows username unavailable indicator
   */
  private showUsernameUnavailable(): void {
    const availabilityDiv = this.container.querySelector('#username-availability');
    if (availabilityDiv) {
      availabilityDiv.className = 'register-form__availability register-form__availability--unavailable';
      availabilityDiv.textContent = '✗ Username is already taken';
    }
  }
  
  /**
   * Clears username availability indicator
   */
  private clearUsernameAvailability(): void {
    const availabilityDiv = this.container.querySelector('#username-availability');
    if (availabilityDiv) {
      availabilityDiv.className = 'register-form__availability';
      availabilityDiv.textContent = '';
    }
  }
  
  /**
   * Handles password input changes with strength indicator update
   */
  private handlePasswordInput(): void {
    this.clearFieldError('password');
    this.updatePasswordStrength();
    
    // Re-validate confirm password if it has a value
    if (this.confirmPasswordInput?.value) {
      this.validateConfirmPassword();
    }
  }
  
  /**
   * Handles confirm password input changes
   */
  private handleConfirmPasswordInput(): void {
    this.clearFieldError('confirm-password');
  }
  
  /**
   * Updates the password strength indicator
   */
  private updatePasswordStrength(): void {
    const password = this.passwordInput?.value || '';
    
    if (!password) {
      this.resetPasswordStrength();
      return;
    }
    
    // Get validation results
    const validation = this.authService.validatePasswordStrength(password);
    
    // Check individual requirements
    const requirements = {
      length: password.length >= 12,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password)
    };
    
    // Update requirement indicators
    for (const [key, met] of Object.entries(requirements)) {
      const requirement = this.container.querySelector(
        `.password-strength__requirement[data-requirement="${key}"]`
      );
      
      if (requirement) {
        const icon = requirement.querySelector('.password-strength__icon');
        
        if (met) {
          requirement.classList.add('password-strength__requirement--met');
          if (icon) icon.textContent = '✓';
        } else {
          requirement.classList.remove('password-strength__requirement--met');
          if (icon) icon.textContent = '○';
        }
      }
    }
    
    // Calculate strength percentage
    const metCount = Object.values(requirements).filter(Boolean).length;
    const strengthPercentage = (metCount / 5) * 100;
    
    // Update progress bar
    const progressBar = this.container.querySelector('.password-strength__bar');
    if (progressBar) {
      (progressBar as HTMLElement).style.width = `${strengthPercentage}%`;
      progressBar.setAttribute('aria-valuenow', String(strengthPercentage));
      
      // Update bar color based on strength
      progressBar.className = 'password-strength__bar';
      
      if (validation.valid) {
        progressBar.classList.add('password-strength__bar--strong');
      } else if (metCount >= 3) {
        progressBar.classList.add('password-strength__bar--medium');
      } else {
        progressBar.classList.add('password-strength__bar--weak');
      }
    }
    
    // Update label with screen reader text
    const label = this.container.querySelector('.password-strength__label');
    if (label) {
      let strengthText = 'Weak';
      if (validation.valid) {
        strengthText = 'Strong';
      } else if (metCount >= 3) {
        strengthText = 'Medium';
      }
      
      label.textContent = `Password Strength: ${strengthText}`;
    }
  }
  
  /**
   * Resets the password strength indicator
   */
  private resetPasswordStrength(): void {
    // Reset all requirement indicators
    const requirements = this.container.querySelectorAll('.password-strength__requirement');
    requirements.forEach((req) => {
      req.classList.remove('password-strength__requirement--met');
      const icon = req.querySelector('.password-strength__icon');
      if (icon) icon.textContent = '○';
    });
    
    // Reset progress bar
    const progressBar = this.container.querySelector('.password-strength__bar');
    if (progressBar) {
      (progressBar as HTMLElement).style.width = '0%';
      progressBar.setAttribute('aria-valuenow', '0');
      progressBar.className = 'password-strength__bar';
    }
    
    // Reset label
    const label = this.container.querySelector('.password-strength__label');
    if (label) {
      label.textContent = 'Password Strength:';
    }
  }
  
  /**
   * Validates the username field
   */
  private validateUsername(): boolean {
    const username = this.usernameInput?.value.trim() || '';
    
    if (!username) {
      this.showFieldError('username', 'Username is required');
      return false;
    }
    
    if (username.length < 3) {
      this.showFieldError('username', 'Username must be at least 3 characters');
      return false;
    }
    
    if (username.length > 20) {
      this.showFieldError('username', 'Username must be 20 characters or less');
      return false;
    }
    
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      this.showFieldError('username', 'Username can only contain letters, numbers, underscores, and hyphens');
      return false;
    }
    
    this.clearFieldError('username');
    return true;
  }
  
  /**
   * Validates the password field
   */
  private validatePassword(): boolean {
    const password = this.passwordInput?.value || '';
    
    if (!password) {
      this.showFieldError('password', 'Password is required');
      return false;
    }
    
    const validation = this.authService.validatePasswordStrength(password);
    
    if (!validation.valid) {
      const errorMessage = validation.errors.join('. ');
      this.showFieldError('password', errorMessage);
      return false;
    }
    
    this.clearFieldError('password');
    return true;
  }
  
  /**
   * Validates the confirm password field
   */
  private validateConfirmPassword(): boolean {
    const password = this.passwordInput?.value || '';
    const confirmPassword = this.confirmPasswordInput?.value || '';
    
    if (!confirmPassword) {
      this.showFieldError('confirm-password', 'Please confirm your password');
      return false;
    }
    
    if (password !== confirmPassword) {
      this.showFieldError('confirm-password', 'Passwords do not match');
      return false;
    }
    
    this.clearFieldError('confirm-password');
    return true;
  }
  
  /**
   * Shows a field-level error message
   */
  private showFieldError(field: string, message: string): void {
    const input = this.container.querySelector(`#register-${field}`) as HTMLInputElement;
    const errorDiv = this.container.querySelector(`#${field}-error`);
    
    if (input) {
      input.classList.add('register-form__input--error');
      input.setAttribute('aria-invalid', 'true');
    }
    
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.classList.add('register-form__field-error--visible');
    }
  }
  
  /**
   * Clears a field-level error message
   */
  private clearFieldError(field: string): void {
    const input = this.container.querySelector(`#register-${field}`) as HTMLInputElement;
    const errorDiv = this.container.querySelector(`#${field}-error`);
    
    if (input) {
      input.classList.remove('register-form__input--error');
      input.removeAttribute('aria-invalid');
    }
    
    if (errorDiv) {
      errorDiv.textContent = '';
      errorDiv.classList.remove('register-form__field-error--visible');
    }
  }
  
  /**
   * Shows a form-level error message
   */
  private showError(message: string): void {
    const errorDiv = this.container.querySelector('.register-form__error');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.classList.add('register-form__error--visible');
    }
  }
  
  /**
   * Clears the form-level error message
   */
  private clearError(): void {
    const errorDiv = this.container.querySelector('.register-form__error');
    if (errorDiv) {
      errorDiv.textContent = '';
      errorDiv.classList.remove('register-form__error--visible');
    }
  }
  
  /**
   * Sets the loading state of the form
   */
  private setLoading(loading: boolean): void {
    this.isSubmitting = loading;
    
    const form = this.container.querySelector('.register-form') as HTMLFormElement;
    const inputs = this.container.querySelectorAll('.register-form__input');
    
    if (form) {
      if (loading) {
        form.classList.add('register-form--loading');
      } else {
        form.classList.remove('register-form--loading');
      }
    }
    
    inputs.forEach((input) => {
      (input as HTMLInputElement).disabled = loading;
    });
    
    if (this.submitButton) {
      this.submitButton.disabled = loading;
      this.submitButton.textContent = loading ? 'Creating Account...' : 'Create Account';
    }
  }
  
  /**
   * Handles form submission
   */
  private async handleSubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    
    if (this.isSubmitting) {
      return;
    }
    
    this.clearError();
    
    // Validate all fields
    const usernameValid = this.validateUsername();
    const passwordValid = this.validatePassword();
    const confirmPasswordValid = this.validateConfirmPassword();
    
    if (!usernameValid || !passwordValid || !confirmPasswordValid) {
      return;
    }
    
    const username = this.usernameInput?.value.trim() || '';
    const password = this.passwordInput?.value || '';
    
    this.setLoading(true);
    
    try {
      // Check username availability if not already checked
      if (!this.isUsernameAvailable) {
        const available = await this.authService.isUsernameAvailable(username);
        if (!available) {
          this.showFieldError('username', 'Username is already taken');
          this.setLoading(false);
          return;
        }
      }
      
      // Register the user
      const user = await this.authService.register(username, password);
      
      // Dispatch success event with user details and password for auto-login
      const successEvent = new CustomEvent('register-success', {
        bubbles: true,
        detail: {
          username: user.username,
          userId: user.id,
          password: password // Pass password for auto-login after TOTP setup
        }
      });
      
      this.container.dispatchEvent(successEvent);
      
      // Reset form
      this.reset();
    } catch (error) {
      console.error('Registration error:', error);
      
      if (error instanceof ValidationError) {
        // Handle validation errors (case-insensitive check)
        const message = error.message.toLowerCase();
        if (message.includes('username')) {
          this.showFieldError('username', error.message);
        } else if (message.includes('password')) {
          this.showFieldError('password', error.message);
        } else {
          this.showError(error.message);
        }
      } else {
        // Generic error
        this.showError('Registration failed. Please try again.');
      }
    } finally {
      this.setLoading(false);
    }
  }
  
  /**
   * Resets the form to its initial state
   */
  public reset(): void {
    const form = this.container.querySelector('.register-form') as HTMLFormElement;
    
    if (form) {
      form.reset();
    }
    
    this.clearError();
    this.clearFieldError('username');
    this.clearFieldError('password');
    this.clearFieldError('confirmPassword');
    this.clearUsernameAvailability();
    this.resetPasswordStrength();
    
    this.isUsernameAvailable = false;
    
    // Focus username input
    if (this.usernameInput) {
      this.usernameInput.focus();
    }
  }
  
  /**
   * Cleans up the component
   */
  public destroy(): void {
    // Clear any pending timeouts
    if (this.usernameCheckTimeout !== null) {
      window.clearTimeout(this.usernameCheckTimeout);
    }
    
    this.container.innerHTML = '';
  }
}
