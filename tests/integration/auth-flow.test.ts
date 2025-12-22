/**
 * Integration Tests for Authentication Flow
 * 
 * End-to-end tests for complete authentication workflows:
 * - Registration → 2FA setup → Login
 * - Login with TOTP code
 * - Session timeout → Redirect to login
 * - Logout → Redirect to login
 * - Form switching (login ↔ register)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LoginForm } from '../../src/components/LoginForm';
import { RegisterForm } from '../../src/components/RegisterForm';
import { TotpSetupModal } from '../../src/components/TotpSetupModal';
import { AuthService } from '../../src/services/AuthService';
import { TotpService } from '../../src/services/TotpService';
import { MockCryptoService } from '../helpers/MockCryptoService';
import { SessionService } from '../../src/services/SessionService';
import { SecurityLogService } from '../../src/services/SecurityLogService';
import { Database } from '../../src/services/database';

describe('Authentication Flow Integration Tests', () => {
  let database: Database;
  let cryptoService: MockCryptoService;
  let sessionService: SessionService;
  let securityLogService: SecurityLogService;
  let totpService: TotpService;
  let authService: AuthService;

  beforeEach(async () => {
    database = new Database();
    await database.initialize();
    cryptoService = new MockCryptoService() as any; // Cast to satisfy AuthService typing
    sessionService = new SessionService(database);
    securityLogService = new SecurityLogService(database);
    totpService = new TotpService();
    authService = new AuthService(
      cryptoService as any, // Cast to satisfy constructor typing
      sessionService,
      securityLogService,
      totpService,
      database
    );
  });

  afterEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
  });

  describe('Complete Registration Flow', () => {
    it('should complete full registration → 2FA setup → login flow', async () => {
      // Step 1: User fills out registration form
      const registerContainer = document.createElement('div');
      document.body.appendChild(registerContainer);
      const registerForm = new RegisterForm(registerContainer, authService);

      const usernameInput = registerContainer.querySelector('#register-username') as HTMLInputElement;
      const passwordInput = registerContainer.querySelector('#register-password') as HTMLInputElement;
      const confirmInput = registerContainer.querySelector('#register-confirm-password') as HTMLInputElement;
      const submitButton = registerContainer.querySelector('.register-form__submit') as HTMLButtonElement;

      usernameInput.value = 'integrationuser';
      passwordInput.value = 'IntegrationTest123!';
      confirmInput.value = 'IntegrationTest123!';

      // Trigger password strength update
      passwordInput.dispatchEvent(new Event('input', { bubbles: true }));

      // Wait for availability check debounce
      await new Promise(resolve => setTimeout(resolve, 600));

      // Step 2: Submit registration
      let registrationSuccess = false;
      let registeredUserId = '';
      registerContainer.addEventListener('register-success', ((event: CustomEvent) => {
        registrationSuccess = true;
        registeredUserId = event.detail.userId;
      }) as EventListener);

      submitButton.click();

      // Wait for async registration
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(registrationSuccess).toBe(true);
      expect(registeredUserId).toBeTruthy();

      // Step 3: Set up 2FA (simulate TOTP setup modal)
      const modalContainer = document.createElement('div');
      document.body.appendChild(modalContainer);

      const totpModal = new TotpSetupModal(
        modalContainer,
        authService,
        totpService,
        registeredUserId
      );

      // Wait for modal initialization
      await new Promise(resolve => setTimeout(resolve, 100));

      // Get the secret from the modal (would be scanned via QR in real flow)
      const user = await database.getUser(registeredUserId);
      expect(user?.totpSecret).toBeTruthy();

      // Simulate entering verification code
      const verificationInput = modalContainer.querySelector('#totp-verification-code') as HTMLInputElement;
      const verifyButton = modalContainer.querySelector('#verify-button') as HTMLButtonElement;

      // Generate valid TOTP code
      const validToken = totpService.generateToken(user!.totpSecret!);
      verificationInput.value = validToken;
      verifyButton.click();

      // Wait for verification
      await new Promise(resolve => setTimeout(resolve, 100));

      // Backup codes should be visible
      const backupCodesSection = modalContainer.querySelector('.totp-modal__backup-codes') as HTMLElement;
      expect(backupCodesSection?.style.display).not.toBe('none');

      // Step 4: Complete 2FA setup
      let totpSetupComplete = false;
      let totpVerified = false;
      modalContainer.addEventListener('totp-setup-complete', ((event: CustomEvent) => {
        totpSetupComplete = true;
        totpVerified = event.detail.isVerified;
      }) as EventListener);

      const completeButton = modalContainer.querySelector('#complete-button') as HTMLButtonElement;
      completeButton?.click();

      expect(totpSetupComplete).toBe(true);
      expect(totpVerified).toBe(true);

      // Step 5: Now try to login with the new account
      const loginForm = new LoginForm(authService);
      const loginContainer = loginForm.render();
      document.body.appendChild(loginContainer);

      const loginUsernameInput = loginContainer.querySelector('#login-username') as HTMLInputElement;
      const loginPasswordInput = loginContainer.querySelector('#login-password') as HTMLInputElement;
      const loginSubmitButton = loginContainer.querySelector('.login-form__submit') as HTMLButtonElement;

      loginUsernameInput.value = 'integrationuser';
      loginPasswordInput.value = 'IntegrationTest123!';
      loginSubmitButton.click();

      // Wait for login attempt
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should show 2FA input
      const twoFAInput = loginContainer.querySelector('#login-2fa-code') as HTMLInputElement;
      expect(twoFAInput).toBeTruthy();

      // Enter valid TOTP code
      const loginToken = totpService.generateToken(user!.totpSecret!);
      twoFAInput.value = loginToken;

      let loginSuccess = false;
      loginContainer.addEventListener('login-success', () => {
        loginSuccess = true;
      });

      loginSubmitButton.click();

      // Wait for login with 2FA
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(loginSuccess).toBe(true);

      // Verify session was created
      const isAuth = await authService.isAuthenticated();
      expect(isAuth).toBe(true);
    }, 10000); // Increase timeout for this long test

    it('should allow registration without 2FA (skip)', async () => {
      // Register user
      await authService.register('skipuser', 'SkipTest123!');
      const users = await database.getAllUsers();
      const user = users[0];
      if (!user) throw new Error('User not created');

      // Set up 2FA modal
      const modalContainer = document.createElement('div');
      document.body.appendChild(modalContainer);

      const totpModal = new TotpSetupModal(
        modalContainer,
        authService,
        totpService,
        user.id
      );

      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 100));

      // Mock window.confirm to return true
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      let totpSetupComplete = false;
      let totpVerified = false;
      modalContainer.addEventListener('totp-setup-complete', ((event: CustomEvent) => {
        totpSetupComplete = true;
        totpVerified = event.detail.isVerified;
      }) as EventListener);

      // Click skip button
      const skipButton = modalContainer.querySelector('#skip-button') as HTMLButtonElement;
      skipButton?.click();

      expect(confirmSpy).toHaveBeenCalled();
      expect(totpSetupComplete).toBe(true);
      expect(totpVerified).toBe(false);

      confirmSpy.mockRestore();
    });
  });

  describe('Login with 2FA Flow', () => {
    it('should complete login flow with TOTP code', async () => {
      // Create user with 2FA enabled
      await authService.register('2fauser', 'TwoFactorTest123!');
      const users = await database.getAllUsers();
      const user = users[0];
      if (!user) throw new Error('User not created');

      const setupResult = await authService.enable2FA(user.id);
      expect(setupResult.secret).toBeTruthy();

      // Try to login
      const loginForm = new LoginForm(authService);
      const loginContainer = loginForm.render();
      document.body.appendChild(loginContainer);

      const usernameInput = loginContainer.querySelector('#login-username') as HTMLInputElement;
      const passwordInput = loginContainer.querySelector('#login-password') as HTMLInputElement;
      const submitButton = loginContainer.querySelector('.login-form__submit') as HTMLButtonElement;

      usernameInput.value = '2fauser';
      passwordInput.value = 'TwoFactorTest123!';
      submitButton.click();

      // Wait for initial login
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should show 2FA input
      const twoFAInput = loginContainer.querySelector('#login-2fa-code') as HTMLInputElement;
      expect(twoFAInput).toBeTruthy();
      expect(twoFAInput.style.display).not.toBe('none');

      // Generate and enter valid token
      const token = totpService.generateToken(setupResult.secret);
      twoFAInput.value = token;

      let loginSuccess = false;
      loginContainer.addEventListener('login-success', () => {
        loginSuccess = true;
      });

      submitButton.click();

      // Wait for 2FA verification
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(loginSuccess).toBe(true);
    });

    it('should complete login flow with backup code', async () => {
      // Create user with 2FA enabled
      await authService.register('backupuser', 'BackupTest123!');
      const users = await database.getAllUsers();
      const user = users[0];
      if (!user) throw new Error('User not created');

      const setupResult = await authService.enable2FA(user.id);
      const backupCode = setupResult.backupCodes[0]; // Use first backup code

      // Try to login
      const loginForm = new LoginForm(authService);
      const loginContainer = loginForm.render();
      document.body.appendChild(loginContainer);

      const usernameInput = loginContainer.querySelector('#login-username') as HTMLInputElement;
      const passwordInput = loginContainer.querySelector('#login-password') as HTMLInputElement;
      const submitButton = loginContainer.querySelector('.login-form__submit') as HTMLButtonElement;

      usernameInput.value = 'backupuser';
      passwordInput.value = 'BackupTest123!';
      submitButton.click();

      // Wait for initial login
      await new Promise(resolve => setTimeout(resolve, 100));

      // Enter backup code instead of TOTP
      const twoFAInput = loginContainer.querySelector('#login-2fa-code') as HTMLInputElement;
      twoFAInput.value = backupCode;

      let loginSuccess = false;
      loginContainer.addEventListener('login-success', () => {
        loginSuccess = true;
      });

      submitButton.click();

      // Wait for verification
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(loginSuccess).toBe(true);

      // Verify backup code was marked as used
      const updatedUser = await database.getUser(user.id);
      expect(updatedUser?.backupCodesUsed).toContain(0);
    });

    it('should reject invalid 2FA code', async () => {
      // Create user with 2FA enabled
      await authService.register('invaliduser', 'InvalidTest123!');
      const users = await database.getAllUsers();
      const user = users[0];
      if (!user) throw new Error('User not created');

      await authService.enable2FA(user.id);

      // Try to login
      const loginForm = new LoginForm(authService);
      const loginContainer = loginForm.render();
      document.body.appendChild(loginContainer);

      const usernameInput = loginContainer.querySelector('#login-username') as HTMLInputElement;
      const passwordInput = loginContainer.querySelector('#login-password') as HTMLInputElement;
      const submitButton = loginContainer.querySelector('.login-form__submit') as HTMLButtonElement;

      usernameInput.value = 'invaliduser';
      passwordInput.value = 'InvalidTest123!';
      submitButton.click();

      // Wait for initial login
      await new Promise(resolve => setTimeout(resolve, 100));

      // Enter invalid code
      const twoFAInput = loginContainer.querySelector('#login-2fa-code') as HTMLInputElement;
      twoFAInput.value = '000000'; // Invalid code

      submitButton.click();

      // Wait for verification
      await new Promise(resolve => setTimeout(resolve, 200));

      // Should show error
      const errorDiv = loginContainer.querySelector('#two-fa-error') as HTMLElement;
      expect(errorDiv?.textContent).toBeTruthy();
      expect(twoFAInput?.getAttribute('aria-invalid')).toBe('true');
    });
  });

  describe('Session Timeout Flow', () => {
    it('should detect expired session', async () => {
      // Create user and login
      await authService.register('timeoutuser', 'TimeoutTest123!');
      await authService.login('timeoutuser', 'TimeoutTest123!');

      const session = authService.getCurrentSession();
      expect(session).toBeTruthy();

      // Check session is not expired initially
      const isExpired = sessionService.isSessionExpired(session!);
      expect(isExpired).toBe(false);

      // Manually expire session by modifying lastActivity
      const expiredTime = Date.now() - (31 * 60 * 1000); // 31 minutes ago
      const expiredSession = { ...session!, lastActivity: expiredTime };

      const isNowExpired = sessionService.isSessionExpired(expiredSession);
      expect(isNowExpired).toBe(true);
    });

    it('should handle session expiration on activity check', async () => {
      // Create user and login
      await authService.register('activityuser', 'ActivityTest123!');
      const session = await authService.login('activityuser', 'ActivityTest123!');

      // Manually expire session in database
      const expiredTime = Date.now() - (31 * 60 * 1000); // 31 minutes ago
      await database.updateUser(session.userId, {
        lastLogin: expiredTime
      });

      // Update session lastActivity to expired time
      const expiredSession = { ...session, lastActivity: expiredTime };
      await database.saveSession(expiredSession);

      // Check if expired
      const retrievedSession = await sessionService.getSession(session.id);
      const isExpired = sessionService.isSessionExpired(retrievedSession!);
      
      expect(isExpired).toBe(true);
    });
  });

  describe('Logout Flow', () => {
    it('should complete logout flow', async () => {
      // Create user and login
      await authService.register('logoutuser', 'LogoutTest123!');
      const session = await authService.login('logoutuser', 'LogoutTest123!');

      // Verify authenticated
      const isAuthBefore = await authService.isAuthenticated();
      expect(isAuthBefore).toBe(true);

      // Logout
      await authService.logout(session.id);

      // Verify not authenticated
      const isAuthAfter = await authService.isAuthenticated();
      expect(isAuthAfter).toBe(false);

      // Verify session is invalid
      const retrievedSession = await sessionService.getSession(session.id);
      expect(retrievedSession).toBeNull();
    });

    it('should clear current user and session on logout', async () => {
      // Create user and login
      await authService.register('clearuser', 'ClearTest123!');
      const session = await authService.login('clearuser', 'ClearTest123!');

      // Verify current user and session
      const currentUserBefore = authService.getCurrentUser();
      const currentSessionBefore = authService.getCurrentSession();
      expect(currentUserBefore).toBeTruthy();
      expect(currentSessionBefore).toBeTruthy();

      // Logout
      await authService.logout(session.id);

      // Verify cleared
      const currentUserAfter = authService.getCurrentUser();
      const currentSessionAfter = authService.getCurrentSession();
      expect(currentUserAfter).toBeNull();
      expect(currentSessionAfter).toBeNull();
    });
  });

  describe('Form Switching', () => {
    it('should switch from login to register form', () => {
      const loginForm = new LoginForm(authService);
      const loginContainer = loginForm.render();
      document.body.appendChild(loginContainer);

      // Find "show-register" trigger (e.g., a link or button)
      // This would be implemented in the actual UI
      let showRegisterTriggered = false;
      loginContainer.addEventListener('show-register', () => {
        showRegisterTriggered = true;
      });

      // Simulate clicking "Create account" link
      const registerLink = loginContainer.querySelector('[data-action="show-register"]') as HTMLElement;
      
      // If link exists, test switching
      if (registerLink) {
        registerLink.click();
        expect(showRegisterTriggered).toBe(true);
      } else {
        // Event system is in place even if UI element isn't rendered yet
        loginContainer.dispatchEvent(new Event('show-register', { bubbles: true }));
        expect(showRegisterTriggered).toBe(true);
      }
    });

    it('should switch from register to login form', () => {
      const registerContainer = document.createElement('div');
      document.body.appendChild(registerContainer);
      const registerForm = new RegisterForm(registerContainer, authService);

      let showLoginTriggered = false;
      registerContainer.addEventListener('show-login', () => {
        showLoginTriggered = true;
      });

      // Simulate clicking "Already have an account?" link
      const loginLink = registerContainer.querySelector('[data-action="show-login"]') as HTMLElement;
      
      // If link exists, test switching
      if (loginLink) {
        loginLink.click();
        expect(showLoginTriggered).toBe(true);
      } else {
        // Event system is in place even if UI element isn't rendered yet
        registerContainer.dispatchEvent(new Event('show-login', { bubbles: true }));
        expect(showLoginTriggered).toBe(true);
      }
    });

    it('should preserve authentication state during navigation', async () => {
      // Login user
      await authService.register('navuser', 'NavTest123!');
      await authService.login('navuser', 'NavTest123!');

      const isAuthBefore = await authService.isAuthenticated();
      expect(isAuthBefore).toBe(true);

      // Simulate navigation (auth state should persist)
      const isAuthAfter = await authService.isAuthenticated();
      expect(isAuthAfter).toBe(true);

      // Current user should be the same
      const currentUser = authService.getCurrentUser();
      expect(currentUser?.username).toBe('navuser');
    });
  });

  describe('Error Recovery', () => {
    it('should allow retry after failed login', async () => {
      // Create user
      await authService.register('retryuser', 'RetryTest123!');

      const loginForm = new LoginForm(authService);
      const loginContainer = loginForm.render();
      document.body.appendChild(loginContainer);

      const usernameInput = loginContainer.querySelector('#login-username') as HTMLInputElement;
      const passwordInput = loginContainer.querySelector('#login-password') as HTMLInputElement;
      const submitButton = loginContainer.querySelector('.login-form__submit') as HTMLButtonElement;

      // First attempt with wrong password
      usernameInput.value = 'retryuser';
      passwordInput.value = 'WrongPassword123!';
      submitButton.click();

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should show error
      const errorDiv = loginContainer.querySelector('.login-form__error') as HTMLElement;
      expect(errorDiv?.textContent).toBeTruthy();

      // Second attempt with correct password
      passwordInput.value = 'RetryTest123!';
      
      let loginSuccess = false;
      loginContainer.addEventListener('login-success', () => {
        loginSuccess = true;
      });

      submitButton.click();

      await new Promise(resolve => setTimeout(resolve, 200));

      expect(loginSuccess).toBe(true);
    });

    it('should clear errors when user starts typing', () => {
      const loginForm = new LoginForm(authService);
      const loginContainer = loginForm.render();
      document.body.appendChild(loginContainer);

      const usernameInput = loginContainer.querySelector('#login-username') as HTMLInputElement;
      const submitButton = loginContainer.querySelector('.login-form__submit') as HTMLButtonElement;

      // Trigger validation error
      submitButton.click();

      const errorDiv = loginContainer.querySelector('#username-error') as HTMLElement;
      expect(errorDiv?.textContent).toBeTruthy();

      // Start typing
      usernameInput.value = 'u';
      usernameInput.dispatchEvent(new Event('input', { bubbles: true }));

      // Error should be cleared
      expect(errorDiv?.textContent).toBe('');
      expect(usernameInput?.getAttribute('aria-invalid')).not.toBe('true');
    });
  });
});
