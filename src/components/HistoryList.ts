import { HistoryService } from '../services/historyService';
import { AuthService } from '../services/AuthService';
import { copyToClipboard } from '../services/clipboard';

export class HistoryListComponent {
  private currentFilter: 'all' | 'password' | 'passphrase' = 'all';

  constructor(
    private historyService: HistoryService,
    private authService: AuthService
  ) {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Filter buttons
    document.getElementById('history-filter-all')?.addEventListener('click', () => {
      this.filterByType('all');
    });

    document.getElementById('history-filter-password')?.addEventListener('click', () => {
      this.filterByType('password');
    });

    document.getElementById('history-filter-passphrase')?.addEventListener('click', () => {
      this.filterByType('passphrase');
    });

    // Listen for credential generation events
    window.addEventListener('credential-generated', () => {
      this.refresh();
    });

    // Initial load
    this.loadHistory();
  }

  async loadHistory(limit = 50): Promise<void> {
    try {
      const user = this.authService.getCurrentUser();
      if (!user) {
        this.renderError('Please log in to view history');
        return;
      }
      
      const entries = await this.historyService.getHistory(user.id, limit);
      this.renderHistory(entries);
    } catch (error) {
      console.error('Failed to load history:', error);
      this.renderError('Failed to load history');
    }
  }

  async filterByType(type: 'all' | 'password' | 'passphrase'): Promise<void> {
    this.currentFilter = type;

    // Update filter button states
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.remove('active');
    });

    const activeBtn = document.getElementById(`history-filter-${type}`);
    if (activeBtn) {
      activeBtn.classList.add('active');
    }

    try {
      const user = this.authService.getCurrentUser();
      if (!user) {
        this.renderError('Please log in to view history');
        return;
      }

      let entries;
      if (type === 'all') {
        entries = await this.historyService.getHistory(user.id);
      } else {
        entries = await this.historyService.getHistoryByType(user.id, type);
      }
      this.renderHistory(entries);
    } catch (error) {
      console.error('Failed to filter history:', error);
      this.renderError('Failed to filter history');
    }
  }

  async copyHistoryItem(id: number): Promise<void> {
    try {
      const user = this.authService.getCurrentUser();
      if (!user) {
        console.error('No user logged in');
        return;
      }

      const entries = await this.historyService.getHistory(user.id, 1000);
      const entry = entries.find(e => e.id === id);
      
      if (entry) {
        const result = await copyToClipboard(entry.value);
        
        // Show temporary feedback on the button
        const buttonElement = document.querySelector(`[data-action="copy"][data-history-id="${id}"]`);
        if (buttonElement) {
          const originalText = buttonElement.textContent;
          buttonElement.textContent = '✓ Copied!';
          buttonElement.classList.add('success');
          setTimeout(() => {
            buttonElement.textContent = originalText;
            buttonElement.classList.remove('success');
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Failed to copy history item:', error);
    }
  }

  async assignHistoryItem(id: number): Promise<void> {
    try {
      const user = this.authService.getCurrentUser();
      if (!user) {
        console.error('No user logged in');
        return;
      }

      const entries = await this.historyService.getHistory(user.id, 1000);
      const entry = entries.find(e => e.id === id);
      
      if (entry) {
        // Dispatch event to open site assignment modal with the password
        window.dispatchEvent(new CustomEvent('open-assign-modal', {
          detail: { password: entry.value }
        }));
      }
    } catch (error) {
      console.error('Failed to assign history item:', error);
    }
  }

  async refresh(): Promise<void> {
    if (this.currentFilter === 'all') {
      await this.loadHistory();
    } else {
      await this.filterByType(this.currentFilter);
    }
  }

  private renderHistory(entries: Array<{ id: number; type: string; preview: string; displayTimestamp: string }>): void {
    const historyList = document.getElementById('history-list');
    if (!historyList) return;

    if (entries.length === 0) {
      historyList.innerHTML = '<p class="history-empty">No history yet. Generate a password or passphrase to get started.</p>';
      return;
    }

    historyList.innerHTML = entries.map(entry => `
      <div 
        class="history-item" 
        data-history-id="${entry.id}"
        role="listitem"
        aria-label="${entry.type} generated ${entry.displayTimestamp}">
        <div class="history-item-header">
          <span class="history-item-type ${entry.type}">${entry.type}</span>
          <div class="history-item-timestamp">${entry.displayTimestamp}</div>
        </div>
        <div class="history-item-preview">${entry.preview}</div>
        <div class="history-item-actions">
          <button 
            type="button" 
            class="btn btn-copy-history" 
            data-action="copy" 
            data-history-id="${entry.id}"
            aria-label="Copy ${entry.type} to clipboard">
            Copy
          </button>
          <button 
            type="button" 
            class="btn btn-assign-history" 
            data-action="assign" 
            data-history-id="${entry.id}"
            aria-label="Assign ${entry.type} to a site">
            Assign to Site
          </button>
        </div>
      </div>
    `).join('');

    // Add click handlers for action buttons
    historyList.querySelectorAll('[data-action="copy"]').forEach(button => {
      const historyId = parseInt(button.getAttribute('data-history-id') || '0');
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        this.copyHistoryItem(historyId);
      });
    });

    historyList.querySelectorAll('[data-action="assign"]').forEach(button => {
      const historyId = parseInt(button.getAttribute('data-history-id') || '0');
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        this.assignHistoryItem(historyId);
      });
    });
  }

  private renderError(message: string): void {
    const historyList = document.getElementById('history-list');
    if (historyList) {
      historyList.innerHTML = `<p class="history-empty" style="color: var(--color-error);">${message}</p>`;
    }
  }
}
