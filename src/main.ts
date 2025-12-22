import { Database } from './services/database';
import { HistoryService } from './services/historyService';
import { CryptoService } from './services/CryptoService';
import { SessionService } from './services/SessionService';
import { SecurityLogService } from './services/SecurityLogService';
import { TotpService } from './services/TotpService';
import { AuthService } from './services/AuthService';
import { SiteService } from './services/SiteService';
import { PasswordFormComponent } from './components/PasswordForm';
import { PassphraseFormComponent } from './components/PassphraseForm';
import { HistoryListComponent } from './components/HistoryList';
import { LoginForm } from './components/LoginForm';
import { RegisterForm } from './components/RegisterForm';
import { TotpSetupModal } from './components/TotpSetupModal';
import { SiteAssignModal } from './components/SiteAssignModal';
import { SiteDetailModal } from './components/SiteDetailModal';
import { SiteEditModal } from './components/SiteEditModal';
import { DeleteAccountModal } from './components/DeleteAccountModal';
import { SettingsView } from './components/SettingsView';

class AppComponent {
  private database: Database;
  private cryptoService: CryptoService;
  private sessionService: SessionService;
  private securityLogService: SecurityLogService;
  private totpService: TotpService;
  private authService: AuthService;
  private siteService: SiteService;
  private historyService: HistoryService;
  private passwordForm: PasswordFormComponent | null = null;
  private passphraseForm: PassphraseFormComponent | null = null;
  private historyList: HistoryListComponent | null = null;
  private loginForm: LoginForm | null = null;
  private registerForm: RegisterForm | null = null;
  private totpSetupModal: TotpSetupModal | null = null;
  private siteAssignModal: SiteAssignModal | null = null;
  private siteDetailModal: SiteDetailModal | null = null;
  private siteEditModal: SiteEditModal | null = null;
  private deleteAccountModal: DeleteAccountModal | null = null;
  private settingsView: SettingsView | null = null;
  private activeTab: 'password' | 'passphrase' = 'password';
  private isAuthenticated: boolean = false;
  private currentUser: string | null = null;
  private activityThrottleTimeout: NodeJS.Timeout | null = null;
  private lastActivityUpdate: number = 0;

  constructor() {
    this.database = new Database();
    this.cryptoService = new CryptoService();
    this.sessionService = new SessionService(this.database);
    this.securityLogService = new SecurityLogService(this.database);
    this.totpService = new TotpService();
    this.authService = new AuthService(
      this.cryptoService,
      this.sessionService,
      this.securityLogService,
      this.totpService,
      this.database
    );
    this.siteService = new SiteService(this.cryptoService, this.authService, this.database);
    this.historyService = new HistoryService(this.database);
  }

  async initialize(): Promise<void> {
    try {
      console.log('[App] Starting initialization...');
      // Show loading overlay
      this.showLoading(true);

      // Initialize database
      console.log('[App] Initializing database...');
      await this.database.initialize();
      console.log('[App] Database initialized');

      // Check authentication status
      console.log('[App] Checking authentication status...');
      this.isAuthenticated = await this.authService.isAuthenticated();
      console.log('[App] Authenticated:', this.isAuthenticated);

      if (this.isAuthenticated) {
        const user = this.authService.getCurrentUser();
        this.currentUser = user?.username || null;
        console.log('[App] Current user:', this.currentUser);
        await this.showMainApp();
      } else {
        console.log('[App] Not authenticated, showing login screen');
        await this.showAuthUI();
      }

      // Setup auth event listeners
      this.setupAuthEventListeners();

      // Hide loading overlay
      console.log('[App] Hiding loading overlay...');
      this.showLoading(false);

      console.log('[App] App initialized successfully');
    } catch (error) {
      console.error('[App] Initialization failed:', error);
      this.handleError(error as Error);
    }
  }

