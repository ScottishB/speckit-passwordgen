import type { User } from '../models/User';
import type { Session } from '../models/Session';
import type { AuthService } from '../services/AuthService';
import type { SessionService } from '../services/SessionService';
import type { TotpService } from '../services/TotpService';

/**
 * SettingsView Component
 * 
 * Displays user settings and account management options.
 * Includes 2FA management, active sessions, and account deletion.
 * 
 * Features:
 * - Enable/disable two-factor authentication
 * - View and regenerate backup codes
 * - Manage active sessions across devices
 * - Delete account with confirmation
 * 
 * @example
 * const settingsView = new SettingsView(container, authService, sessionService, totpService);
 * await settingsView.render();
 */
export class SettingsView {
  private container: HTMLElement;
  private authService: AuthService;
  private sessionService: SessionService;
  private totpService: TotpService;
  private currentUser: User | null = null;
  private sessions: Session[] = [];
  private currentSessionId: string | null = null;

  // Cached DOM elements
  private twoFASection: HTMLElement | null = null;
  private sessionsSection: HTMLElement | null = null;
  private accountSection: HTMLElement | null = null;

  constructor(
    container: HTMLElement,
    authService: AuthService,
    sessionService: SessionService,
    totpService: TotpService
  ) {
    if (!container) {
      throw new Error('Container element is required');
    }
    if (!authService) {
      throw new Error('AuthService is required');
    }
    if (!sessionService) {
      throw new Error('SessionService is required');
    }
    if (!totpService) {
      throw new Error('TotpService is required');
    }

    this.container = container;
    this.authService = authService;
    this.sessionService = sessionService;
    this.totpService = totpService;
  }

  /**
   * Renders the settings view
   */
  async render(): Promise<void> {
    this.currentUser = this.authService.getCurrentUser();
    const currentSession = this.authService.getCurrentSession();
    this.currentSessionId = currentSession?.id || null;

    if (!this.currentUser) {
      throw new Error('User must be authenticated to view settings');
    }

    this.container.innerHTML = this.getTemplate();
    this.cacheElements();
    await this.loadSessions();
    this.attachEventListeners();
  }

