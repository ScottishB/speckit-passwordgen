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
  });
  
  describe('constructor', () => {
    it('should create RegisterForm instance', () => {
      const form = new RegisterForm(container, authService);
      expect(form).toBeInstanceOf(RegisterForm);
    });
    
    it('should throw error if container is null', () => {
      expect(() => new RegisterForm(null, authService)).toThrow('Container element is required');
    });
    
    it('should throw error if authService is null', () => {
      expect(() => new RegisterForm(container, null as any)).toThrow('AuthService is required');
    });
  });
  
  describe('render', () => {
    it('should render form title', () => {
      new RegisterForm(container, authService);
      
      const title = container.querySelector('.register-form__title');
      expect(title).toBeTruthy();
      expect(title?.textContent?.trim()).toBe('Create Account');
    });
    
    it('should render username input with proper attributes', () => {
      new RegisterForm(container, authService);
      
      const input = container.querySelector('#register-username') as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input.type).toBe('text');
      expect(input.name).toBe('username');
      expect(input.autocomplete).toBe('username');
      expect(input.required).toBe(true);
      expect(input.getAttribute('aria-required')).toBe('true');
      expect(input.getAttribute('aria-describedby')).toContain('username-help');
      expect(input.getAttribute('aria-describedby')).toContain('username-error');
    });
    
    it('should render password input with proper attributes', () => {
      new RegisterForm(container, authService);
      
      const input = container.querySelector('#register-password') as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input.type).toBe('password');
      expect(input.name).toBe('password');
      expect(input.autocomplete).toBe('new-password');
      expect(input.required).toBe(true);
      expect(input.getAttribute('aria-required')).toBe('true');
      expect(input.getAttribute('aria-describedby')).toContain('password-help');
      expect(input.getAttribute('aria-describedby')).toContain('password-error');
      expect(input.getAttribute('aria-describedby')).toContain('password-strength');
    });
    
    it('should render confirm password input with proper attributes', () => {
      new RegisterForm(container, authService);
      
      const input = container.querySelector('#register-confirm-password') as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input.type).toBe('password');
      expect(input.name).toBe('confirmPassword');
      expect(input.autocomplete).toBe('new-password');
      expect(input.required).toBe(true);
      expect(input.getAttribute('aria-required')).toBe('true');
    });
    
    it('should render password strength indicator', () => {
      new RegisterForm(container, authService);
      
      const strengthDiv = container.querySelector('#password-strength');
      expect(strengthDiv).toBeTruthy();
      expect(strengthDiv?.getAttribute('aria-live')).toBe('polite');
      
      const progressBar = container.querySelector('.password-strength__bar');
      expect(progressBar).toBeTruthy();
      expect(progressBar?.getAttribute('role')).toBe('progressbar');
      expect(progressBar?.getAttribute('aria-valuenow')).toBe('0');
      expect(progressBar?.getAttribute('aria-valuemin')).toBe('0');
      expect(progressBar?.getAttribute('aria-valuemax')).toBe('100');
    });
    
    it('should render all password requirements', () => {
      new RegisterForm(container, authService);
      
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
    });
    
    it('should render submit button', () => {
      new RegisterForm(container, authService);
      
      const button = container.querySelector('.register-form__submit') as HTMLButtonElement;
      expect(button).toBeTruthy();
      expect(button.type).toBe('submit');
      expect(button.textContent?.trim()).toBe('Create Account');
    });
    
    it('should render error containers with proper ARIA attributes', () => {
      new RegisterForm(container, authService);
      
      const usernameError = container.querySelector('#username-error');
      expect(usernameError?.getAttribute('role')).toBe('alert');
      expect(usernameError?.getAttribute('aria-live')).toBe('polite');
      
      const passwordError = container.querySelector('#password-error');
      expect(passwordError?.getAttribute('role')).toBe('alert');
      expect(passwordError?.getAttribute('aria-live')).toBe('polite');
      
      const formError = container.querySelector('.register-form__error');
      expect(formError?.getAttribute('role')).toBe('alert');
      expect(formError?.getAttribute('aria-live')).toBe('assertive');
    });
  });
  
  describe('username validation', () => {
    it('should show error for empty username', () => {
      new RegisterForm(container, authService);
      
      const input = container.querySelector('#register-username') as HTMLInputElement;
      input.value = '';
      input.dispatchEvent(new Event('blur'));
      
      const error = container.querySelector('#username-error');
      expect(error?.textContent).toBe('Username is required');
      expect(input.classList.contains('register-form__input--error')).toBe(true);
      expect(input.getAttribute('aria-invalid')).toBe('true');
    });
    
    it('should show error for username too short', () => {
      new RegisterForm(container, authService);
      
      const input = container.querySelector('#register-username') as HTMLInputElement;
      input.value = 'ab';
      input.dispatchEvent(new Event('blur'));
      
      const error = container.querySelector('#username-error');
      expect(error?.textContent).toBe('Username must be at least 3 characters');
    });
    
    it('should show error for username too long', () => {
      new RegisterForm(container, authService);
      
      const input = container.querySelector('#register-username') as HTMLInputElement;
      input.value = 'a'.repeat(21);
      input.dispatchEvent(new Event('blur'));
      
      const error = container.querySelector('#username-error');
      expect(error?.textContent).toBe('Username must be 20 characters or less');
    });
    
    it('should show error for invalid username characters', () => {
      new RegisterForm(container, authService);
      
      const input = container.querySelector('#register-username') as HTMLInputElement;
      input.value = 'test@user';
      input.dispatchEvent(new Event('blur'));
      
      const error = container.querySelector('#username-error');
      expect(error?.textContent).toContain('can only contain letters, numbers, underscores, and hyphens');
    });
    
    it('should clear error when valid username entered', () => {
      new RegisterForm(container, authService);
      
      const input = container.querySelector('#register-username') as HTMLInputElement;
      input.value = '';
      input.dispatchEvent(new Event('blur'));
      
      input.value = 'validuser';
      input.dispatchEvent(new Event('input'));
      
      const error = container.querySelector('#username-error');
      expect(error?.textContent).toBe('');
      expect(input.classList.contains('register-form__input--error')).toBe(false);
    });
  });
  
  describe('username availability check', () => {
    it('should check username availability after debounce', async () => {
      new RegisterForm(container, authService);
      
      const isAvailableSpy = vi.spyOn(authService, 'isUsernameAvailable').mockResolvedValue(true);
      
      const input = container.querySelector('#register-username') as HTMLInputElement;
      input.value = 'newuser';
      input.dispatchEvent(new Event('input'));
      
      // Should show checking indicator immediately
      const availability = container.querySelector('#username-availability');
      expect(availability?.textContent).toBe('Checking availability...');
      
      // Wait for debounce (500ms)
      await new Promise(resolve => setTimeout(resolve, 600));
      
      expect(isAvailableSpy).toHaveBeenCalledWith('newuser');
      expect(availability?.textContent).toBe('✓ Username is available');
      expect(availability?.classList.contains('register-form__availability--available')).toBe(true);
    });
    
    it('should show unavailable if username is taken', async () => {
      new RegisterForm(container, authService);
      
      vi.spyOn(authService, 'isUsernameAvailable').mockResolvedValue(false);
      
      const input = container.querySelector('#register-username') as HTMLInputElement;
      input.value = 'existinguser';
      input.dispatchEvent(new Event('input'));
      
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const availability = container.querySelector('#username-availability');
      expect(availability?.textContent).toBe('✗ Username is already taken');
      expect(availability?.classList.contains('register-form__availability--unavailable')).toBe(true);
    });
    
    it('should not check availability for usernames shorter than 3 characters', async () => {
      new RegisterForm(container, authService);
      
      const isAvailableSpy = vi.spyOn(authService, 'isUsernameAvailable');
      
      const input = container.querySelector('#register-username') as HTMLInputElement;
      input.value = 'ab';
      input.dispatchEvent(new Event('input'));
      
      await new Promise(resolve => setTimeout(resolve, 600));
      
      expect(isAvailableSpy).not.toHaveBeenCalled();
      
      const availability = container.querySelector('#username-availability');
      expect(availability?.textContent).toBe('');
    });
    
    it('should cancel previous check when username changes', async () => {
      new RegisterForm(container, authService);
      
      const isAvailableSpy = vi.spyOn(authService, 'isUsernameAvailable').mockResolvedValue(true);
      
      const input = container.querySelector('#register-username') as HTMLInputElement;
      
      input.value = 'user1';
      input.dispatchEvent(new Event('input'));
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Change username before debounce completes
      input.value = 'user2';
      input.dispatchEvent(new Event('input'));
      
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Should only check the latest username
      expect(isAvailableSpy).toHaveBeenCalledTimes(1);
      expect(isAvailableSpy).toHaveBeenCalledWith('user2');
    });
  });
  
  describe('password strength indicator', () => {
    it('should show all requirements unmet initially', () => {
      new RegisterForm(container, authService);
      
      const requirements = container.querySelectorAll('.password-strength__requirement');
      
      requirements.forEach(req => {
        expect(req.classList.contains('password-strength__requirement--met')).toBe(false);
        const icon = req.querySelector('.password-strength__icon');
        expect(icon?.textContent).toBe('○');
      });
    });
    
    it('should update length requirement when 12+ characters entered', () => {
      new RegisterForm(container, authService);
      
      const input = container.querySelector('#register-password') as HTMLInputElement;
      input.value = 'a'.repeat(12);
      input.dispatchEvent(new Event('input'));
      
      const lengthReq = container.querySelector('.password-strength__requirement[data-requirement="length"]');
      expect(lengthReq?.classList.contains('password-strength__requirement--met')).toBe(true);
      
      const icon = lengthReq?.querySelector('.password-strength__icon');
      expect(icon?.textContent).toBe('✓');
    });
    
    it('should update uppercase requirement', () => {
      new RegisterForm(container, authService);
      
      const input = container.querySelector('#register-password') as HTMLInputElement;
      input.value = 'A';
      input.dispatchEvent(new Event('input'));
      
      const uppercaseReq = container.querySelector('.password-strength__requirement[data-requirement="uppercase"]');
      expect(uppercaseReq?.classList.contains('password-strength__requirement--met')).toBe(true);
    });
    
    it('should update lowercase requirement', () => {
      new RegisterForm(container, authService);
      
      const input = container.querySelector('#register-password') as HTMLInputElement;
      input.value = 'a';
      input.dispatchEvent(new Event('input'));
      
      const lowercaseReq = container.querySelector('.password-strength__requirement[data-requirement="lowercase"]');
      expect(lowercaseReq?.classList.contains('password-strength__requirement--met')).toBe(true);
    });
    
    it('should update number requirement', () => {
      new RegisterForm(container, authService);
      
      const input = container.querySelector('#register-password') as HTMLInputElement;
      input.value = '1';
      input.dispatchEvent(new Event('input'));
      
      const numberReq = container.querySelector('.password-strength__requirement[data-requirement="number"]');
      expect(numberReq?.classList.contains('password-strength__requirement--met')).toBe(true);
    });
    
    it('should update special character requirement', () => {
      new RegisterForm(container, authService);
      
      const input = container.querySelector('#register-password') as HTMLInputElement;
      input.value = '!';
      input.dispatchEvent(new Event('input'));
      
      const specialReq = container.querySelector('.password-strength__requirement[data-requirement="special"]');
      expect(specialReq?.classList.contains('password-strength__requirement--met')).toBe(true);
    });
    
    it('should update progress bar width based on requirements met', () => {
      new RegisterForm(container, authService);
      
      const input = container.querySelector('#register-password') as HTMLInputElement;
      const progressBar = container.querySelector('.password-strength__bar') as HTMLElement;
      
      // 0 requirements met
      input.value = '';
      input.dispatchEvent(new Event('input'));
      expect(progressBar.style.width).toBe('0%');
      
      // 1 requirement met (20%)
      input.value = 'a';
      input.dispatchEvent(new Event('input'));
      expect(progressBar.style.width).toBe('20%');
      
      // 2 requirements met (40%)
      input.value = 'aA';
      input.dispatchEvent(new Event('input'));
      expect(progressBar.style.width).toBe('40%');
      
      // 5 requirements met (100%)
      input.value = 'aA1!aaaaaaaa';
      input.dispatchEvent(new Event('input'));
      expect(progressBar.style.width).toBe('100%');
    });
    
    it('should apply weak color class for <3 requirements', () => {
      new RegisterForm(container, authService);
      
      const input = container.querySelector('#register-password') as HTMLInputElement;
      const progressBar = container.querySelector('.password-strength__bar') as HTMLElement;
      
      input.value = 'aA';
      input.dispatchEvent(new Event('input'));
      
      expect(progressBar.classList.contains('password-strength__bar--weak')).toBe(true);
      expect(progressBar.classList.contains('password-strength__bar--medium')).toBe(false);
      expect(progressBar.classList.contains('password-strength__bar--strong')).toBe(false);
    });
    
    it('should apply medium color class for 3-4 requirements', () => {
      new RegisterForm(container, authService);
      
      const input = container.querySelector('#register-password') as HTMLInputElement;
      const progressBar = container.querySelector('.password-strength__bar') as HTMLElement;
      
      input.value = 'aA1';
      input.dispatchEvent(new Event('input'));
      
      expect(progressBar.classList.contains('password-strength__bar--weak')).toBe(false);
      expect(progressBar.classList.contains('password-strength__bar--medium')).toBe(true);
      expect(progressBar.classList.contains('password-strength__bar--strong')).toBe(false);
    });
    
    it('should apply strong color class for all 5 requirements', () => {
      new RegisterForm(container, authService);
      
      const input = container.querySelector('#register-password') as HTMLInputElement;
      const progressBar = container.querySelector('.password-strength__bar') as HTMLElement;
      
      input.value = 'Aa1!aaaaaaaa';
      input.dispatchEvent(new Event('input'));
      
      expect(progressBar.classList.contains('password-strength__bar--weak')).toBe(false);
      expect(progressBar.classList.contains('password-strength__bar--medium')).toBe(false);
      expect(progressBar.classList.contains('password-strength__bar--strong')).toBe(true);
    });
    
    it('should update strength label text', () => {
      new RegisterForm(container, authService);
      
      const input = container.querySelector('#register-password') as HTMLInputElement;
      const label = container.querySelector('.password-strength__label') as HTMLElement;
      
      // Weak
      input.value = 'a';
      input.dispatchEvent(new Event('input'));
      expect(label.textContent).toBe('Password Strength: Weak');
      
      // Medium
      input.value = 'aA1';
      input.dispatchEvent(new Event('input'));
      expect(label.textContent).toBe('Password Strength: Medium');
      
      // Strong
      input.value = 'Aa1!aaaaaaaa';
      input.dispatchEvent(new Event('input'));
      expect(label.textContent).toBe('Password Strength: Strong');
    });
  });
  
  describe('password validation', () => {
    it('should show error for empty password', () => {
      new RegisterForm(container, authService);
      
      const input = container.querySelector('#register-password') as HTMLInputElement;
      input.value = '';
      input.dispatchEvent(new Event('blur'));
      
      const error = container.querySelector('#password-error');
      expect(error?.textContent).toBe('Password is required');
    });
    
    it('should show error for weak password', () => {
      new RegisterForm(container, authService);
      
      const input = container.querySelector('#register-password') as HTMLInputElement;
      input.value = 'weak';
      input.dispatchEvent(new Event('blur'));
      
      const error = container.querySelector('#password-error');
      expect(error?.textContent).toContain('12 characters');
    });
    
    it('should clear error when strong password entered', () => {
      new RegisterForm(container, authService);
      
      const input = container.querySelector('#register-password') as HTMLInputElement;
      input.value = 'weak';
      input.dispatchEvent(new Event('blur'));
      
      input.value = 'StrongPass123!';
      input.dispatchEvent(new Event('input'));
      
      const error = container.querySelector('#password-error');
      expect(error?.textContent).toBe('');
    });
  });
  
  describe('confirm password validation', () => {
    it('should show error for empty confirm password', () => {
      new RegisterForm(container, authService);
      
      const passwordInput = container.querySelector('#register-password') as HTMLInputElement;
      const input = container.querySelector('#register-confirm-password') as HTMLInputElement;
      
      passwordInput.value = 'SomePassword123!';
      input.value = 'something';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.value = '';
      input.dispatchEvent(new Event('blur', { bubbles: true }));
      
      const error = container.querySelector('#confirm-password-error');
      expect(error?.textContent).toBe('Please confirm your password');
    });
    
    it('should show error when passwords do not match', () => {
      new RegisterForm(container, authService);
      
      const passwordInput = container.querySelector('#register-password') as HTMLInputElement;
      const confirmInput = container.querySelector('#register-confirm-password') as HTMLInputElement;
      
      passwordInput.value = 'StrongPass123!';
      passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
      confirmInput.value = 'Different123!';
      confirmInput.dispatchEvent(new Event('input', { bubbles: true }));
      confirmInput.dispatchEvent(new Event('blur', { bubbles: true }));
      
      const error = container.querySelector('#confirm-password-error');
      expect(error?.textContent).toBe('Passwords do not match');
    });
    
    it('should clear error when passwords match', () => {
      new RegisterForm(container, authService);
      
      const passwordInput = container.querySelector('#register-password') as HTMLInputElement;
      const confirmInput = container.querySelector('#register-confirm-password') as HTMLInputElement;
      
      passwordInput.value = 'StrongPass123!';
      confirmInput.value = 'Different123!';
      confirmInput.dispatchEvent(new Event('blur'));
      
      confirmInput.value = 'StrongPass123!';
      confirmInput.dispatchEvent(new Event('input'));
      
      const error = container.querySelector('#confirm-password-error');
      expect(error?.textContent).toBe('');
    });
    
    it('should re-validate confirm password when password changes', () => {
      new RegisterForm(container, authService);
      
      const passwordInput = container.querySelector('#register-password') as HTMLInputElement;
      const confirmInput = container.querySelector('#register-confirm-password') as HTMLInputElement;
      
      passwordInput.value = 'StrongPass123!';
      passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
      confirmInput.value = 'StrongPass123!';
      confirmInput.dispatchEvent(new Event('input', { bubbles: true }));
      confirmInput.dispatchEvent(new Event('blur', { bubbles: true }));
      
      // Confirm password is valid
      let error = container.querySelector('#confirm-password-error');
      expect(error?.textContent).toBe('');
      
      // Change password
      passwordInput.value = 'DifferentPass123!';
      passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      // The change in password should have auto-validated confirm password
      error = container.querySelector('#confirm-password-error');
      expect(error?.textContent).toBe('Passwords do not match');
    });
  });
  
  describe('form submission', () => {
    it('should call authService.register with username and password', async () => {
      new RegisterForm(container, authService);
      
      const registerSpy = vi.spyOn(authService, 'register').mockResolvedValue(mockUser);
      vi.spyOn(authService, 'isUsernameAvailable').mockResolvedValue(true);
      
      const usernameInput = container.querySelector('#register-username') as HTMLInputElement;
      const passwordInput = container.querySelector('#register-password') as HTMLInputElement;
      const confirmInput = container.querySelector('#register-confirm-password') as HTMLInputElement;
      const form = container.querySelector('.register-form') as HTMLFormElement;
      
      usernameInput.value = 'newuser';
      usernameInput.dispatchEvent(new Event('input'));
      
      await new Promise(resolve => setTimeout(resolve, 600));
      
      passwordInput.value = 'StrongPass123!';
      passwordInput.dispatchEvent(new Event('input'));
      
      confirmInput.value = 'StrongPass123!';
      confirmInput.dispatchEvent(new Event('input'));
      
      form.dispatchEvent(new Event('submit'));
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(registerSpy).toHaveBeenCalledWith('newuser', 'StrongPass123!');
    });
    
    it('should show loading state during registration', async () => {
      new RegisterForm(container, authService);
      
      vi.spyOn(authService, 'register').mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(mockUser), 100)));
      vi.spyOn(authService, 'isUsernameAvailable').mockResolvedValue(true);
      
      const usernameInput = container.querySelector('#register-username') as HTMLInputElement;
      const passwordInput = container.querySelector('#register-password') as HTMLInputElement;
      const confirmInput = container.querySelector('#register-confirm-password') as HTMLInputElement;
      const submitButton = container.querySelector('.register-form__submit') as HTMLButtonElement;
      const form = container.querySelector('.register-form') as HTMLFormElement;
      
      usernameInput.value = 'newuser';
      usernameInput.dispatchEvent(new Event('input'));
      
      await new Promise(resolve => setTimeout(resolve, 600));
      
      passwordInput.value = 'StrongPass123!';
      passwordInput.dispatchEvent(new Event('input'));
      
      confirmInput.value = 'StrongPass123!';
      confirmInput.dispatchEvent(new Event('input'));
      
      form.dispatchEvent(new Event('submit'));
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(submitButton.disabled).toBe(true);
      expect(submitButton.textContent).toBe('Creating Account...');
      expect(usernameInput.disabled).toBe(true);
      expect(passwordInput.disabled).toBe(true);
      expect(confirmInput.disabled).toBe(true);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(submitButton.disabled).toBe(false);
      expect(submitButton.textContent).toBe('Create Account');
    });
    
    it('should dispatch register-success event on successful registration', async () => {
      new RegisterForm(container, authService);
      
      vi.spyOn(authService, 'register').mockResolvedValue(mockUser);
      vi.spyOn(authService, 'isUsernameAvailable').mockResolvedValue(true);
      
      const usernameInput = container.querySelector('#register-username') as HTMLInputElement;
      const passwordInput = container.querySelector('#register-password') as HTMLInputElement;
      const confirmInput = container.querySelector('#register-confirm-password') as HTMLInputElement;
      const form = container.querySelector('.register-form') as HTMLFormElement;
      
      let eventDetail: any = null;
      container.addEventListener('register-success', (event: Event) => {
        eventDetail = (event as CustomEvent).detail;
      });
      
      usernameInput.value = 'newuser';
      usernameInput.dispatchEvent(new Event('input'));
      
      await new Promise(resolve => setTimeout(resolve, 600));
      
      passwordInput.value = 'StrongPass123!';
      passwordInput.dispatchEvent(new Event('input'));
      
      confirmInput.value = 'StrongPass123!';
      confirmInput.dispatchEvent(new Event('input'));
      
      form.dispatchEvent(new Event('submit'));
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(eventDetail).toEqual({
        username: 'testuser',
        userId: 'user-123'
      });
    });
    
    it('should not submit if username is not available', async () => {
      new RegisterForm(container, authService);
      
      const registerSpy = vi.spyOn(authService, 'register');
      vi.spyOn(authService, 'isUsernameAvailable').mockResolvedValue(false);
      
      const usernameInput = container.querySelector('#register-username') as HTMLInputElement;
      const passwordInput = container.querySelector('#register-password') as HTMLInputElement;
      const confirmInput = container.querySelector('#register-confirm-password') as HTMLInputElement;
      const form = container.querySelector('.register-form') as HTMLFormElement;
      
      usernameInput.value = 'existinguser';
      usernameInput.dispatchEvent(new Event('input'));
      
      await new Promise(resolve => setTimeout(resolve, 600));
      
      passwordInput.value = 'StrongPass123!';
      passwordInput.dispatchEvent(new Event('input'));
      
      confirmInput.value = 'StrongPass123!';
      confirmInput.dispatchEvent(new Event('input'));
      
      form.dispatchEvent(new Event('submit'));
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(registerSpy).not.toHaveBeenCalled();
      
      const error = container.querySelector('#username-error');
      expect(error?.textContent).toBe('Username is not available');
    });
    
    it('should not submit if validation fails', async () => {
      new RegisterForm(container, authService);
      
      const registerSpy = vi.spyOn(authService, 'register');
      
      const form = container.querySelector('.register-form') as HTMLFormElement;
      form.dispatchEvent(new Event('submit'));
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(registerSpy).not.toHaveBeenCalled();
    });
    
    it('should handle ValidationError for username', async () => {
      new RegisterForm(container, authService);
      
      vi.spyOn(authService, 'register').mockRejectedValue(new ValidationError('Username is already taken'));
      vi.spyOn(authService, 'isUsernameAvailable').mockResolvedValue(true);
      
      const usernameInput = container.querySelector('#register-username') as HTMLInputElement;
      const passwordInput = container.querySelector('#register-password') as HTMLInputElement;
      const confirmInput = container.querySelector('#register-confirm-password') as HTMLInputElement;
      const form = container.querySelector('.register-form') as HTMLFormElement;
      
      usernameInput.value = 'newuser';
      usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      await new Promise(resolve => setTimeout(resolve, 600));
      
      passwordInput.value = 'StrongPass123!';
      passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      confirmInput.value = 'StrongPass123!';
      confirmInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      form.dispatchEvent(new Event('submit', { bubbles: true }));
      
      // Wait for async error handling and micro-task queue
      await new Promise(resolve => setTimeout(resolve, 10));
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const error = container.querySelector('#username-error');
      expect(error?.textContent).toBe('Username is already taken');
    });
    
    it('should handle ValidationError for password', async () => {
      new RegisterForm(container, authService);
      
      vi.spyOn(authService, 'register').mockRejectedValue(new ValidationError('Password is too weak'));
      vi.spyOn(authService, 'isUsernameAvailable').mockResolvedValue(true);
      
      const usernameInput = container.querySelector('#register-username') as HTMLInputElement;
      const passwordInput = container.querySelector('#register-password') as HTMLInputElement;
      const confirmInput = container.querySelector('#register-confirm-password') as HTMLInputElement;
      const form = container.querySelector('.register-form') as HTMLFormElement;
      
      usernameInput.value = 'newuser';
      usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      await new Promise(resolve => setTimeout(resolve, 600));
      
      passwordInput.value = 'StrongPass123!';
      passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      confirmInput.value = 'StrongPass123!';
      confirmInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      form.dispatchEvent(new Event('submit', { bubbles: true }));
      
      // Wait for async error handling and micro-task queue
      await new Promise(resolve => setTimeout(resolve, 10));
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const error = container.querySelector('#password-error');
      expect(error?.textContent).toBe('Password is too weak');
    });
    
    it('should handle generic errors', async () => {
      new RegisterForm(container, authService);
      
      vi.spyOn(authService, 'register').mockRejectedValue(new Error('Network error'));
      vi.spyOn(authService, 'isUsernameAvailable').mockResolvedValue(true);
      
      const usernameInput = container.querySelector('#register-username') as HTMLInputElement;
      const passwordInput = container.querySelector('#register-password') as HTMLInputElement;
      const confirmInput = container.querySelector('#register-confirm-password') as HTMLInputElement;
      const form = container.querySelector('.register-form') as HTMLFormElement;
      
      usernameInput.value = 'newuser';
      usernameInput.dispatchEvent(new Event('input'));
      
      await new Promise(resolve => setTimeout(resolve, 600));
      
      passwordInput.value = 'StrongPass123!';
      passwordInput.dispatchEvent(new Event('input'));
      
      confirmInput.value = 'StrongPass123!';
      confirmInput.dispatchEvent(new Event('input'));
      
      form.dispatchEvent(new Event('submit'));
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const error = container.querySelector('.register-form__error');
      expect(error?.textContent).toBe('Registration failed. Please try again.');
    });
  });
  
  describe('reset', () => {
    it('should clear all form fields', () => {
      const form = new RegisterForm(container, authService);
      
      const usernameInput = container.querySelector('#register-username') as HTMLInputElement;
      const passwordInput = container.querySelector('#register-password') as HTMLInputElement;
      const confirmInput = container.querySelector('#register-confirm-password') as HTMLInputElement;
      
      usernameInput.value = 'testuser';
      passwordInput.value = 'StrongPass123!';
      confirmInput.value = 'StrongPass123!';
      
      form.reset();
      
      expect(usernameInput.value).toBe('');
      expect(passwordInput.value).toBe('');
      expect(confirmInput.value).toBe('');
    });
    
    it('should clear all error messages', () => {
      const form = new RegisterForm(container, authService);
      
      const usernameInput = container.querySelector('#register-username') as HTMLInputElement;
      usernameInput.value = '';
      usernameInput.dispatchEvent(new Event('blur'));
      
      form.reset();
      
      const usernameError = container.querySelector('#username-error');
      const passwordError = container.querySelector('#password-error');
      const confirmError = container.querySelector('#confirm-password-error');
      const formError = container.querySelector('.register-form__error');
      
      expect(usernameError?.textContent).toBe('');
      expect(passwordError?.textContent).toBe('');
      expect(confirmError?.textContent).toBe('');
      expect(formError?.textContent).toBe('');
    });
    
    it('should reset password strength indicator', () => {
      const form = new RegisterForm(container, authService);
      
      const passwordInput = container.querySelector('#register-password') as HTMLInputElement;
      passwordInput.value = 'StrongPass123!';
      passwordInput.dispatchEvent(new Event('input'));
      
      form.reset();
      
      const progressBar = container.querySelector('.password-strength__bar') as HTMLElement;
      expect(progressBar.style.width).toBe('0%');
      
      const requirements = container.querySelectorAll('.password-strength__requirement');
      requirements.forEach(req => {
        expect(req.classList.contains('password-strength__requirement--met')).toBe(false);
      });
    });
    
    it('should focus username input', () => {
      const form = new RegisterForm(container, authService);
      
      form.reset();
      
      const usernameInput = container.querySelector('#register-username') as HTMLInputElement;
      expect(document.activeElement).toBe(usernameInput);
    });
  });
  
  describe('accessibility', () => {
    it('should have proper ARIA labels for all inputs', () => {
      new RegisterForm(container, authService);
      
      const usernameLabel = container.querySelector('label[for="register-username"]');
      const passwordLabel = container.querySelector('label[for="register-password"]');
      const confirmLabel = container.querySelector('label[for="register-confirm-password"]');
      
      expect(usernameLabel?.textContent?.trim()).toBe('Username');
      expect(passwordLabel?.textContent?.trim()).toBe('Password');
      expect(confirmLabel?.textContent?.trim()).toBe('Confirm Password');
    });
    
    it('should set aria-invalid on inputs with errors', () => {
      new RegisterForm(container, authService);
      
      const usernameInput = container.querySelector('#register-username') as HTMLInputElement;
      usernameInput.value = '';
      usernameInput.dispatchEvent(new Event('blur'));
      
      expect(usernameInput.getAttribute('aria-invalid')).toBe('true');
    });
    
    it('should announce errors with role="alert" and aria-live', () => {
      new RegisterForm(container, authService);
      
      const usernameError = container.querySelector('#username-error');
      const passwordError = container.querySelector('#password-error');
      const confirmError = container.querySelector('#confirm-password-error');
      
      expect(usernameError?.getAttribute('role')).toBe('alert');
      expect(usernameError?.getAttribute('aria-live')).toBe('polite');
      
      expect(passwordError?.getAttribute('role')).toBe('alert');
      expect(passwordError?.getAttribute('aria-live')).toBe('polite');
      
      expect(confirmError?.getAttribute('role')).toBe('alert');
      expect(confirmError?.getAttribute('aria-live')).toBe('polite');
    });
    
    it('should have proper autocomplete attributes', () => {
      new RegisterForm(container, authService);
      
      const usernameInput = container.querySelector('#register-username') as HTMLInputElement;
      const passwordInput = container.querySelector('#register-password') as HTMLInputElement;
      const confirmInput = container.querySelector('#register-confirm-password') as HTMLInputElement;
      
      expect(usernameInput.autocomplete).toBe('username');
      expect(passwordInput.autocomplete).toBe('new-password');
      expect(confirmInput.autocomplete).toBe('new-password');
    });
    
    it('should have aria-describedby linking inputs to help text', () => {
      new RegisterForm(container, authService);
      
      const usernameInput = container.querySelector('#register-username') as HTMLInputElement;
      const passwordInput = container.querySelector('#register-password') as HTMLInputElement;
      
      expect(usernameInput.getAttribute('aria-describedby')).toContain('username-help');
      expect(passwordInput.getAttribute('aria-describedby')).toContain('password-help');
      expect(passwordInput.getAttribute('aria-describedby')).toContain('password-strength');
    });
    
    it('should have password strength indicator with proper ARIA', () => {
      new RegisterForm(container, authService);
      
      const strengthDiv = container.querySelector('#password-strength');
      const progressBar = container.querySelector('.password-strength__bar');
      const requirementsList = container.querySelector('.password-strength__requirements');
      
      expect(strengthDiv?.getAttribute('aria-live')).toBe('polite');
      expect(progressBar?.getAttribute('role')).toBe('progressbar');
      expect(requirementsList?.getAttribute('aria-label')).toBe('Password requirements');
    });
  });
  
  describe('destroy', () => {
    it('should clear container', () => {
      const form = new RegisterForm(container, authService);
      
      form.destroy();
      
      expect(container.innerHTML).toBe('');
    });
    
    it('should clear pending timeout', async () => {
      const form = new RegisterForm(container, authService);
      
      const isAvailableSpy = vi.spyOn(authService, 'isUsernameAvailable');
      
      const usernameInput = container.querySelector('#register-username') as HTMLInputElement;
      usernameInput.value = 'newuser';
      usernameInput.dispatchEvent(new Event('input'));
      
      // Destroy before debounce completes
      form.destroy();
      
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Should not have been called
      expect(isAvailableSpy).not.toHaveBeenCalled();
    });
  });
});
