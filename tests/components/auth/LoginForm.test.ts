/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LoginForm } from '../../../src/components/LoginForm';
import { AuthService, AuthError } from '../../../src/services/AuthService';
import { CryptoService } from '../../../src/services/CryptoService';
import { SessionService } from '../../../src/services/SessionService';
import { SecurityLogService } from '../../../src/services/SecurityLogService';
import { TotpService } from '../../../src/services/TotpService';
import { Database } from '../../../src/services/database';

describe('LoginForm', () => {
  let authService: AuthService;
  let cryptoService: CryptoService;
  let sessionService: SessionService;
  let securityLog: SecurityLogService;
  let totpService: TotpService;
  let database: Database;
  let loginForm: LoginForm;

  const mockSession = {
    id: 'session-123',
    userId: 'user-123',
    sessionToken: 'token-abc123',
    createdAt: Date.now(),
    lastActivity: Date.now(),
    expiresAt: Date.now() + 1000 * 60 * 30,
    deviceInfo: 'test-device',
    ipAddress: '127.0.0.1'
  };

  beforeEach(async () => {
    database = new Database();
    await database.initialize();
    
    cryptoService = new CryptoService();
    sessionService = new SessionService(database);
    securityLog = new SecurityLogService(database);
    totpService = new TotpService();
    authService = new AuthService(cryptoService, sessionService, securityLog, totpService, database);
    loginForm = new LoginForm(authService);
    
    // Add form to document for testing
    document.body.innerHTML = '';
    document.body.appendChild(loginForm.render());
  });

  describe('constructor', () => {
    it('should create LoginForm with authService', () => {
      expect(loginForm).toBeInstanceOf(LoginForm);
    });

    it('should throw error if authService is not provided', () => {
      expect(() => new LoginForm(null as any)).toThrow('AuthService is required');
    });
  });

  describe('render', () => {
    it('should render login form with username input', () => {
      const usernameInput = document.querySelector('#login-username') as HTMLInputElement;
      expect(usernameInput).toBeTruthy();
      expect(usernameInput.type).toBe('text');
      expect(usernameInput.required).toBe(true);
      expect(usernameInput.getAttribute('aria-required')).toBe('true');
    });

    it('should render login form with password input', () => {
      const passwordInput = document.querySelector('#login-password') as HTMLInputElement;
      expect(passwordInput).toBeTruthy();
      expect(passwordInput.type).toBe('password');
      expect(passwordInput.required).toBe(true);
      expect(passwordInput.getAttribute('aria-required')).toBe('true');
    });

    it('should render 2FA code input (hidden initially)', () => {
      const totpCodeInput = document.querySelector('#login-totp-code') as HTMLInputElement;
      const totpCodeContainer = document.querySelector('.login-form__field--2fa') as HTMLElement;
      
      expect(totpCodeInput).toBeTruthy();
      expect(totpCodeInput.type).toBe('text');
      expect(totpCodeContainer.style.display).toBe('none');
    });

    it('should render submit button', () => {
      const submitButton = document.querySelector('.login-form__submit') as HTMLButtonElement;
      expect(submitButton).toBeTruthy();
      expect(submitButton.type).toBe('submit');
      expect(submitButton.textContent?.trim()).toBe('Sign In');
    });

    it('should render error container with proper ARIA attributes', () => {
      const errorContainer = document.querySelector('.login-form__error') as HTMLElement;
      expect(errorContainer).toBeTruthy();
      expect(errorContainer.getAttribute('role')).toBe('alert');
      expect(errorContainer.getAttribute('aria-live')).toBe('assertive');
    });

    it('should have proper form heading with id', () => {
      const heading = document.querySelector('#login-heading') as HTMLElement;
      const form = document.querySelector('.login-form') as HTMLElement;
      
      expect(heading).toBeTruthy();
      expect(heading.textContent).toBe('Sign In');
      expect(form.getAttribute('aria-labelledby')).toBe('login-heading');
    });
  });

  describe('validation', () => {
    it('should validate required username on blur', () => {
      const usernameInput = document.querySelector('#login-username') as HTMLInputElement;
      const usernameError = document.querySelector('#username-error') as HTMLElement;
      
      usernameInput.value = '';
      usernameInput.dispatchEvent(new Event('blur'));
      
      expect(usernameError.textContent).toBe('Username is required');
      expect(usernameInput.getAttribute('aria-invalid')).toBe('true');
    });

    it('should clear username error on input', () => {
      const usernameInput = document.querySelector('#login-username') as HTMLInputElement;
      const usernameError = document.querySelector('#username-error') as HTMLElement;
      
      usernameInput.value = '';
      usernameInput.dispatchEvent(new Event('blur'));
      expect(usernameError.textContent).toBe('Username is required');
      
      usernameInput.value = 'testuser';
      usernameInput.dispatchEvent(new Event('input'));
      
      expect(usernameError.textContent).toBe('');
      expect(usernameInput.getAttribute('aria-invalid')).toBeNull();
    });

    it('should validate required password on blur', () => {
      const passwordInput = document.querySelector('#login-password') as HTMLInputElement;
      const passwordError = document.querySelector('#password-error') as HTMLElement;
      
      passwordInput.value = '';
      passwordInput.dispatchEvent(new Event('blur'));
      
      expect(passwordError.textContent).toBe('Password is required');
      expect(passwordInput.getAttribute('aria-invalid')).toBe('true');
    });

    it('should clear password error on input', () => {
      const passwordInput = document.querySelector('#login-password') as HTMLInputElement;
      const passwordError = document.querySelector('#password-error') as HTMLElement;
      
      passwordInput.value = '';
      passwordInput.dispatchEvent(new Event('blur'));
      expect(passwordError.textContent).toBe('Password is required');
      
      passwordInput.value = 'password123';
      passwordInput.dispatchEvent(new Event('input'));
      
      expect(passwordError.textContent).toBe('');
      expect(passwordInput.getAttribute('aria-invalid')).toBeNull();
    });
  });

  describe('form submission', () => {
    it('should prevent submission with empty fields', async () => {
      const form = document.querySelector('.login-form') as HTMLFormElement;
      const usernameError = document.querySelector('#username-error') as HTMLElement;
      const passwordError = document.querySelector('#password-error') as HTMLElement;
      
      form.dispatchEvent(new Event('submit'));
      
      expect(usernameError.textContent).toBe('Username is required');
      expect(passwordError.textContent).toBe('Password is required');
    });

    it('should call authService.login with valid credentials', async () => {
      const loginSpy = vi.spyOn(authService, 'login').mockResolvedValue(mockSession);
      
      const usernameInput = document.querySelector('#login-username') as HTMLInputElement;
      const passwordInput = document.querySelector('#login-password') as HTMLInputElement;
      const form = document.querySelector('.login-form') as HTMLFormElement;
      
      usernameInput.value = 'testuser';
      passwordInput.value = 'password123';
      
      form.dispatchEvent(new Event('submit'));
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(loginSpy).toHaveBeenCalledWith('testuser', 'password123', undefined);
    });

    it('should disable form during submission', async () => {
      vi.spyOn(authService, 'login').mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      const usernameInput = document.querySelector('#login-username') as HTMLInputElement;
      const passwordInput = document.querySelector('#login-password') as HTMLInputElement;
      const submitButton = document.querySelector('.login-form__submit') as HTMLButtonElement;
      const form = document.querySelector('.login-form') as HTMLFormElement;
      
      usernameInput.value = 'testuser';
      passwordInput.value = 'password123';
      
      form.dispatchEvent(new Event('submit'));
      
      // Check immediately after submit
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(submitButton.disabled).toBe(true);
      expect(submitButton.textContent).toBe('Signing in...');
      expect(usernameInput.disabled).toBe(true);
      expect(passwordInput.disabled).toBe(true);
    });

    it('should dispatch login-success event on successful login', async () => {
      vi.spyOn(authService, 'login').mockResolvedValue(mockSession);
      
      let eventFired = false;
      let eventDetail: any = null;
      
      document.body.addEventListener('login-success', ((e: CustomEvent) => {
        eventFired = true;
        eventDetail = e.detail;
      }) as EventListener);
      
      const usernameInput = document.querySelector('#login-username') as HTMLInputElement;
      const passwordInput = document.querySelector('#login-password') as HTMLInputElement;
      const form = document.querySelector('.login-form') as HTMLFormElement;
      
      usernameInput.value = 'testuser';
      passwordInput.value = 'password123';
      
      form.dispatchEvent(new Event('submit'));
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(eventFired).toBe(true);
      expect(eventDetail).toEqual({ username: 'testuser' });
    });
  });

  describe('2FA handling', () => {
    it('should show 2FA input when 2FA_REQUIRED error occurs', async () => {
      vi.spyOn(authService, 'login').mockRejectedValue(new AuthError('2FA_REQUIRED'));
      
      const usernameInput = document.querySelector('#login-username') as HTMLInputElement;
      const passwordInput = document.querySelector('#login-password') as HTMLInputElement;
      const totpCodeContainer = document.querySelector('.login-form__field--2fa') as HTMLElement;
      const form = document.querySelector('.login-form') as HTMLFormElement;
      
      usernameInput.value = 'testuser';
      passwordInput.value = 'password123';
      
      form.dispatchEvent(new Event('submit'));
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(totpCodeContainer.style.display).toBe('block');
    });

    it('should include 2FA code in login call when provided', async () => {
      const loginSpy = vi.spyOn(authService, 'login')
        .mockRejectedValueOnce(new AuthError('2FA_REQUIRED'))
        .mockResolvedValueOnce(mockSession);
      
      const usernameInput = document.querySelector('#login-username') as HTMLInputElement;
      const passwordInput = document.querySelector('#login-password') as HTMLInputElement;
      const totpCodeInput = document.querySelector('#login-totp-code') as HTMLInputElement;
      const form = document.querySelector('.login-form') as HTMLFormElement;
      
      // First submission without 2FA
      usernameInput.value = 'testuser';
      passwordInput.value = 'password123';
      form.dispatchEvent(new Event('submit'));
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Second submission with 2FA
      totpCodeInput.value = '123456';
      form.dispatchEvent(new Event('submit'));
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(loginSpy).toHaveBeenLastCalledWith('testuser', 'password123', '123456');
    });

    it('should validate 2FA code format (6 digits)', async () => {
      vi.spyOn(authService, 'login').mockRejectedValue(new AuthError('2FA_REQUIRED'));
      
      const usernameInput = document.querySelector('#login-username') as HTMLInputElement;
      const passwordInput = document.querySelector('#login-password') as HTMLInputElement;
      const totpCodeInput = document.querySelector('#login-totp-code') as HTMLInputElement;
      const totpCodeError = document.querySelector('#totp-code-error') as HTMLElement;
      const form = document.querySelector('.login-form') as HTMLFormElement;
      
      // First submission to show 2FA input
      usernameInput.value = 'testuser';
      passwordInput.value = 'password123';
      form.dispatchEvent(new Event('submit'));
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Try with invalid code
      totpCodeInput.value = '12345'; // Only 5 digits
      totpCodeInput.dispatchEvent(new Event('blur'));
      
      expect(totpCodeError.textContent).toBe('Invalid code format');
    });

    it('should accept 8-character backup codes', async () => {
      vi.spyOn(authService, 'login').mockRejectedValue(new AuthError('2FA_REQUIRED'));
      
      const usernameInput = document.querySelector('#login-username') as HTMLInputElement;
      const passwordInput = document.querySelector('#login-password') as HTMLInputElement;
      const totpCodeInput = document.querySelector('#login-totp-code') as HTMLInputElement;
      const totpCodeError = document.querySelector('#totp-code-error') as HTMLElement;
      const form = document.querySelector('.login-form') as HTMLFormElement;
      
      // First submission to show 2FA input
      usernameInput.value = 'testuser';
      passwordInput.value = 'password123';
      form.dispatchEvent(new Event('submit'));
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Try with valid backup code
      totpCodeInput.value = 'ABC12345';
      totpCodeInput.dispatchEvent(new Event('blur'));
      
      expect(totpCodeError.textContent).toBe('');
    });

    it('should convert 2FA code to uppercase', async () => {
      const loginSpy = vi.spyOn(authService, 'login')
        .mockRejectedValueOnce(new AuthError('2FA_REQUIRED'))
        .mockResolvedValueOnce(mockSession);
      
      const usernameInput = document.querySelector('#login-username') as HTMLInputElement;
      const passwordInput = document.querySelector('#login-password') as HTMLInputElement;
      const totpCodeInput = document.querySelector('#login-totp-code') as HTMLInputElement;
      const form = document.querySelector('.login-form') as HTMLFormElement;
      
      // First submission
      usernameInput.value = 'testuser';
      passwordInput.value = 'password123';
      form.dispatchEvent(new Event('submit'));
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Second submission with lowercase backup code
      totpCodeInput.value = 'abc12345';
      form.dispatchEvent(new Event('submit'));
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Should be converted to uppercase
      expect(loginSpy).toHaveBeenLastCalledWith('testuser', 'password123', 'ABC12345');
    });
  });

  describe('error handling', () => {
    it('should display invalid credentials error', async () => {
      vi.spyOn(authService, 'login').mockRejectedValue(new AuthError('Invalid credentials'));
      
      const usernameInput = document.querySelector('#login-username') as HTMLInputElement;
      const passwordInput = document.querySelector('#login-password') as HTMLInputElement;
      const errorContainer = document.querySelector('.login-form__error') as HTMLElement;
      const form = document.querySelector('.login-form') as HTMLFormElement;
      
      usernameInput.value = 'testuser';
      passwordInput.value = 'wrongpassword';
      
      form.dispatchEvent(new Event('submit'));
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(errorContainer.textContent).toBe('Invalid username or password. Please try again.');
      expect(errorContainer.style.display).toBe('block');
    });

    it('should display account locked error', async () => {
      vi.spyOn(authService, 'login').mockRejectedValue(
        new AuthError('Account is locked until 2024-01-01T00:00:00.000Z')
      );
      
      const usernameInput = document.querySelector('#login-username') as HTMLInputElement;
      const passwordInput = document.querySelector('#login-password') as HTMLInputElement;
      const errorContainer = document.querySelector('.login-form__error') as HTMLElement;
      const form = document.querySelector('.login-form') as HTMLFormElement;
      
      usernameInput.value = 'testuser';
      passwordInput.value = 'password123';
      
      form.dispatchEvent(new Event('submit'));
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(errorContainer.textContent).toContain('account is temporarily locked');
    });

    it('should display invalid 2FA code error', async () => {
      vi.spyOn(authService, 'login').mockRejectedValue(new AuthError('Invalid 2FA code'));
      
      const usernameInput = document.querySelector('#login-username') as HTMLInputElement;
      const passwordInput = document.querySelector('#login-password') as HTMLInputElement;
      const totpCodeInput = document.querySelector('#login-totp-code') as HTMLInputElement;
      const totpCodeError = document.querySelector('#totp-code-error') as HTMLElement;
      const form = document.querySelector('.login-form') as HTMLFormElement;
      
      usernameInput.value = 'testuser';
      passwordInput.value = 'password123';
      totpCodeInput.value = '123456';
      
      // Manually show 2FA input (simulating previous 2FA_REQUIRED error)
      const totpCodeContainer = document.querySelector('.login-form__field--2fa') as HTMLElement;
      totpCodeContainer.style.display = 'block';
      
      form.dispatchEvent(new Event('submit'));
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(totpCodeError.textContent).toBe('Invalid 2FA code. Please try again.');
    });

    it('should handle generic errors', async () => {
      vi.spyOn(authService, 'login').mockRejectedValue(new Error('Network error'));
      
      const usernameInput = document.querySelector('#login-username') as HTMLInputElement;
      const passwordInput = document.querySelector('#login-password') as HTMLInputElement;
      const errorContainer = document.querySelector('.login-form__error') as HTMLElement;
      const form = document.querySelector('.login-form') as HTMLFormElement;
      
      usernameInput.value = 'testuser';
      passwordInput.value = 'password123';
      
      form.dispatchEvent(new Event('submit'));
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(errorContainer.textContent).toBe('An unexpected error occurred. Please try again.');
    });
  });

  describe('reset', () => {
    it('should reset form to initial state', async () => {
      const usernameInput = document.querySelector('#login-username') as HTMLInputElement;
      const passwordInput = document.querySelector('#login-password') as HTMLInputElement;
      const totpCodeInput = document.querySelector('#login-totp-code') as HTMLInputElement;
      const totpCodeContainer = document.querySelector('.login-form__field--2fa') as HTMLElement;
      const errorContainer = document.querySelector('.login-form__error') as HTMLElement;
      
      // Set some values
      usernameInput.value = 'testuser';
      passwordInput.value = 'password123';
      totpCodeInput.value = '123456';
      totpCodeContainer.style.display = 'block';
      errorContainer.textContent = 'Some error';
      errorContainer.style.display = 'block';
      
      // Reset form
      loginForm.reset();
      
      expect(usernameInput.value).toBe('');
      expect(passwordInput.value).toBe('');
      expect(totpCodeInput.value).toBe('');
      expect(totpCodeContainer.style.display).toBe('none');
      expect(errorContainer.textContent).toBe('');
      expect(errorContainer.style.display).toBe('none');
    });

    it('should focus on username input after reset', () => {
      const usernameInput = document.querySelector('#login-username') as HTMLInputElement;
      const focusSpy = vi.spyOn(usernameInput, 'focus');
      
      loginForm.reset();
      
      expect(focusSpy).toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels on inputs', () => {
      const usernameInput = document.querySelector('#login-username') as HTMLInputElement;
      const passwordInput = document.querySelector('#login-password') as HTMLInputElement;
      
      expect(usernameInput.getAttribute('aria-required')).toBe('true');
      expect(usernameInput.getAttribute('aria-describedby')).toBe('username-error');
      
      expect(passwordInput.getAttribute('aria-required')).toBe('true');
      expect(passwordInput.getAttribute('aria-describedby')).toBe('password-error');
    });

    it('should set aria-invalid on validation error', () => {
      const usernameInput = document.querySelector('#login-username') as HTMLInputElement;
      
      usernameInput.value = '';
      usernameInput.dispatchEvent(new Event('blur'));
      
      expect(usernameInput.getAttribute('aria-invalid')).toBe('true');
    });

    it('should have role="alert" on error containers', () => {
      const usernameError = document.querySelector('#username-error') as HTMLElement;
      const passwordError = document.querySelector('#password-error') as HTMLElement;
      const formError = document.querySelector('.login-form__error') as HTMLElement;
      
      expect(usernameError.getAttribute('role')).toBe('alert');
      expect(passwordError.getAttribute('role')).toBe('alert');
      expect(formError.getAttribute('role')).toBe('alert');
    });

    it('should have aria-live="polite" on field errors', () => {
      const usernameError = document.querySelector('#username-error') as HTMLElement;
      const passwordError = document.querySelector('#password-error') as HTMLElement;
      
      expect(usernameError.getAttribute('aria-live')).toBe('polite');
      expect(passwordError.getAttribute('aria-live')).toBe('polite');
    });

    it('should have aria-live="assertive" on form error', () => {
      const formError = document.querySelector('.login-form__error') as HTMLElement;
      
      expect(formError.getAttribute('aria-live')).toBe('assertive');
    });

    it('should have proper autocomplete attributes', () => {
      const usernameInput = document.querySelector('#login-username') as HTMLInputElement;
      const passwordInput = document.querySelector('#login-password') as HTMLInputElement;
      const totpCodeInput = document.querySelector('#login-totp-code') as HTMLInputElement;
      
      expect(usernameInput.getAttribute('autocomplete')).toBe('username');
      expect(passwordInput.getAttribute('autocomplete')).toBe('current-password');
      expect(totpCodeInput.getAttribute('autocomplete')).toBe('one-time-code');
    });
  });

  describe('destroy', () => {
    it('should clear container content', () => {
      const container = loginForm.render();
      expect(container.innerHTML).not.toBe('');
      
      loginForm.destroy();
      
      expect(container.innerHTML).toBe('');
    });
  });
});