  /**
   * Returns the HTML template for the component
   */
  private getTemplate(): string {
    if (!this.currentUser) return '';

    const is2FAEnabled = !!this.currentUser.totpSecret;
    const remainingBackupCodes = this.totpService.getRemainingBackupCodesCount(this.currentUser);
    const accountAge = this.formatDate(this.currentUser.createdAt);

    return `
      <div class="settings-view">
        <header class="settings-view__header">
          <h1 class="settings-view__title">Account Settings</h1>
        </header>

        <!-- Two-Factor Authentication Section -->
        <section class="settings-view__section" aria-labelledby="2fa-heading">
          <div class="settings-section">
            <div class="settings-section__header">
              <h2 id="2fa-heading" class="settings-section__title">Two-Factor Authentication</h2>
              <span class="settings-badge settings-badge--${is2FAEnabled ? 'success' : 'warning'}" role="status">
                ${is2FAEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>

            <p class="settings-section__description">
              Add an extra layer of security to your account by requiring a verification code in addition to your password.
            </p>

            <div class="settings-section__content" id="2fa-section">
              ${is2FAEnabled ? `
                <div class="settings-info">
                  <svg class="settings-info__icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                  <span>Two-factor authentication is currently enabled for your account.</span>
                </div>

                ${remainingBackupCodes > 0 ? `
                  <div class="settings-info settings-info--warning">
                    <svg class="settings-info__icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <span>You have ${remainingBackupCodes} backup code${remainingBackupCodes === 1 ? '' : 's'} remaining.</span>
                  </div>
                ` : `
                  <div class="settings-info settings-info--danger">
                    <svg class="settings-info__icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                      <line x1="12" y1="9" x2="12" y2="13"></line>
                      <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                    <span>You have used all backup codes. Generate new codes immediately.</span>
                  </div>
                `}

                <div class="settings-actions">
                  <button type="button" class="btn btn-secondary" id="view-backup-codes-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    View Backup Codes
                  </button>
                  <button type="button" class="btn btn-secondary" id="regenerate-backup-codes-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="23 4 23 10 17 10"></polyline>
                      <polyline points="1 20 1 14 7 14"></polyline>
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                    </svg>
                    Regenerate Codes
                  </button>
                  <button type="button" class="btn btn-danger" id="disable-2fa-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
                    </svg>
                    Disable 2FA
                  </button>
                </div>
              ` : `
                <div class="settings-info settings-info--warning">
                  <svg class="settings-info__icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                  <span>Your account is not protected by two-factor authentication.</span>
                </div>

                <div class="settings-actions">
                  <button type="button" class="btn btn-primary" id="enable-2fa-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    Enable Two-Factor Authentication
                  </button>
                </div>
              `}

              <div class="backup-codes-display" style="display: none;">
                <div class="backup-codes-header">
                  <h3 class="backup-codes-title">Your Backup Codes</h3>
                  <button type="button" class="btn-close" id="close-backup-codes-btn" aria-label="Close backup codes">×</button>
                </div>
                <p class="backup-codes-description">
                  Save these codes in a secure location. Each code can only be used once.
                </p>
                <div class="backup-codes-grid" id="backup-codes-list"></div>
                <div class="backup-codes-actions">
                  <button type="button" class="btn btn-secondary" id="copy-backup-codes-btn">Copy All</button>
                  <button type="button" class="btn btn-secondary" id="print-backup-codes-btn">Print</button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Active Sessions Section -->
        <section class="settings-view__section" aria-labelledby="sessions-heading">
          <div class="settings-section">
            <div class="settings-section__header">
              <h2 id="sessions-heading" class="settings-section__title">Active Sessions</h2>
            </div>

            <p class="settings-section__description">
              Manage devices and locations where you're currently signed in.
            </p>

            <div class="settings-section__content" id="sessions-section">
              <div class="sessions-list" id="sessions-list">
                <div class="loading-spinner">Loading sessions...</div>
              </div>
            </div>
          </div>
        </section>

        <!-- Account Section -->
        <section class="settings-view__section" aria-labelledby="account-heading">
          <div class="settings-section">
            <div class="settings-section__header">
              <h2 id="account-heading" class="settings-section__title">Account Information</h2>
            </div>

            <div class="settings-section__content" id="account-section">
              <div class="account-info">
                <div class="account-info__item">
                  <label class="account-info__label">Username</label>
                  <div class="account-info__value">${this.escapeHtml(this.currentUser.username)}</div>
                </div>
                <div class="account-info__item">
                  <label class="account-info__label">Account Created</label>
                  <div class="account-info__value">${accountAge}</div>
                </div>
              </div>

              <div class="settings-divider"></div>

              <div class="danger-zone">
                <h3 class="danger-zone__title">Danger Zone</h3>
                <p class="danger-zone__description">
                  Once you delete your account, there is no going back. All your data will be permanently removed.
                </p>
                <button type="button" class="btn btn-danger btn-danger--outline" id="delete-account-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 6h18"></path>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    `;
  }

  /**
   * Cache DOM elements
   */
  private cacheElements(): void {
    this.twoFASection = this.container.querySelector('#2fa-section');
    this.sessionsSection = this.container.querySelector('#sessions-section');
    this.accountSection = this.container.querySelector('#account-section');
  }

  /**
   * Load active sessions
   */
  private async loadSessions(): Promise<void> {
    if (!this.currentUser) return;

    try {
      this.sessions = await this.sessionService.getUserSessions(this.currentUser.id);
      this.renderSessions();
    } catch (error) {
      console.error('[SettingsView] Failed to load sessions:', error);
      this.showSessionsError('Failed to load active sessions');
    }
  }

