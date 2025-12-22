import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RegisterForm } from '../../../src/components/RegisterForm';
import { AuthService, ValidationError } from '../../../src/services/AuthService';
import { SessionService } from '../../../src/services/SessionService';
import { SecurityLogService } from '../../../src/services/SecurityLogService';
import { CryptoService } from '../../../src/services/CryptoService';
import { TotpService } from '../../../src/services/TotpService';
import { Database } from '../../../src/services/database';

describe('RegisterForm', () => {
  let container: HTMLElement;
  let authService: AuthService;
  let database: Database;
  let cryptoService: CryptoService;
  let sessionService: SessionService;
  let securityLogService: SecurityLogService;
  let totpService: TotpService;
  
  const mockUser = {
    id: 'user-123',
    username: 'testuser',
    passwordHash: 'hash123',
    salt: 'salt123',
    createdAt: Date.now(),
    lastLogin: null,
    failedLoginAttempts: 0,
    lastFailedLogin: null,
    accountLockedUntil: null,
    totpSecret: null,
    backupCodes: [],
    backupCodesUsed: []
  };
  beforeEach(async () => {
    // Clear localStorage
    localStorage.clear();
    
    // Create container
    container = document.createElement('div');
    document.body.appendChild(container);
    // Initialize services
    database = new Database();
    await database.initialize();
    cryptoService = new CryptoService();
    sessionService = new SessionService(database);
    securityLogService = new SecurityLogService(database);
    totpService = new TotpService();
    authService = new AuthService(
      cryptoService,
      sessionService,
      securityLogService,
      totpService,
      database
    );
  });
  afterEach(() => {
    // Cleanup
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  describe('constructor', () => {
    it('should create RegisterForm instance', () => {
      const form = new RegisterForm(container, authService);
      expect(form).toBeInstanceOf(RegisterForm);
    });
    it('should throw error if container is null', () => {
      expect(() => new RegisterForm(null, authService)).toThrow('Container element is required');
    it('should throw error if authService is null', () => {
      expect(() => new RegisterForm(container, null as any)).toThrow('AuthService is required');
  describe('render', () => {
    it('should render form title', () => {
      new RegisterForm(container, authService);
      
      const title = container.querySelector('.register-form__title');
      expect(title).toBeTruthy();
      expect(title?.textContent?.trim()).toBe('Create Account');
    it('should render username input with proper attributes', () => {
      const input = container.querySelector('#register-username') as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input.type).toBe('text');
      expect(input.name).toBe('username');
      expect(input.autocomplete).toBe('username');
      expect(input.required).toBe(true);
      expect(input.getAttribute('aria-required')).toBe('true');
      expect(input.getAttribute('aria-describedby')).toContain('username-help');
      expect(input.getAttribute('aria-describedby')).toContain('username-error');
    it('should render password input with proper attributes', () => {
      const input = container.querySelector('#register-password') as HTMLInputElement;
      expect(input.type).toBe('password');
      expect(input.name).toBe('password');
      expect(input.autocomplete).toBe('new-password');
      expect(input.getAttribute('aria-describedby')).toContain('password-help');
      expect(input.getAttribute('aria-describedby')).toContain('password-error');
      expect(input.getAttribute('aria-describedby')).toContain('password-strength');
    it('should render confirm password input with proper attributes', () => {
      const input = container.querySelector('#register-confirm-password') as HTMLInputElement;
      expect(input.name).toBe('confirmPassword');
    it('should render password strength indicator', () => {
      const strengthDiv = container.querySelector('#password-strength');
      expect(strengthDiv).toBeTruthy();
      expect(strengthDiv?.getAttribute('aria-live')).toBe('polite');
      const progressBar = container.querySelector('.password-strength__bar');
      expect(progressBar).toBeTruthy();
      expect(progressBar?.getAttribute('role')).toBe('progressbar');
      expect(progressBar?.getAttribute('aria-valuenow')).toBe('0');
      expect(progressBar?.getAttribute('aria-valuemin')).toBe('0');
      expect(progressBar?.getAttribute('aria-valuemax')).toBe('100');
    it('should render all password requirements', () => {
      const requirements = container.querySelectorAll('.password-strength__requirement');
      expect(requirements.length).toBe(5);
      const requirementTexts = Array.from(requirements).map(req => {
        const span = req.querySelector('span:not(.password-strength__icon)');
        return span?.textContent?.trim() || '';
      });
      expect(requirementTexts).toContain('At least 12 characters');
      expect(requirementTexts).toContain('One uppercase letter');
      expect(requirementTexts).toContain('One lowercase letter');
      expect(requirementTexts).toContain('One number');
      expect(requirementTexts).toContain('One special character');
    it('should render submit button', () => {
      const button = container.querySelector('.register-form__submit') as HTMLButtonElement;
      expect(button).toBeTruthy();
      expect(button.type).toBe('submit');
      expect(button.textContent?.trim()).toBe('Create Account');
    it('should render error containers with proper ARIA attributes', () => {
      const usernameError = container.querySelector('#username-error');
      expect(usernameError?.getAttribute('role')).toBe('alert');
      expect(usernameError?.getAttribute('aria-live')).toBe('polite');
      const passwordError = container.querySelector('#password-error');
      expect(passwordError?.getAttribute('role')).toBe('alert');
      expect(passwordError?.getAttribute('aria-live')).toBe('polite');
      const formError = container.querySelector('.register-form__error');
      expect(formError?.getAttribute('role')).toBe('alert');
      expect(formError?.getAttribute('aria-live')).toBe('assertive');
  describe('username validation', () => {
    it('should show error for empty username', () => {
      input.value = '';
      input.dispatchEvent(new Event('blur'));
      const error = container.querySelector('#username-error');
      expect(error?.textContent).toBe('Username is required');
      expect(input.classList.contains('register-form__input--error')).toBe(true);
      expect(input.getAttribute('aria-invalid')).toBe('true');
    it('should show error for username too short', () => {
      input.value = 'ab';
      expect(error?.textContent).toBe('Username must be at least 3 characters');
    it('should show error for username too long', () => {
      input.value = 'a'.repeat(21);
      expect(error?.textContent).toBe('Username must be 20 characters or less');
    it('should show error for invalid username characters', () => {
      input.value = 'test@user';
      expect(error?.textContent).toContain('can only contain letters, numbers, underscores, and hyphens');
    it('should clear error when valid username entered', () => {
      input.value = 'validuser';
      input.dispatchEvent(new Event('input'));
      expect(error?.textContent).toBe('');
      expect(input.classList.contains('register-form__input--error')).toBe(false);
  describe('username availability check', () => {
    it('should check username availability after debounce', async () => {
      const isAvailableSpy = vi.spyOn(authService, 'isUsernameAvailable').mockResolvedValue(true);
      input.value = 'newuser';
      // Should show checking indicator immediately
      const availability = container.querySelector('#username-availability');
      expect(availability?.textContent).toBe('Checking availability...');
      // Wait for debounce (500ms)
      await new Promise(resolve => setTimeout(resolve, 600));
      expect(isAvailableSpy).toHaveBeenCalledWith('newuser');
      expect(availability?.textContent).toBe('✓ Username is available');
      expect(availability?.classList.contains('register-form__availability--available')).toBe(true);
    it('should show unavailable if username is taken', async () => {
      vi.spyOn(authService, 'isUsernameAvailable').mockResolvedValue(false);
      input.value = 'existinguser';
      expect(availability?.textContent).toBe('✗ Username is already taken');
      expect(availability?.classList.contains('register-form__availability--unavailable')).toBe(true);
    it('should not check availability for usernames shorter than 3 characters', async () => {
      const isAvailableSpy = vi.spyOn(authService, 'isUsernameAvailable');
      expect(isAvailableSpy).not.toHaveBeenCalled();
      expect(availability?.textContent).toBe('');
    it('should cancel previous check when username changes', async () => {
      input.value = 'user1';
      await new Promise(resolve => setTimeout(resolve, 300));
      // Change username before debounce completes
      input.value = 'user2';
      // Should only check the latest username
      expect(isAvailableSpy).toHaveBeenCalledTimes(1);
      expect(isAvailableSpy).toHaveBeenCalledWith('user2');
  describe('password strength indicator', () => {
    it('should show all requirements unmet initially', () => {
      requirements.forEach(req => {
        expect(req.classList.contains('password-strength__requirement--met')).toBe(false);
        const icon = req.querySelector('.password-strength__icon');
        expect(icon?.textContent).toBe('○');
    it('should update length requirement when 12+ characters entered', () => {
      input.value = 'a'.repeat(12);
      const lengthReq = container.querySelector('.password-strength__requirement[data-requirement="length"]');
      expect(lengthReq?.classList.contains('password-strength__requirement--met')).toBe(true);
      const icon = lengthReq?.querySelector('.password-strength__icon');
      expect(icon?.textContent).toBe('✓');
    it('should update uppercase requirement', () => {
      input.value = 'A';
      const uppercaseReq = container.querySelector('.password-strength__requirement[data-requirement="uppercase"]');
      expect(uppercaseReq?.classList.contains('password-strength__requirement--met')).toBe(true);
    it('should update lowercase requirement', () => {
      input.value = 'a';
      const lowercaseReq = container.querySelector('.password-strength__requirement[data-requirement="lowercase"]');
      expect(lowercaseReq?.classList.contains('password-strength__requirement--met')).toBe(true);
    it('should update number requirement', () => {
      input.value = '1';
      const numberReq = container.querySelector('.password-strength__requirement[data-requirement="number"]');
      expect(numberReq?.classList.contains('password-strength__requirement--met')).toBe(true);
    it('should update special character requirement', () => {
      input.value = '!';
      const specialReq = container.querySelector('.password-strength__requirement[data-requirement="special"]');
      expect(specialReq?.classList.contains('password-strength__requirement--met')).toBe(true);
    it('should update progress bar width based on requirements met', () => {
      const progressBar = container.querySelector('.password-strength__bar') as HTMLElement;
      // 0 requirements met
      expect(progressBar.style.width).toBe('0%');
      // 1 requirement met (20%)
      expect(progressBar.style.width).toBe('20%');
      // 2 requirements met (40%)
      input.value = 'aA';
      expect(progressBar.style.width).toBe('40%');
      // 5 requirements met (100%)
      input.value = 'aA1!aaaaaaaa';
      expect(progressBar.style.width).toBe('100%');
    it('should apply weak color class for <3 requirements', () => {
      expect(progressBar.classList.contains('password-strength__bar--weak')).toBe(true);
      expect(progressBar.classList.contains('password-strength__bar--medium')).toBe(false);
      expect(progressBar.classList.contains('password-strength__bar--strong')).toBe(false);
    it('should apply medium color class for 3-4 requirements', () => {
      input.value = 'aA1';
      expect(progressBar.classList.contains('password-strength__bar--weak')).toBe(false);
      expect(progressBar.classList.contains('password-strength__bar--medium')).toBe(true);
    it('should apply strong color class for all 5 requirements', () => {
      input.value = 'Aa1!aaaaaaaa';
      expect(progressBar.classList.contains('password-strength__bar--strong')).toBe(true);
    it('should update strength label text', () => {
      const label = container.querySelector('.password-strength__label') as HTMLElement;
      // Weak
      expect(label.textContent).toBe('Password Strength: Weak');
      // Medium
      expect(label.textContent).toBe('Password Strength: Medium');
      // Strong
      expect(label.textContent).toBe('Password Strength: Strong');
  describe('password validation', () => {
    it('should show error for empty password', () => {
      const error = container.querySelector('#password-error');
      expect(error?.textContent).toBe('Password is required');
    it('should show error for weak password', () => {
      input.value = 'weak';
      expect(error?.textContent).toContain('12 characters');
    it('should clear error when strong password entered', () => {
      input.value = 'StrongPass123!';
  describe('confirm password validation', () => {
    it('should show error for empty confirm password', () => {
      const passwordInput = container.querySelector('#register-password') as HTMLInputElement;
      passwordInput.value = 'SomePassword123!';
      input.value = 'something';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('blur', { bubbles: true }));
      const error = container.querySelector('#confirm-password-error');
      expect(error?.textContent).toBe('Please confirm your password');
    it('should show error when passwords do not match', () => {
      const confirmInput = container.querySelector('#register-confirm-password') as HTMLInputElement;
      passwordInput.value = 'StrongPass123!';
      passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
      confirmInput.value = 'Different123!';
      confirmInput.dispatchEvent(new Event('input', { bubbles: true }));
      confirmInput.dispatchEvent(new Event('blur', { bubbles: true }));
      expect(error?.textContent).toBe('Passwords do not match');
    it('should clear error when passwords match', () => {
      confirmInput.dispatchEvent(new Event('blur'));
      confirmInput.value = 'StrongPass123!';
      confirmInput.dispatchEvent(new Event('input'));
    it('should re-validate confirm password when password changes', () => {
      // Confirm password is valid
      let error = container.querySelector('#confirm-password-error');
      // Change password
      passwordInput.value = 'DifferentPass123!';
      // The change in password should have auto-validated confirm password
      error = container.querySelector('#confirm-password-error');
  describe('form submission', () => {
    it('should call authService.register with username and password', async () => {
      const registerSpy = vi.spyOn(authService, 'register').mockResolvedValue(mockUser);
      vi.spyOn(authService, 'isUsernameAvailable').mockResolvedValue(true);
      const usernameInput = container.querySelector('#register-username') as HTMLInputElement;
      const form = container.querySelector('.register-form') as HTMLFormElement;
      usernameInput.value = 'newuser';
      usernameInput.dispatchEvent(new Event('input'));
      passwordInput.dispatchEvent(new Event('input'));
      form.dispatchEvent(new Event('submit'));
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(registerSpy).toHaveBeenCalledWith('newuser', 'StrongPass123!');
    it('should show loading state during registration', async () => {
      vi.spyOn(authService, 'register').mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(mockUser), 100)));
      const submitButton = container.querySelector('.register-form__submit') as HTMLButtonElement;
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(submitButton.disabled).toBe(true);
      expect(submitButton.textContent).toBe('Creating Account...');
      expect(usernameInput.disabled).toBe(true);
      expect(passwordInput.disabled).toBe(true);
      expect(confirmInput.disabled).toBe(true);
      expect(submitButton.disabled).toBe(false);
      expect(submitButton.textContent).toBe('Create Account');
    it('should dispatch register-success event on successful registration', async () => {
      vi.spyOn(authService, 'register').mockResolvedValue(mockUser);
      let eventDetail: any = null;
      container.addEventListener('register-success', (event: Event) => {
        eventDetail = (event as CustomEvent).detail;
      expect(eventDetail).toEqual({
        username: 'testuser',
        userId: 'user-123'
    it('should not submit if username is not available', async () => {
      const registerSpy = vi.spyOn(authService, 'register');
      usernameInput.value = 'existinguser';
      expect(registerSpy).not.toHaveBeenCalled();
      expect(error?.textContent).toBe('Username is not available');
    it('should not submit if validation fails', async () => {
    it('should handle ValidationError for username', async () => {
      vi.spyOn(authService, 'register').mockRejectedValue(new ValidationError('Username is already taken'));
      usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
      form.dispatchEvent(new Event('submit', { bubbles: true }));
      // Wait for async error handling and micro-task queue
      expect(error?.textContent).toBe('Username is already taken');
    it('should handle ValidationError for password', async () => {
      vi.spyOn(authService, 'register').mockRejectedValue(new ValidationError('Password is too weak'));
      expect(error?.textContent).toBe('Password is too weak');
    it('should handle generic errors', async () => {
      vi.spyOn(authService, 'register').mockRejectedValue(new Error('Network error'));
      const error = container.querySelector('.register-form__error');
      expect(error?.textContent).toBe('Registration failed. Please try again.');
  describe('reset', () => {
    it('should clear all form fields', () => {
      usernameInput.value = 'testuser';
      form.reset();
      expect(usernameInput.value).toBe('');
      expect(passwordInput.value).toBe('');
      expect(confirmInput.value).toBe('');
    it('should clear all error messages', () => {
      usernameInput.value = '';
      usernameInput.dispatchEvent(new Event('blur'));
      const confirmError = container.querySelector('#confirm-password-error');
      expect(usernameError?.textContent).toBe('');
      expect(passwordError?.textContent).toBe('');
      expect(confirmError?.textContent).toBe('');
      expect(formError?.textContent).toBe('');
    it('should reset password strength indicator', () => {
    it('should focus username input', () => {
      expect(document.activeElement).toBe(usernameInput);
  describe('accessibility', () => {
    it('should have proper ARIA labels for all inputs', () => {
      const usernameLabel = container.querySelector('label[for="register-username"]');
      const passwordLabel = container.querySelector('label[for="register-password"]');
      const confirmLabel = container.querySelector('label[for="register-confirm-password"]');
      expect(usernameLabel?.textContent?.trim()).toBe('Username');
      expect(passwordLabel?.textContent?.trim()).toBe('Password');
      expect(confirmLabel?.textContent?.trim()).toBe('Confirm Password');
    it('should set aria-invalid on inputs with errors', () => {
      expect(usernameInput.getAttribute('aria-invalid')).toBe('true');
    it('should announce errors with role="alert" and aria-live', () => {
      expect(confirmError?.getAttribute('role')).toBe('alert');
      expect(confirmError?.getAttribute('aria-live')).toBe('polite');
    it('should have proper autocomplete attributes', () => {
      expect(usernameInput.autocomplete).toBe('username');
      expect(passwordInput.autocomplete).toBe('new-password');
      expect(confirmInput.autocomplete).toBe('new-password');
    it('should have aria-describedby linking inputs to help text', () => {
      expect(usernameInput.getAttribute('aria-describedby')).toContain('username-help');
      expect(passwordInput.getAttribute('aria-describedby')).toContain('password-help');
      expect(passwordInput.getAttribute('aria-describedby')).toContain('password-strength');
    it('should have password strength indicator with proper ARIA', () => {
      const requirementsList = container.querySelector('.password-strength__requirements');
      expect(requirementsList?.getAttribute('aria-label')).toBe('Password requirements');
  describe('destroy', () => {
    it('should clear container', () => {
      form.destroy();
      expect(container.innerHTML).toBe('');
    it('should clear pending timeout', async () => {
      // Destroy before debounce completes
      // Should not have been called
});