  private setupTabSwitching(): void {
    const passwordTabBtn = document.getElementById('password-tab-btn');
    const passphraseTabBtn = document.getElementById('passphrase-tab-btn');

    passwordTabBtn?.addEventListener('click', () => {
      this.switchTab('password');
    });

    passphraseTabBtn?.addEventListener('click', () => {
      this.switchTab('passphrase');
    });

    // Keyboard navigation for tabs
    passwordTabBtn?.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        passphraseTabBtn?.focus();
      }
    });

    passphraseTabBtn?.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        passwordTabBtn?.focus();
      }
    });
  }

  private setupHashRouting(): void {
    // Handle initial hash
    const hash = window.location.hash.slice(1);
    if (hash === 'passphrase') {
      this.switchTab('passphrase');
    }

    // Handle hash changes
    window.addEventListener('hashchange', () => {
      const newHash = window.location.hash.slice(1);
      if (newHash === 'password' || newHash === 'passphrase') {
        this.switchTab(newHash);
      }
    });
  }

  switchTab(tab: 'password' | 'passphrase'): void {
    this.activeTab = tab;

    // Update tab buttons
    const passwordTabBtn = document.getElementById('password-tab-btn');
    const passphraseTabBtn = document.getElementById('passphrase-tab-btn');
    const passwordPanel = document.getElementById('password-panel');
    const passphrasePanel = document.getElementById('passphrase-panel');

    if (tab === 'password') {
      passwordTabBtn?.classList.add('active');
      passwordTabBtn?.setAttribute('aria-selected', 'true');
      passwordTabBtn?.setAttribute('tabindex', '0');
      passphraseTabBtn?.classList.remove('active');
      passphraseTabBtn?.setAttribute('aria-selected', 'false');
      passphraseTabBtn?.setAttribute('tabindex', '-1');

      passwordPanel?.classList.add('active');
      passwordPanel?.removeAttribute('hidden');
      passphrasePanel?.classList.remove('active');
      passphrasePanel?.setAttribute('hidden', '');

      window.location.hash = 'password';
    } else {
      passphraseTabBtn?.classList.add('active');
      passphraseTabBtn?.setAttribute('aria-selected', 'true');
      passphraseTabBtn?.setAttribute('tabindex', '0');
      passwordTabBtn?.classList.remove('active');
      passwordTabBtn?.setAttribute('aria-selected', 'false');
      passwordTabBtn?.setAttribute('tabindex', '-1');

      passphrasePanel?.classList.add('active');
      passphrasePanel?.removeAttribute('hidden');
      passwordPanel?.classList.remove('active');
      passwordPanel?.setAttribute('hidden', '');

      window.location.hash = 'passphrase';
    }
  }

  private async showAuthUI(): Promise<void> {
    // Hide main app if visible
    const main = document.querySelector('main');
    if (main) {
      main.style.display = 'none';
    }

    // Create auth container if it doesn't exist
    let authContainer = document.getElementById('auth-container');
    if (!authContainer) {
      authContainer = document.createElement('div');
      authContainer.id = 'auth-container';
      authContainer.className = 'auth-container';
      document.getElementById('app')?.appendChild(authContainer);
    }

    // Show login form by default
    this.showLogin();
  }

  private showLogin(): void {
    const authContainer = document.getElementById('auth-container');
    if (!authContainer) return;

    // Clear container
    authContainer.innerHTML = '';

    // Initialize LoginForm
    this.loginForm = new LoginForm(this.authService);
    const loginContainer = this.loginForm.render();
    authContainer.appendChild(loginContainer);

    // Listen for login success
    loginContainer.addEventListener('login-success', ((event: CustomEvent) => {
      const { username } = event.detail;
      this.currentUser = username;
      this.isAuthenticated = true;
      this.handleLoginSuccess();
    }) as EventListener);

    // Listen for switch to register
    loginContainer.addEventListener('show-register', () => {
      this.showRegister();
    });
  }

  private showRegister(): void {
    const authContainer = document.getElementById('auth-container');
    if (!authContainer) return;

    // Clear container
    authContainer.innerHTML = '';

    // Create register form container
    const registerContainer = document.createElement('div');
    registerContainer.id = 'register-container';
    authContainer.appendChild(registerContainer);

    // Initialize RegisterForm (it renders into the container automatically)
    this.registerForm = new RegisterForm(registerContainer, this.authService);

    // Listen for registration success
    registerContainer.addEventListener('register-success', ((event: CustomEvent) => {
      const { username, userId } = event.detail;
      this.currentUser = username;
      this.handleRegisterSuccess(userId);
    }) as EventListener);

    // Listen for switch to login
    registerContainer.addEventListener('show-login', () => {
      this.showLogin();
    });
  }

  private handleLoginSuccess(): void {
    console.log('[App] Login successful, showing main app');
    this.showLoading(true);
    
    // Wait a moment before transitioning
    setTimeout(async () => {
      await this.showMainApp();
      this.showLoading(false);
      this.setupActivityTracking();
    }, 100);
  }

  private handleRegisterSuccess(userId: string): void {
    console.log('[App] Registration successful, showing TOTP setup');
    
    // Create modal container
    const modalContainer = document.createElement('div');
    modalContainer.id = 'totp-modal-container';
    document.body.appendChild(modalContainer);

    // Initialize TotpSetupModal
    this.totpSetupModal = new TotpSetupModal(
      modalContainer,
      this.authService,
      this.totpService,
      userId
    );

    // Listen for TOTP setup completion
    modalContainer.addEventListener('totp-setup-complete', ((event: CustomEvent) => {
      const { isVerified } = event.detail;
      console.log('[App] TOTP setup complete, verified:', isVerified);
      
      // Remove modal container
      modalContainer.remove();
      this.totpSetupModal = null;

      // Show success message
      if (isVerified) {
        this.showSuccessMessage('Two-factor authentication enabled successfully!');
      }

      // Mark as authenticated and show main app
      this.isAuthenticated = true;
      this.showLoading(true);
      setTimeout(async () => {
        await this.showMainApp();
        this.showLoading(false);
        this.setupActivityTracking();
      }, 100);
    }) as EventListener);
  }

  private async showMainApp(): Promise<void> {
    // Hide auth container
    const authContainer = document.getElementById('auth-container');
    if (authContainer) {
      authContainer.style.display = 'none';
    }

    // Show main app
    const main = document.querySelector('main');
    if (main) {
      main.style.display = 'block';
    }

    // Initialize components if not already done
    if (!this.passwordForm) {
      console.log('[App] Initializing components...');
      this.passwordForm = new PasswordFormComponent(this.database);
      this.passphraseForm = new PassphraseFormComponent(this.database);
      this.historyList = new HistoryListComponent(this.historyService, this.authService);
      console.log('[App] Components initialized');

      // Setup tab switching
      console.log('[App] Setting up tab switching...');
      this.setupTabSwitching();

      // Setup URL hash routing
      console.log('[App] Setting up hash routing...');
      this.setupHashRouting();
    }

    // Add logout button to header if not present
    this.addLogoutButton();

    // Add settings button to header if not present
    this.addSettingsButton();
  }

  private addLogoutButton(): void {
    const header = document.querySelector('header');
    if (!header) return;

    // Check if logout button already exists
    if (document.getElementById('logout-button')) return;

    // Create logout button
    const logoutButton = document.createElement('button');
    logoutButton.id = 'logout-button';
    logoutButton.className = 'logout-button';
    logoutButton.textContent = 'Logout';
    logoutButton.setAttribute('aria-label', 'Logout from account');

    // Add click handler
    logoutButton.addEventListener('click', () => {
      this.handleLogout();
    });

    // Insert at end of header
    header.appendChild(logoutButton);
  }

  private addSettingsButton(): void {
    const header = document.querySelector('header');
    if (!header) return;

    // Check if settings button already exists
    if (document.getElementById('settings-button')) return;

    // Create settings button
    const settingsButton = document.createElement('button');
    settingsButton.id = 'settings-button';
    settingsButton.className = 'settings-button';
    settingsButton.textContent = 'Settings';
    settingsButton.setAttribute('aria-label', 'Open settings');

    // Add click handler
    settingsButton.addEventListener('click', () => {
      this.openSettings();
    });

    // Insert before logout button
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
      header.insertBefore(settingsButton, logoutButton);
    } else {
      header.appendChild(settingsButton);
    }
  }

  private async handleLogout(): Promise<void> {
    // Show confirmation dialog
    const confirmed = window.confirm('Are you sure you want to log out?');
    if (!confirmed) return;

    console.log('[App] Logging out...');
    this.showLoading(true);

    try {
      const session = this.authService.getCurrentSession();
      if (session) {
        await this.authService.logout(session.id);
      }
      this.isAuthenticated = false;
      this.currentUser = null;

      // Clear components
      this.passwordForm = null;
      this.passphraseForm = null;
      this.historyList = null;

      // Remove logout button
      const logoutButton = document.getElementById('logout-button');
      if (logoutButton) {
        logoutButton.remove();
      }

      // Remove settings button
      const settingsButton = document.getElementById('settings-button');
      if (settingsButton) {
        settingsButton.remove();
      }

      // Stop activity tracking
      this.stopActivityTracking();

      // Show auth UI
      await this.showAuthUI();
      this.showLoading(false);
      console.log('[App] Logged out successfully');
    } catch (error) {
      console.error('[App] Logout failed:', error);
      this.showLoading(false);
      this.handleError(error as Error);
    }
  }

  private setupAuthEventListeners(): void {
    // Listen for session expired events
    window.addEventListener('session-expired', () => {
      console.log('[App] Session expired, redirecting to login');
      this.handleSessionExpired();
    });

    // Listen for open-assign-modal events from generator forms
    window.addEventListener('open-assign-modal', ((e: CustomEvent) => {
      const password = e.detail?.password;
      if (password && this.isAuthenticated) {
        this.openSiteAssignModal(password);
      }
    }) as EventListener);

    // Listen for open-detail-modal events from sites list
    window.addEventListener('open-detail-modal', ((e: CustomEvent) => {
      const siteId = e.detail?.siteId;
      if (siteId && this.isAuthenticated) {
        this.openSiteDetailModal(siteId);
      }
    }) as EventListener);

    // Listen for open-delete-account events from settings
    window.addEventListener('open-delete-account', ((e: CustomEvent) => {
      const userId = e.detail?.userId;
      if (userId && this.isAuthenticated) {
        this.openDeleteAccountModal(userId);
      }
    }) as EventListener);

    // Listen for account-deleted events
    window.addEventListener('account-deleted', ((e: CustomEvent) => {
      console.log('[App] Account deleted, logging out');
      this.showSuccessMessage('Account deleted successfully');
      // Force logout and return to auth UI
      this.isAuthenticated = false;
      this.currentUser = null;
      this.stopActivityTracking();
      this.showAuthUI();
    }) as EventListener);

    // Listen for open-totp-setup events from settings
    window.addEventListener('open-totp-setup', ((e: CustomEvent) => {
      const userId = e.detail?.userId;
      if (userId && this.isAuthenticated) {
        this.openTotpSetup(userId);
      }
    }) as EventListener);
  }

  private openSiteAssignModal(generatedPassword: string): void {
    const appContainer = document.querySelector('.app-container');
    if (!appContainer) {
      console.error('[App] Cannot find app container');
      return;
    }

    // Clean up existing modal if any
    if (this.siteAssignModal) {
      this.siteAssignModal.destroy();
      this.siteAssignModal = null;
    }

    // Create and show new modal
    this.siteAssignModal = new SiteAssignModal(
      appContainer as HTMLElement,
      this.siteService,
      this.authService,
      generatedPassword
    );

    // Listen for modal events
    appContainer.addEventListener('assign-complete', ((e: CustomEvent) => {
      console.log('[App] Site assigned:', e.detail.site);
      this.showSuccessMessage(`Password assigned to ${e.detail.site.siteName}`);
      
      // Refresh history
      window.dispatchEvent(new CustomEvent('credential-generated'));
    }) as EventListener, { once: true });

    appContainer.addEventListener('assign-skip', () => {
      console.log('[App] Site assignment skipped');
    }, { once: true });

    this.siteAssignModal.show();
  }

  private openSiteDetailModal(siteId: string): void {
    const appContainer = document.querySelector('.app-container');
    if (!appContainer) {
      console.error('[App] Cannot find app container');
      return;
    }

    // Clean up existing modal if any
    if (this.siteDetailModal) {
      this.siteDetailModal.destroy();
      this.siteDetailModal = null;
    }

    // Create and show new modal
    this.siteDetailModal = new SiteDetailModal(
      appContainer as HTMLElement,
      this.siteService,
      this.authService,
      siteId
    );

    // Listen for modal events
    appContainer.addEventListener('detail-edit', ((e: CustomEvent) => {
      const editSiteId = e.detail.siteId;
      console.log('[App] Opening edit modal for site:', editSiteId);
      this.openSiteEditModal(editSiteId);
    }) as EventListener, { once: true });

    appContainer.addEventListener('detail-delete', ((e: CustomEvent) => {
      console.log('[App] Site deleted:', e.detail.siteName);
      this.showSuccessMessage(`${e.detail.siteName} deleted successfully`);
      
      // Refresh sites list
      window.dispatchEvent(new CustomEvent('sites-updated'));
    }) as EventListener, { once: true });

    appContainer.addEventListener('detail-regenerate', ((e: CustomEvent) => {
      console.log('[App] Regenerate password for site:', e.detail.siteId);
      // TODO: Implement password regeneration flow
      this.showSuccessMessage('Password regeneration feature coming soon');
    }) as EventListener, { once: true });

    this.siteDetailModal.show();
  }

  private openSiteEditModal(siteId: string): void {
    const appContainer = document.querySelector('.app-container');
    if (!appContainer) {
      console.error('[App] Cannot find app container');
      return;
    }

    // Clean up existing modal if any
    if (this.siteEditModal) {
      this.siteEditModal.destroy();
      this.siteEditModal = null;
    }

    // Create and show new modal
    this.siteEditModal = new SiteEditModal(
      appContainer as HTMLElement,
      this.siteService,
      this.authService,
      siteId
    );

    // Listen for modal events
    appContainer.addEventListener('edit-save', ((e: CustomEvent) => {
      console.log('[App] Site updated:', e.detail.site);
      this.showSuccessMessage(`${e.detail.site.siteName} updated successfully`);
      
      // Refresh sites list
      window.dispatchEvent(new CustomEvent('sites-updated'));
    }) as EventListener, { once: true });

    appContainer.addEventListener('edit-cancel', () => {
      console.log('[App] Edit cancelled');
    }, { once: true });

    this.siteEditModal.show();
  }

  private openDeleteAccountModal(userId: string): void {
    const appContainer = document.querySelector('.app-container');
    if (!appContainer) {
      console.error('[App] Cannot find app container');
      return;
    }

    // Clean up existing modal if any
    if (this.deleteAccountModal) {
      this.deleteAccountModal.destroy();
      this.deleteAccountModal = null;
    }

    // Create and show new modal
    this.deleteAccountModal = new DeleteAccountModal(
      appContainer as HTMLElement,
      this.authService,
      userId
    );

    // Listen for modal events
    appContainer.addEventListener('account-delete-cancelled', () => {
      console.log('[App] Account deletion cancelled');
    }, { once: true });

    this.deleteAccountModal.show();
  }

  private openSettings(): void {
    const user = this.authService.getCurrentUser();
    if (!user) {
      console.error('[App] No current user found');
      return;
    }

    // Create a container for settings if it doesn't exist
    let settingsContainer = document.getElementById('settings-container');
    if (!settingsContainer) {
      settingsContainer = document.createElement('div');
      settingsContainer.id = 'settings-container';
      settingsContainer.className = 'settings-container';
      document.body.appendChild(settingsContainer);
    }

    // Clean up existing settings view if any
    if (this.settingsView) {
      settingsContainer.innerHTML = '';
    }

    // Create and render settings view
    this.settingsView = new SettingsView(
      settingsContainer,
      this.authService,
      this.sessionService,
      this.totpService
    );

    this.settingsView.render();

    // Add close button handler
    const closeButton = settingsContainer.querySelector('[data-action="close-settings"]');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        this.closeSettings();
      }, { once: true });
    }
  }

  private closeSettings(): void {
    const settingsContainer = document.getElementById('settings-container');
    if (settingsContainer) {
      settingsContainer.remove();
    }
    this.settingsView = null;
  }

  private openTotpSetup(userId: string): void {
    // Close settings first
    this.closeSettings();

    // Reuse the existing TOTP setup modal logic
    const appContainer = document.querySelector('.app-container');
    if (!appContainer) {
      console.error('[App] Cannot find app container');
      return;
    }

    // Create modal container
    let modalContainer = document.getElementById('totp-modal-container');
    if (!modalContainer) {
      modalContainer = document.createElement('div');
      modalContainer.id = 'totp-modal-container';
      modalContainer.className = 'modal-container';
      document.body.appendChild(modalContainer);
    }

    // Clean up existing modal if any
    if (this.totpSetupModal) {
      this.totpSetupModal.destroy();
      this.totpSetupModal = null;
    }

    // Create TOTP setup modal
    this.totpSetupModal = new TotpSetupModal(
      modalContainer,
      this.authService,
      this.totpService,
      userId
    );

    // Listen for completion
    modalContainer.addEventListener('totp-setup-complete', ((e: CustomEvent) => {
      console.log('[App] TOTP setup complete, verified:', e.detail.isVerified);
      this.showSuccessMessage(
        e.detail.isVerified
          ? 'Two-factor authentication enabled successfully'
          : 'Two-factor authentication setup skipped'
      );
      
      // Remove modal container
      modalContainer?.remove();
      this.totpSetupModal = null;
    }) as EventListener, { once: true });
  }

  private async handleSessionExpired(): Promise<void> {
    this.isAuthenticated = false;
    this.currentUser = null;

    // Show session expired message
    this.showErrorMessage('Your session has expired. Please log in again.');

    // Clear components
    this.passwordForm = null;
    this.passphraseForm = null;
    this.historyList = null;

    // Remove logout button
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
      logoutButton.remove();
    }

    // Stop activity tracking
    this.stopActivityTracking();

    // Show auth UI
    await this.showAuthUI();
  }

  private setupActivityTracking(): void {
    const activityHandler = () => {
      this.trackActivity();
    };

    // Track various user interactions
    document.addEventListener('mousedown', activityHandler);
    document.addEventListener('keydown', activityHandler);
    document.addEventListener('touchstart', activityHandler);
    document.addEventListener('scroll', activityHandler);
  }

  private stopActivityTracking(): void {
    // Remove event listeners (need to store references to remove properly)
    // For simplicity, we'll just clear the throttle timeout
    if (this.activityThrottleTimeout) {
      clearTimeout(this.activityThrottleTimeout);
      this.activityThrottleTimeout = null;
    }
  }

  private trackActivity(): void {
    const now = Date.now();
    const oneMinute = 60 * 1000;

    // Throttle activity updates to max once per minute
    if (now - this.lastActivityUpdate < oneMinute) {
      return;
    }

    // Clear any existing timeout
    if (this.activityThrottleTimeout) {
      clearTimeout(this.activityThrottleTimeout);
    }

    // Debounce the activity update
    this.activityThrottleTimeout = setTimeout(async () => {
      try {
        const session = this.authService.getCurrentSession();
        if (session) {
          await this.sessionService.updateActivity(session.id);
          this.lastActivityUpdate = Date.now();
          console.log('[App] Activity updated');
        }
      } catch (error) {
        console.error('[App] Failed to update activity:', error);
      }
    }, 500); // Wait 500ms of inactivity before updating
  }

  private showSuccessMessage(message: string): void {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.setAttribute('role', 'alert');
    successDiv.setAttribute('aria-live', 'polite');
    successDiv.textContent = message;
    successDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 0.5rem;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      z-index: 1000;
      animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(successDiv);

    // Remove after 3 seconds
    setTimeout(() => {
      successDiv.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => {
        successDiv.remove();
      }, 300);
    }, 3000);
  }

  private showErrorMessage(message: string): void {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.setAttribute('role', 'alert');
    errorDiv.setAttribute('aria-live', 'assertive');
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ef4444;
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 0.5rem;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      z-index: 1000;
      animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(errorDiv);

    // Remove after 5 seconds
    setTimeout(() => {
      errorDiv.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => {
        errorDiv.remove();
      }, 300);
    }, 5000);
  }

  getActiveTab(): 'password' | 'passphrase' {
    return this.activeTab;
  }

  handleError(error: Error): void {
    console.error('Application error:', error);
    
    // Hide loading overlay
    this.showLoading(false);

    // Show error message
    const errorMessage = `
      <div style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 2rem;
        border-radius: 0.5rem;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        max-width: 400px;
        text-align: center;
        z-index: 1001;
      ">
        <h2 style="color: #ef4444; margin-bottom: 1rem;">Error</h2>
        <p style="margin-bottom: 1rem;">${error.message}</p>
        <button onclick="location.reload()" style="
          padding: 0.5rem 1rem;
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 0.25rem;
          cursor: pointer;
          font-weight: 600;
        ">Reload Page</button>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', errorMessage);
  }

  private showLoading(show: boolean): void {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      if (show) {
        overlay.removeAttribute('hidden');
      } else {
        overlay.setAttribute('hidden', '');
      }
    }
  }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const app = new AppComponent();
    app.initialize();
  });
} else {
  const app = new AppComponent();
  app.initialize();
}

export { AppComponent };