  /**
   * Render sessions list
   */
  private renderSessions(): void {
    const sessionsList = this.container.querySelector('#sessions-list');
    if (!sessionsList) return;

    if (this.sessions.length === 0) {
      sessionsList.innerHTML = '<div class="sessions-empty">No active sessions found.</div>';
      return;
    }

    const sessionsHTML = this.sessions.map(session => {
      const isCurrent = session.id === this.currentSessionId;
      const lastActivity = this.formatRelativeTime(session.lastActivity);
      const createdAt = this.formatDate(session.createdAt);

      return `
        <div class="session-item ${isCurrent ? 'session-item--current' : ''}" data-session-id="${session.id}">
          <div class="session-item__icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
          </div>
          <div class="session-item__content">
            <div class="session-item__header">
              <span class="session-item__device">${this.escapeHtml(session.deviceInfo || 'Unknown Device')}</span>
              ${isCurrent ? '<span class="session-badge session-badge--current">Current Session</span>' : ''}
            </div>
            <div class="session-item__meta">
              <span>Last activity: ${lastActivity}</span>
              <span class="session-item__separator">•</span>
              <span>Started: ${createdAt}</span>
            </div>
          </div>
          ${!isCurrent ? `
            <button 
              type="button" 
              class="btn btn-danger btn-sm revoke-session-btn" 
              data-session-id="${session.id}"
              aria-label="Revoke this session"
            >
              Revoke
            </button>
          ` : ''}
        </div>
      `;
    }).join('');

    sessionsList.innerHTML = sessionsHTML;
    this.attachSessionEventListeners();
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    // 2FA buttons
    const enable2FABtn = this.container.querySelector('#enable-2fa-btn');
    enable2FABtn?.addEventListener('click', () => this.handleEnable2FA());

    const disable2FABtn = this.container.querySelector('#disable-2fa-btn');
    disable2FABtn?.addEventListener('click', () => this.handleDisable2FA());

    const viewBackupCodesBtn = this.container.querySelector('#view-backup-codes-btn');
    viewBackupCodesBtn?.addEventListener('click', () => this.handleViewBackupCodes());

    const regenerateBackupCodesBtn = this.container.querySelector('#regenerate-backup-codes-btn');
    regenerateBackupCodesBtn?.addEventListener('click', () => this.handleRegenerateBackupCodes());

    const closeBackupCodesBtn = this.container.querySelector('#close-backup-codes-btn');
    closeBackupCodesBtn?.addEventListener('click', () => this.hideBackupCodes());

    const copyBackupCodesBtn = this.container.querySelector('#copy-backup-codes-btn');
    copyBackupCodesBtn?.addEventListener('click', () => this.copyBackupCodes());

    const printBackupCodesBtn = this.container.querySelector('#print-backup-codes-btn');
    printBackupCodesBtn?.addEventListener('click', () => window.print());

    // Delete account button
    const deleteAccountBtn = this.container.querySelector('#delete-account-btn');
    deleteAccountBtn?.addEventListener('click', () => this.handleDeleteAccount());
  }

  /**
   * Attach session event listeners
   */
  private attachSessionEventListeners(): void {
    const revokeButtons = this.container.querySelectorAll('.revoke-session-btn');
    revokeButtons.forEach(btn => {
      btn.addEventListener('click', (e) => this.handleRevokeSession(e));
    });
  }

  /**
   * Handle enable 2FA
   */
  private handleEnable2FA(): void {
    if (!this.currentUser) return;

    // Dispatch event to open TOTP setup modal
    window.dispatchEvent(new CustomEvent('open-totp-setup', {
      detail: { userId: this.currentUser.id },
      bubbles: true
    }));
  }

  /**
   * Handle disable 2FA
   */
  private async handleDisable2FA(): Promise<void> {
    if (!this.currentUser) return;

    const password = prompt('Enter your password to disable two-factor authentication:');
    if (!password) return;

    try {
      await this.authService.disable2FA(this.currentUser.id, password);
      
      // Refresh view
      await this.render();
      
      // Show success message
      this.showSuccessMessage('Two-factor authentication has been disabled');
    } catch (error) {
      console.error('[SettingsView] Failed to disable 2FA:', error);
      alert('Failed to disable two-factor authentication. Please check your password and try again.');
    }
  }

  /**
   * Handle view backup codes
   */
  private handleViewBackupCodes(): void {
    if (!this.currentUser || !this.currentUser.backupCodes) return;

    const backupCodesDisplay = this.container.querySelector('.backup-codes-display') as HTMLElement;
    const backupCodesList = this.container.querySelector('#backup-codes-list');

    if (!backupCodesDisplay || !backupCodesList) return;

    // Show only unused backup codes
    const usedIndices = this.currentUser.backupCodesUsed || [];
    const codes = this.currentUser.backupCodes
      .map((code, index) => {
        const isUsed = usedIndices.includes(index);
        return `
          <div class="backup-code-item ${isUsed ? 'backup-code-item--used' : ''}">
            <span class="backup-code-number">${index + 1}.</span>
            <code class="backup-code-value">${isUsed ? '••••••••' : code}</code>
            ${isUsed ? '<span class="backup-code-status">Used</span>' : ''}
          </div>
        `;
      })
      .join('');

    backupCodesList.innerHTML = codes;
    backupCodesDisplay.style.display = 'block';
  }

