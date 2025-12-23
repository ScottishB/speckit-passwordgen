import type { AuthService } from '../services/AuthService.js';
import type { TotpService } from '../services/TotpService.js';

/**
 * TotpSetupModal Component
 * 
 * Modal dialog for setting up two-factor authentication (TOTP).
 * Displays QR code for scanning, manual entry secret, verification input,
 * and backup codes after successful verification.
 * 
 * Features:
 * - QR code display for authenticator app scanning
 * - Manual entry fallback (displays secret as text)
 * - 6-digit verification code input
 * - Backup codes display with copy and print options
 * - Skip option with warning
 * - Focus trap for accessibility
 * - Keyboard navigation (Escape to close after setup)
 */
export class TotpSetupModal {
  private container: HTMLElement;
  private authService: AuthService;
  private totpService: TotpService;
  private userId: string;
  private secret: string = '';
  private qrCode: string = '';
  private backupCodes: string[] = [];
  private isVerified: boolean = false;
  
  // Cached element references
  private overlay: HTMLElement | null = null;
  private modal: HTMLElement | null = null;
  private verificationInput: HTMLInputElement | null = null;
  private backupCodesContainer: HTMLElement | null = null;
  private verifyButton: HTMLButtonElement | null = null;
  private skipButton: HTMLButtonElement | null = null;
  private completeButton: HTMLButtonElement | null = null;
  private copyButton: HTMLButtonElement | null = null;
  private printButton: HTMLButtonElement | null = null;

  /**
   * Creates a new TotpSetupModal instance
   * @param container - The HTML element to render the modal into
   * @param authService - The authentication service instance
   * @param totpService - The TOTP service instance
   * @param userId - The user ID for setting up 2FA
   */
  constructor(container: HTMLElement, authService: AuthService, totpService: TotpService, userId: string) {
    if (!container) {
      throw new Error('Container is required');
    }
    
    if (!authService) {
      throw new Error('AuthService is required');
    }
    
    if (!totpService) {
      throw new Error('TotpService is required');
    }
    
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    this.container = container;
    this.authService = authService;
    this.totpService = totpService;
    this.userId = userId;
    
    this.render();
    this.cacheElements();
    this.attachEventListeners();
    this.initializeTotp();
  }

  /**
   * Caches DOM element references for performance
   */
  private cacheElements(): void {
    this.overlay = this.container.querySelector('.totp-modal-overlay');
    this.modal = this.container.querySelector('.totp-modal');
    this.verificationInput = this.container.querySelector('#totp-verification-code');
    this.backupCodesContainer = this.container.querySelector('.totp-modal__backup-codes');
    this.verifyButton = this.container.querySelector('#verify-button');
    this.skipButton = this.container.querySelector('#skip-button');
    this.completeButton = this.container.querySelector('#complete-button');
    this.copyButton = this.container.querySelector('#copy-codes-button');
    this.printButton = this.container.querySelector('#print-codes-button');
  }

