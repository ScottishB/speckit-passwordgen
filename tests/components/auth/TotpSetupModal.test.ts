import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TotpSetupModal } from '../../../src/components/TotpSetupModal';
import { AuthService } from '../../../src/services/AuthService';
import { TotpService } from '../../../src/services/TotpService';
import { CryptoService } from '../../../src/services/CryptoService';
import { SessionService } from '../../../src/services/SessionService';
import { SecurityLogService } from '../../../src/services/SecurityLogService';
import { Database } from '../../../src/services/Database';

describe('TotpSetupModal', () => {
  let container: HTMLElement;
  let database: Database;
  let cryptoService: CryptoService;
  let sessionService: SessionService;
  let securityLogService: SecurityLogService;
  let totpService: TotpService;
  let authService: AuthService;
  const testUserId = 'user-123';
  const testSecret = 'JBSWY3DPEHPK3PXP';
  const testQrCode = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const testBackupCodes = ['AAAABBBB', 'CCCCDDDD', 'EEEEFFFF', 'GGGGHHHH', 'IIIIJJJJ', 'KKKKLLLL', 'MMMMNNNN', 'OOOOPPPP'];

  beforeEach(async () => {
    // Create container
    container = document.createElement('div');
    document.body.appendChild(container);

    // Create services
    database = new Database();
    await database.initialize();

    cryptoService = new CryptoService();
    sessionService = new SessionService(database);
    securityLogService = new SecurityLogService(database);
    totpService = new TotpService();
    authService = new AuthService(cryptoService, sessionService, securityLogService, totpService, database);

    // Mock enable2FA to return test data
    vi.spyOn(authService, 'enable2FA').mockResolvedValue({
      secret: testSecret,
      qrCode: testQrCode,
      backupCodes: testBackupCodes,
    });

    // Mock totpService.validateToken
    vi.spyOn(totpService, 'validateToken').mockReturnValue(true);
  });

  afterEach(() => {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create TotpSetupModal instance', () => {
      const modal = new TotpSetupModal(container, authService, totpService, testUserId);
      expect(modal).toBeInstanceOf(TotpSetupModal);
    });

    it('should throw error if container is null', () => {
      expect(() => new TotpSetupModal(null as any, authService, totpService, testUserId))
        .toThrow('Container is required');
    });

    it('should throw error if authService is null', () => {
      expect(() => new TotpSetupModal(container, null as any, totpService, testUserId))
        .toThrow('AuthService is required');
    });

    it('should throw error if totpService is null', () => {
      expect(() => new TotpSetupModal(container, authService, null as any, testUserId))
        .toThrow('TotpService is required');
    });

    it('should throw error if userId is null', () => {
      expect(() => new TotpSetupModal(container, authService, totpService, '' as any))
        .toThrow('User ID is required');
    });
  });

  describe('render', () => {
    it('should render modal overlay', () => {
      new TotpSetupModal(container, authService, totpService, testUserId);
      
      const overlay = container.querySelector('.totp-modal-overlay');
      expect(overlay).toBeTruthy();
      expect(overlay?.getAttribute('role')).toBe('presentation');
    });

    it('should render modal dialog with proper ARIA', () => {
      new TotpSetupModal(container, authService, totpService, testUserId);
      
      const modal = container.querySelector('.totp-modal');
      expect(modal).toBeTruthy();
      expect(modal?.getAttribute('role')).toBe('dialog');
      expect(modal?.getAttribute('aria-modal')).toBe('true');
      expect(modal?.getAttribute('aria-labelledby')).toBe('totp-modal-title');
    });

    it('should render modal title', () => {
      new TotpSetupModal(container, authService, totpService, testUserId);
      
      const title = container.querySelector('#totp-modal-title');
      expect(title?.textContent).toBe('Set Up Two-Factor Authentication');
    });

    it('should render QR code container', () => {
      new TotpSetupModal(container, authService, totpService, testUserId);
      
      const qrContainer = container.querySelector('#qr-container');
      expect(qrContainer).toBeTruthy();
      
      const qrImage = container.querySelector('#qr-code-image');
      expect(qrImage).toBeTruthy();
      expect(qrImage?.getAttribute('alt')).toBe('QR code for two-factor authentication setup');
    });

    it('should render manual entry section', () => {
      new TotpSetupModal(container, authService, totpService, testUserId);
      
      const manualEntry = container.querySelector('.totp-modal__manual-entry');
      expect(manualEntry).toBeTruthy();
      
      const secretCode = container.querySelector('#manual-secret');
      expect(secretCode).toBeTruthy();
    });

    it('should render verification input with proper attributes', () => {
      new TotpSetupModal(container, authService, totpService, testUserId);
      
      const input = container.querySelector('#totp-verification-code') as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input.type).toBe('text');
      expect(input.pattern).toBe('\\d{6}');
      expect(input.maxLength).toBe(6);
      expect(input.getAttribute('inputmode')).toBe('numeric');
      expect(input.getAttribute('autocomplete')).toBe('one-time-code');
      expect(input.getAttribute('aria-required')).toBe('true');
    });

    it('should render backup codes section (initially hidden)', () => {
      new TotpSetupModal(container, authService, totpService, testUserId);
      
      const backupSection = container.querySelector('#backup-section') as HTMLElement;
      expect(backupSection).toBeTruthy();
      expect(backupSection.style.display).toBe('none');
    });

    it('should render action buttons', () => {
      new TotpSetupModal(container, authService, totpService, testUserId);
      
      const verifyButton = container.querySelector('#verify-button');
      expect(verifyButton?.textContent?.trim()).toBe('Verify Code');
      
      const skipButton = container.querySelector('#skip-button');
      expect(skipButton?.textContent).toContain('Skip');
      
      const completeButton = container.querySelector('#complete-button');
      expect(completeButton).toBeTruthy();
    });
  });

  describe('initialization', () => {
    it('should call authService.enable2FA with userId', async () => {
      new TotpSetupModal(container, authService, totpService, testUserId);
      
      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(authService.enable2FA).toHaveBeenCalledWith(testUserId);
    });

    it('should display QR code after initialization', async () => {
      new TotpSetupModal(container, authService, totpService, testUserId);
      
      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const qrImage = container.querySelector('#qr-code-image') as HTMLImageElement;
      const qrLoading = container.querySelector('#qr-loading') as HTMLElement;
      
      expect(qrImage.src).toBe(testQrCode);
      expect(qrImage.style.display).toBe('block');
      expect(qrLoading.style.display).toBe('none');
    });

    it('should display manual entry secret', async () => {
      new TotpSetupModal(container, authService, totpService, testUserId);
      
      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const secretCode = container.querySelector('#manual-secret');
      expect(secretCode?.textContent).toBe(testSecret);
    });

    it('should focus verification input after initialization', async () => {
      new TotpSetupModal(container, authService, totpService, testUserId);
      
      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const input = container.querySelector('#totp-verification-code') as HTMLInputElement;
      expect(document.activeElement).toBe(input);
    });

    it('should handle initialization error', async () => {
      vi.spyOn(authService, 'enable2FA').mockRejectedValue(new Error('Setup failed'));
      vi.spyOn(console, 'error').mockImplementation(() => {});
      
      new TotpSetupModal(container, authService, totpService, testUserId);
      
      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const errorDiv = container.querySelector('.totp-modal__error');
      expect(errorDiv?.textContent).toContain('Failed to initialize');
    });
  });

  describe('verification input', () => {
    it('should clear error when user types', async () => {
      new TotpSetupModal(container, authService, totpService, testUserId);
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const input = container.querySelector('#totp-verification-code') as HTMLInputElement;
      const errorDiv = container.querySelector('#verification-error') as HTMLElement;
      
      // Show error first
      errorDiv.textContent = 'Invalid code';
      errorDiv.style.display = 'block';
      input.classList.add('totp-modal__input--error');
      
      // Type in input
      input.value = '1';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      
      expect(errorDiv.textContent).toBe('');
      expect(errorDiv.style.display).toBe('none');
      expect(input.classList.contains('totp-modal__input--error')).toBe(false);
    });

    it('should auto-verify when 6 digits entered', async () => {
      new TotpSetupModal(container, authService, totpService, testUserId);
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const input = container.querySelector('#totp-verification-code') as HTMLInputElement;
      
      input.value = '123456';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(totpService.validateToken).toHaveBeenCalledWith('123456', testSecret);
    });

    it('should verify on Enter key press', async () => {
      new TotpSetupModal(container, authService, totpService, testUserId);
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const input = container.querySelector('#totp-verification-code') as HTMLInputElement;
      
      input.value = '123456';
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
      input.dispatchEvent(enterEvent);
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(totpService.validateToken).toHaveBeenCalledWith('123456', testSecret);
    });
  });

  describe('verification', () => {
    it('should show error for empty code', async () => {
      new TotpSetupModal(container, authService, totpService, testUserId);
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const verifyButton = container.querySelector('#verify-button') as HTMLButtonElement;
      verifyButton.click();
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const errorDiv = container.querySelector('#verification-error');
      expect(errorDiv?.textContent).toBe('Please enter the 6-digit code');
    });

    it('should show error for invalid format', async () => {
      new TotpSetupModal(container, authService, totpService, testUserId);
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const input = container.querySelector('#totp-verification-code') as HTMLInputElement;
      const verifyButton = container.querySelector('#verify-button') as HTMLButtonElement;
      
      input.value = '123';
      verifyButton.click();
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const errorDiv = container.querySelector('#verification-error');
      expect(errorDiv?.textContent).toBe('Code must be 6 digits');
    });

    it('should show error for invalid code', async () => {
      vi.spyOn(totpService, 'validateToken').mockReturnValue(false);
      
      new TotpSetupModal(container, authService, totpService, testUserId);
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const input = container.querySelector('#totp-verification-code') as HTMLInputElement;
      const verifyButton = container.querySelector('#verify-button') as HTMLButtonElement;
      
      input.value = '123456';
      verifyButton.click();
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const errorDiv = container.querySelector('#verification-error');
      expect(errorDiv?.textContent).toBe('Invalid code. Please try again.');
    });

    it('should clear input and refocus after invalid code', async () => {
      vi.spyOn(totpService, 'validateToken').mockReturnValue(false);
      
      new TotpSetupModal(container, authService, totpService, testUserId);
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const input = container.querySelector('#totp-verification-code') as HTMLInputElement;
      const verifyButton = container.querySelector('#verify-button') as HTMLButtonElement;
      
      input.value = '123456';
      verifyButton.click();
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(input.value).toBe('');
      expect(document.activeElement).toBe(input);
    });

    it('should show backup codes after successful verification', async () => {
      new TotpSetupModal(container, authService, totpService, testUserId);
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const input = container.querySelector('#totp-verification-code') as HTMLInputElement;
      input.value = '123456';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const backupSection = container.querySelector('#backup-section') as HTMLElement;
      expect(backupSection.style.display).toBe('block');
      
      const setupSection = container.querySelector('#setup-section') as HTMLElement;
      expect(setupSection.style.display).toBe('none');
    });
  });

  describe('backup codes', () => {
    beforeEach(async () => {
      new TotpSetupModal(container, authService, totpService, testUserId);
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const input = container.querySelector('#totp-verification-code') as HTMLInputElement;
      input.value = '123456';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    it('should display all backup codes', () => {
      const backupCodeElements = container.querySelectorAll('.totp-modal__backup-code');
      expect(backupCodeElements.length).toBe(8);
      
      backupCodeElements.forEach((el, index) => {
        const codeValue = el.querySelector('.totp-modal__backup-code-value');
        expect(codeValue?.textContent).toBe(testBackupCodes[index]);
      });
    });

    it('should display code numbers', () => {
      const backupCodeElements = container.querySelectorAll('.totp-modal__backup-code');
      
      backupCodeElements.forEach((el, index) => {
        const codeNumber = el.querySelector('.totp-modal__backup-code-number');
        expect(codeNumber?.textContent).toBe(`${index + 1}.`);
      });
    });

    it('should hide verify and skip buttons', () => {
      const verifyButton = container.querySelector('#verify-button') as HTMLButtonElement;
      const skipButton = container.querySelector('#skip-button') as HTMLButtonElement;
      
      expect(verifyButton.style.display).toBe('none');
      expect(skipButton.style.display).toBe('none');
    });

    it('should show complete button', () => {
      const completeButton = container.querySelector('#complete-button') as HTMLButtonElement;
      
      expect(completeButton.style.display).toBe('block');
      expect(document.activeElement).toBe(completeButton);
    });
  });

  describe('copy backup codes', () => {
    beforeEach(async () => {
      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
      });
      
      new TotpSetupModal(container, authService, totpService, testUserId);
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const input = container.querySelector('#totp-verification-code') as HTMLInputElement;
      input.value = '123456';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    it('should copy all backup codes to clipboard', async () => {
      const copyButton = container.querySelector('#copy-codes-button') as HTMLButtonElement;
      copyButton.click();
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const expectedText = testBackupCodes
        .map((code, index) => `${index + 1}. ${code}`)
        .join('\n');
      
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expectedText);
    });

    it('should show visual feedback after copy', async () => {
      const copyButton = container.querySelector('#copy-codes-button') as HTMLButtonElement;
      const originalText = copyButton.textContent;
      
      copyButton.click();
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(copyButton.textContent).toBe('Copied!');
      expect(copyButton.disabled).toBe(true);
      
      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 2100));
      
      expect(copyButton.textContent).toBe(originalText);
      expect(copyButton.disabled).toBe(false);
    });

    it('should handle clipboard error', async () => {
      vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('Clipboard error'));
      vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const copyButton = container.querySelector('#copy-codes-button') as HTMLButtonElement;
      copyButton.click();
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const errorDiv = container.querySelector('.totp-modal__error');
      expect(errorDiv?.textContent).toContain('Failed to copy');
    });
  });

  describe('print backup codes', () => {
    beforeEach(async () => {
      // Mock window.print
      window.print = vi.fn();
      
      new TotpSetupModal(container, authService, totpService, testUserId);
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const input = container.querySelector('#totp-verification-code') as HTMLInputElement;
      input.value = '123456';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    it('should call window.print when print button clicked', () => {
      const printButton = container.querySelector('#print-codes-button') as HTMLButtonElement;
      printButton.click();
      
      expect(window.print).toHaveBeenCalled();
    });
  });

  describe('skip button', () => {
    beforeEach(() => {
      // Mock window.confirm
      window.confirm = vi.fn().mockReturnValue(true);
    });

    it('should show confirmation dialog', async () => {
      new TotpSetupModal(container, authService, totpService, testUserId);
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const skipButton = container.querySelector('#skip-button') as HTMLButtonElement;
      skipButton.click();
      
      expect(window.confirm).toHaveBeenCalledWith(
        expect.stringContaining('Are you sure you want to skip')
      );
    });

    it('should close modal if confirmed', async () => {
      const eventSpy = vi.fn();
      
      new TotpSetupModal(container, authService, totpService, testUserId);
      await new Promise(resolve => setTimeout(resolve, 10));
      
      container.addEventListener('totp-setup-complete', eventSpy);
      
      const skipButton = container.querySelector('#skip-button') as HTMLButtonElement;
      skipButton.click();
      
      expect(eventSpy).toHaveBeenCalled();
      expect(eventSpy.mock.calls[0][0].detail.isVerified).toBe(false);
    });

    it('should not close modal if cancelled', async () => {
      window.confirm = vi.fn().mockReturnValue(false);
      const eventSpy = vi.fn();
      
      new TotpSetupModal(container, authService, totpService, testUserId);
      await new Promise(resolve => setTimeout(resolve, 10));
      
      container.addEventListener('totp-setup-complete', eventSpy);
      
      const skipButton = container.querySelector('#skip-button') as HTMLButtonElement;
      skipButton.click();
      
      expect(eventSpy).not.toHaveBeenCalled();
    });
  });

  describe('close modal', () => {
    it('should dispatch completion event on close', async () => {
      const eventSpy = vi.fn();
      
      new TotpSetupModal(container, authService, totpService, testUserId);
      await new Promise(resolve => setTimeout(resolve, 10));
      
      container.addEventListener('totp-setup-complete', eventSpy);
      
      // Verify and complete
      const input = container.querySelector('#totp-verification-code') as HTMLInputElement;
      input.value = '123456';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const completeButton = container.querySelector('#complete-button') as HTMLButtonElement;
      completeButton.click();
      
      expect(eventSpy).toHaveBeenCalled();
      expect(eventSpy.mock.calls[0][0].detail.isVerified).toBe(true);
    });

    it('should close modal on Escape key after verification', async () => {
      const eventSpy = vi.fn();
      
      new TotpSetupModal(container, authService, totpService, testUserId);
      await new Promise(resolve => setTimeout(resolve, 10));
      
      container.addEventListener('totp-setup-complete', eventSpy);
      
      // Verify first
      const input = container.querySelector('#totp-verification-code') as HTMLInputElement;
      input.value = '123456';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Press Escape
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      document.dispatchEvent(escapeEvent);
      
      expect(eventSpy).toHaveBeenCalled();
    });

    it('should not close on Escape before verification', async () => {
      const eventSpy = vi.fn();
      
      new TotpSetupModal(container, authService, totpService, testUserId);
      await new Promise(resolve => setTimeout(resolve, 10));
      
      container.addEventListener('totp-setup-complete', eventSpy);
      
      // Press Escape without verifying
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      document.dispatchEvent(escapeEvent);
      
      expect(eventSpy).not.toHaveBeenCalled();
    });

    it('should close on overlay click after verification', async () => {
      const eventSpy = vi.fn();
      
      new TotpSetupModal(container, authService, totpService, testUserId);
      await new Promise(resolve => setTimeout(resolve, 10));
      
      container.addEventListener('totp-setup-complete', eventSpy);
      
      // Verify first
      const input = container.querySelector('#totp-verification-code') as HTMLInputElement;
      input.value = '123456';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Click overlay
      const overlay = container.querySelector('.totp-modal-overlay') as HTMLElement;
      const clickEvent = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(clickEvent, 'target', { value: overlay, writable: false });
      overlay.dispatchEvent(clickEvent);
      
      expect(eventSpy).toHaveBeenCalled();
    });

    it('should not close on overlay click before verification', async () => {
      const eventSpy = vi.fn();
      
      new TotpSetupModal(container, authService, totpService, testUserId);
      await new Promise(resolve => setTimeout(resolve, 10));
      
      container.addEventListener('totp-setup-complete', eventSpy);
      
      // Click overlay without verifying
      const overlay = container.querySelector('.totp-modal-overlay') as HTMLElement;
      const clickEvent = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(clickEvent, 'target', { value: overlay, writable: false });
      overlay.dispatchEvent(clickEvent);
      
      expect(eventSpy).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels', async () => {
      new TotpSetupModal(container, authService, totpService, testUserId);
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const input = container.querySelector('#totp-verification-code') as HTMLInputElement;
      expect(input.getAttribute('aria-label')).toBe('Verification code');
      expect(input.getAttribute('aria-describedby')).toContain('verification-help');
      expect(input.getAttribute('aria-describedby')).toContain('verification-error');
    });

    it('should set aria-invalid on error', async () => {
      new TotpSetupModal(container, authService, totpService, testUserId);
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const input = container.querySelector('#totp-verification-code') as HTMLInputElement;
      const verifyButton = container.querySelector('#verify-button') as HTMLButtonElement;
      
      verifyButton.click();
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(input.getAttribute('aria-invalid')).toBe('true');
    });

    it('should announce errors with role="alert"', () => {
      new TotpSetupModal(container, authService, totpService, testUserId);
      
      const errorDiv = container.querySelector('#verification-error');
      expect(errorDiv?.getAttribute('role')).toBe('alert');
      expect(errorDiv?.getAttribute('aria-live')).toBe('polite');
    });

    it('should have backup codes list with proper ARIA', async () => {
      new TotpSetupModal(container, authService, totpService, testUserId);
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const input = container.querySelector('#totp-verification-code') as HTMLInputElement;
      input.value = '123456';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const backupCodesList = container.querySelector('#backup-codes-list');
      expect(backupCodesList?.getAttribute('role')).toBe('list');
      expect(backupCodesList?.getAttribute('aria-label')).toBe('Backup codes');
      
      const backupCodeItems = container.querySelectorAll('.totp-modal__backup-code');
      backupCodeItems.forEach(item => {
        expect(item.getAttribute('role')).toBe('listitem');
      });
    });
  });

  describe('destroy', () => {
    it('should clear container', async () => {
      const modal = new TotpSetupModal(container, authService, totpService, testUserId);
      await new Promise(resolve => setTimeout(resolve, 10));
      
      modal.destroy();
      
      expect(container.innerHTML).toBe('');
    });
  });
});