  /**
   * Handle regenerate backup codes
   */
  private async handleRegenerateBackupCodes(): Promise<void> {
    if (!this.currentUser) return;

    const confirmed = confirm(
      'Are you sure you want to regenerate your backup codes?\n\n' +
      'Your old backup codes will no longer work.'
    );

    if (!confirmed) return;

    try {
      const newCodes = await this.authService.regenerateBackupCodes(this.currentUser.id);
      
      // Refresh current user
      this.currentUser = this.authService.getCurrentUser();
      
      // Show new backup codes
      this.showBackupCodes(newCodes);
      
      // Show success message
      this.showSuccessMessage('New backup codes generated. Please save them securely.');
    } catch (error) {
      console.error('[SettingsView] Failed to regenerate backup codes:', error);
      alert('Failed to regenerate backup codes. Please try again.');
    }
  }

  /**
   * Show backup codes (plain text)
   */
  private showBackupCodes(codes: string[]): void {
    const backupCodesDisplay = this.container.querySelector('.backup-codes-display') as HTMLElement;
    const backupCodesList = this.container.querySelector('#backup-codes-list');

    if (!backupCodesDisplay || !backupCodesList) return;

    const codesHTML = codes
      .map((code, index) => `
        <div class="backup-code-item">
          <span class="backup-code-number">${index + 1}.</span>
          <code class="backup-code-value">${code}</code>
        </div>
      `)
      .join('');

    backupCodesList.innerHTML = codesHTML;
    backupCodesDisplay.style.display = 'block';
  }

  /**
   * Hide backup codes display
   */
  private hideBackupCodes(): void {
    const backupCodesDisplay = this.container.querySelector('.backup-codes-display') as HTMLElement;
    if (backupCodesDisplay) {
      backupCodesDisplay.style.display = 'none';
    }
  }

  /**
   * Copy backup codes to clipboard
   */
  private async copyBackupCodes(): Promise<void> {
    const backupCodesList = this.container.querySelector('#backup-codes-list');
    if (!backupCodesList) return;

    const codeElements = backupCodesList.querySelectorAll('.backup-code-value');
    const codes = Array.from(codeElements)
      .map(el => el.textContent?.trim())
      .filter(code => code && code !== '••••••••')
      .join('\n');

    try {
      await navigator.clipboard.writeText(codes);
      this.showSuccessMessage('Backup codes copied to clipboard');
    } catch (error) {
      console.error('[SettingsView] Failed to copy backup codes:', error);
      alert('Failed to copy backup codes to clipboard');
    }
  }

  /**
   * Handle revoke session
   */
  private async handleRevokeSession(event: Event): Promise<void> {
    const button = event.currentTarget as HTMLElement;
    const sessionId = button.dataset.sessionId;

    if (!sessionId) return;

    const confirmed = confirm('Are you sure you want to revoke this session?');
    if (!confirmed) return;

    try {
      await this.sessionService.invalidateSession(sessionId);
      
      // Refresh sessions list
      await this.loadSessions();
      
      this.showSuccessMessage('Session revoked successfully');
    } catch (error) {
      console.error('[SettingsView] Failed to revoke session:', error);
      alert('Failed to revoke session. Please try again.');
    }
  }

  /**
   * Handle delete account
   */
  private handleDeleteAccount(): void {
    if (!this.currentUser) return;

    // Dispatch event to open delete account modal
    window.dispatchEvent(new CustomEvent('open-delete-account', {
      detail: { userId: this.currentUser.id },
      bubbles: true
    }));
  }

  /**
   * Show sessions error
   */
  private showSessionsError(message: string): void {
    const sessionsList = this.container.querySelector('#sessions-list');
    if (sessionsList) {
      sessionsList.innerHTML = `<div class="sessions-error">${this.escapeHtml(message)}</div>`;
    }
  }

  /**
   * Show success message
   */
  private showSuccessMessage(message: string): void {
    window.dispatchEvent(new CustomEvent('show-success', {
      detail: { message },
      bubbles: true
    }));
  }

  /**
   * Format date
   */
  private formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Format relative time
   */
  private formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Destroy the component
   */
  public destroy(): void {
    this.container.innerHTML = '';
  }
}