  /**
   * Renders the TOTP setup modal HTML
   */
  private render(): void {
    this.container.innerHTML = `
      <div class="totp-modal-overlay" role="presentation">
        <div class="totp-modal" role="dialog" aria-modal="true" aria-labelledby="totp-modal-title">
          <div class="totp-modal__header">
            <h2 id="totp-modal-title" class="totp-modal__title">Set Up Two-Factor Authentication</h2>
          </div>
          
          <div class="totp-modal__body">
            <!-- Step 1: Scan QR Code -->
            <div class="totp-modal__section" id="setup-section">
              <h3 class="totp-modal__section-title">Step 1: Scan QR Code</h3>
              <p class="totp-modal__instructions">
                Use an authenticator app (Google Authenticator, Authy, etc.) to scan this QR code:
              </p>
              
              <div class="totp-modal__qr-container" id="qr-container">
                <img 
                  id="qr-code-image" 
                  class="totp-modal__qr-image" 
                  src="" 
                  alt="QR code for two-factor authentication setup"
                  style="display: none;"
                />
                <div class="totp-modal__loading" id="qr-loading">Loading QR code...</div>
              </div>
              
              <!-- Manual Entry Fallback -->
              <details class="totp-modal__manual-entry">
                <summary>Can't scan? Enter manually</summary>
                <div class="totp-modal__secret-container">
                  <label for="manual-secret" class="totp-modal__secret-label">Secret Key:</label>
                  <code id="manual-secret" class="totp-modal__secret" aria-label="Manual entry secret key"></code>
                </div>
              </details>
            </div>
            
            <!-- Step 2: Verify -->
            <div class="totp-modal__section">
              <h3 class="totp-modal__section-title">Step 2: Verify</h3>
              <p class="totp-modal__instructions">
                Enter the 6-digit code from your authenticator app:
              </p>
              
              <div class="totp-modal__field">
                <input
                  type="text"
                  id="totp-verification-code"
                  class="totp-modal__input"
                  pattern="\\d{6}"
                  maxlength="6"
                  inputmode="numeric"
                  autocomplete="one-time-code"
                  placeholder="000000"
                  aria-label="Verification code"
                  aria-describedby="verification-help verification-error"
                  aria-required="true"
                />
                <div id="verification-help" class="totp-modal__help">
                  Enter the 6-digit code from your authenticator app
                </div>
                <div id="verification-error" class="totp-modal__field-error" role="alert" aria-live="polite"></div>
              </div>
            </div>
            
            <!-- Step 3: Backup Codes (shown after verification) -->
            <div class="totp-modal__section" id="backup-section" style="display: none;">
              <h3 class="totp-modal__section-title">Step 3: Save Backup Codes</h3>
              <div class="totp-modal__warning" role="alert">
                <strong>Important:</strong> Save these backup codes in a safe place. 
                Each code can only be used once if you lose access to your authenticator app.
              </div>
              
              <div class="totp-modal__backup-codes" id="backup-codes-list" role="list" aria-label="Backup codes">
                <!-- Backup codes will be inserted here -->
              </div>
              
              <div class="totp-modal__backup-actions">
                <button type="button" id="copy-codes-button" class="totp-modal__button totp-modal__button--secondary">
                  Copy All
                </button>
                <button type="button" id="print-codes-button" class="totp-modal__button totp-modal__button--secondary">
                  Print Codes
                </button>
              </div>
            </div>
            
            <!-- General Error Display -->
            <div class="totp-modal__error" role="alert" aria-live="assertive"></div>
          </div>
          
          <div class="totp-modal__footer">
            <button type="button" id="skip-button" class="totp-modal__button totp-modal__button--secondary">
              Skip (Not Recommended)
            </button>
            <button type="button" id="verify-button" class="totp-modal__button totp-modal__button--primary">
              Verify Code
            </button>
            <button type="button" id="complete-button" class="totp-modal__button totp-modal__button--primary" style="display: none;">
              Complete Setup
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Attaches event listeners to interactive elements
   */
  private attachEventListeners(): void {
    // Overlay click to close (only after verification)
    if (this.overlay) {
      this.overlay.addEventListener('click', (e) => {
        if (e.target === this.overlay && this.isVerified) {
          this.close();
        }
      });
    }
    
    // Escape key to close (only after verification)
    document.addEventListener('keydown', this.handleEscapeKey.bind(this));
    
    // Verification input events
    if (this.verificationInput) {
      this.verificationInput.addEventListener('input', () => this.handleVerificationInput());
      this.verificationInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.verifyCode();
        }
      });
    }
    
    // Button events
    if (this.verifyButton) {
      this.verifyButton.addEventListener('click', () => this.verifyCode());
    }
    
    if (this.skipButton) {
      this.skipButton.addEventListener('click', () => this.handleSkip());
    }
    
    if (this.completeButton) {
      this.completeButton.addEventListener('click', () => this.close());
    }
    
    if (this.copyButton) {
      this.copyButton.addEventListener('click', () => this.copyBackupCodes());
    }
    
    if (this.printButton) {
      this.printButton.addEventListener('click', () => this.printBackupCodes());
    }
  }

  /**
   * Initializes TOTP setup by calling AuthService.enable2FA()
   */
  private async initializeTotp(): Promise<void> {
    try {
      console.log('[TotpSetupModal] Initializing TOTP...');
      const result = await this.authService.enable2FA(this.userId);
      console.log('[TotpSetupModal] TOTP initialized, secret length:', result.secret?.length);
      console.log('[TotpSetupModal] QR code data URL length:', result.qrCode?.length);
      console.log('[TotpSetupModal] Backup codes count:', result.backupCodes?.length);
      
      this.secret = result.secret;
      this.qrCode = result.qrCode;
      this.backupCodes = result.backupCodes;
      
      // Display QR code
      const qrImage = document.getElementById('qr-code-image') as HTMLImageElement;
      const qrLoading = document.getElementById('qr-loading');
      
      console.log('[TotpSetupModal] QR image element found:', !!qrImage);
      console.log('[TotpSetupModal] QR loading element found:', !!qrLoading);
      
      if (qrImage && qrLoading) {
        qrImage.src = this.qrCode;
        qrImage.style.display = 'block';
        qrLoading.style.display = 'none';
        console.log('[TotpSetupModal] QR code image source set');
      }
      
      // Display manual entry secret
      const manualSecret = document.getElementById('manual-secret');
      if (manualSecret) {
        manualSecret.textContent = this.secret;
        console.log('[TotpSetupModal] Manual secret displayed');
      }
      
      // Focus on verification input
      if (this.verificationInput) {
        this.verificationInput.focus();
      }
    } catch (error) {
      console.error('[TotpSetupModal] Failed to initialize TOTP:', error);
      this.showError('Failed to initialize two-factor authentication. Please try again.');
    }
  }

  /**
   * Handles verification input changes
   */
  private handleVerificationInput(): void {
    this.clearFieldError();
    
    // Auto-submit when 6 digits entered
    if (this.verificationInput && this.verificationInput.value.length === 6) {
      this.verifyCode();
    }
  }

  /**
   * Verifies the entered TOTP code
   */
  private async verifyCode(): Promise<void> {
    const code = this.verificationInput?.value || '';
    
    // Validation
    if (!code) {
      this.showFieldError('Please enter the 6-digit code');
      return;
    }
    
    if (!/^\d{6}$/.test(code)) {
      this.showFieldError('Code must be 6 digits');
      return;
    }
    
    // Disable input during verification
    this.setLoading(true);
    
    try {
      // Verify the code with TotpService
      const isValid = this.totpService.validateToken(code, this.secret);
      
      if (!isValid) {
        this.showFieldError('Invalid code. Please try again.');
        this.setLoading(false);
        if (this.verificationInput) {
          this.verificationInput.value = '';
          this.verificationInput.focus();
        }
        return;
      }
      
      // Success! Show backup codes
      this.isVerified = true;
      this.showBackupCodes();
      this.setLoading(false);
    } catch (error) {
      console.error('Verification error:', error);
      this.showFieldError('Verification failed. Please try again.');
      this.setLoading(false);
    }
  }

  /**
   * Shows the backup codes section after successful verification
   */
  private showBackupCodes(): void {
    // Hide setup and verification sections
    const setupSection = document.getElementById('setup-section');
    if (setupSection) {
      setupSection.style.display = 'none';
    }
    
    // Hide verify button, show complete button
    if (this.verifyButton) {
      this.verifyButton.style.display = 'none';
    }
    
    if (this.skipButton) {
      this.skipButton.style.display = 'none';
    }
    
    if (this.completeButton) {
      this.completeButton.style.display = 'block';
    }
    
    // Show backup codes section
    const backupSection = document.getElementById('backup-section');
    if (backupSection) {
      backupSection.style.display = 'block';
    }
    
    // Render backup codes
    if (this.backupCodesContainer) {
      this.backupCodesContainer.innerHTML = this.backupCodes
        .map((code, index) => `
          <div class="totp-modal__backup-code" role="listitem">
            <span class="totp-modal__backup-code-number">${index + 1}.</span>
            <code class="totp-modal__backup-code-value">${code}</code>
          </div>
        `)
        .join('');
    }
    
    // Focus on complete button
    if (this.completeButton) {
      this.completeButton.focus();
    }
  }

  /**
   * Copies all backup codes to clipboard
   */
  private async copyBackupCodes(): Promise<void> {
    try {
      const codesText = this.backupCodes
        .map((code, index) => `${index + 1}. ${code}`)
        .join('\n');
      
      await navigator.clipboard.writeText(codesText);
      
      // Visual feedback
      if (this.copyButton) {
        const originalText = this.copyButton.textContent;
        this.copyButton.textContent = 'Copied!';
        this.copyButton.disabled = true;
        
        setTimeout(() => {
          this.copyButton!.textContent = originalText;
          this.copyButton!.disabled = false;
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to copy backup codes:', error);
      this.showError('Failed to copy codes. Please copy them manually.');
    }
  }

  /**
   * Opens print dialog for backup codes
   */
  private printBackupCodes(): void {
    window.print();
  }

  /**
   * Handles skip button click with confirmation
   */
  private async handleSkip(): Promise<void> {
    const confirmed = window.confirm(
      'Are you sure you want to skip two-factor authentication?\n\n' +
      'This will leave your account less secure. You can enable 2FA later from your account settings.'
    );
    
    if (confirmed) {
      try {
        // Clear the 2FA setup that was initialized
        await this.authService.clear2FASetup(this.userId);
        console.log('[TotpSetupModal] 2FA setup cleared after skip');
      } catch (error) {
        console.error('[TotpSetupModal] Failed to clear 2FA setup:', error);
      }
      this.close();
    }
  }

  /**
   * Handles Escape key press
   */
  private handleEscapeKey(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.isVerified) {
      this.close();
    }
  }

  /**
   * Shows a field-level error message
   */
  private showFieldError(message: string): void {
    const errorDiv = document.getElementById('verification-error');
    
    if (this.verificationInput) {
      this.verificationInput.classList.add('totp-modal__input--error');
      this.verificationInput.setAttribute('aria-invalid', 'true');
    }
    
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
    }
  }

  /**
   * Clears field-level error message
   */
  private clearFieldError(): void {
    const errorDiv = document.getElementById('verification-error');
    
    if (this.verificationInput) {
      this.verificationInput.classList.remove('totp-modal__input--error');
      this.verificationInput.removeAttribute('aria-invalid');
    }
    
    if (errorDiv) {
      errorDiv.textContent = '';
      errorDiv.style.display = 'none';
    }
  }

  /**
   * Shows a general error message
   */
  private showError(message: string): void {
    const errorDiv = this.container.querySelector('.totp-modal__error');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.classList.add('totp-modal__error--visible');
    }
  }

  /**
   * Clears general error message
   */
  private clearError(): void {
    const errorDiv = this.container.querySelector('.totp-modal__error');
    if (errorDiv) {
      errorDiv.textContent = '';
      errorDiv.classList.remove('totp-modal__error--visible');
    }
  }

  /**
   * Sets loading state (disables inputs and buttons)
   */
  private setLoading(loading: boolean): void {
    if (this.verificationInput) {
      this.verificationInput.disabled = loading;
    }
    
    if (this.verifyButton) {
      this.verifyButton.disabled = loading;
      this.verifyButton.textContent = loading ? 'Verifying...' : 'Verify Code';
    }
  }

  /**
   * Closes the modal and dispatches completion event
   */
  public close(): void {
    // Dispatch completion event
    const completionEvent = new CustomEvent('totp-setup-complete', {
      bubbles: true,
      detail: {
        isVerified: this.isVerified
      }
    });
    
    this.container.dispatchEvent(completionEvent);
    
    // Clean up
    this.destroy();
  }

  /**
   * Destroys the modal and cleans up resources
   */
  public destroy(): void {
    // Remove event listeners
    document.removeEventListener('keydown', this.handleEscapeKey.bind(this));
    
    // Clear container
    this.container.innerHTML = '';
  }
}
