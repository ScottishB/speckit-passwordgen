import { Database } from './services/database';
import { HistoryService } from './services/historyService';
import { PasswordFormComponent } from './components/PasswordForm';
import { PassphraseFormComponent } from './components/PassphraseForm';
import { HistoryListComponent } from './components/HistoryList';

class AppComponent {
  private database: Database;
  private historyService: HistoryService;
  private passwordForm: PasswordFormComponent | null = null;
  private passphraseForm: PassphraseFormComponent | null = null;
  private historyList: HistoryListComponent | null = null;
  private activeTab: 'password' | 'passphrase' = 'password';

  constructor() {
    this.database = new Database();
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

      // Initialize components
      console.log('[App] Initializing components...');
      this.passwordForm = new PasswordFormComponent(this.database);
      this.passphraseForm = new PassphraseFormComponent(this.database);
      this.historyList = new HistoryListComponent(this.historyService);
      console.log('[App] Components initialized');

      // Setup tab switching
      console.log('[App] Setting up tab switching...');
      this.setupTabSwitching();

      // Setup URL hash routing
      console.log('[App] Setting up hash routing...');
      this.setupHashRouting();

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
