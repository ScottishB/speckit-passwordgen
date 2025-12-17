import { HistoryService } from '../services/historyService';
import { copyToClipboard } from '../services/clipboard';

export class HistoryListComponent {
  private currentFilter: 'all' | 'password' | 'passphrase' = 'all';

  constructor(private historyService: HistoryService) {
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
      const entries = await this.historyService.getHistory(limit);
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
      let entries;
      if (type === 'all') {
        entries = await this.historyService.getHistory();
      } else {
        entries = await this.historyService.getHistoryByType(type);
      }
      this.renderHistory(entries);
    } catch (error) {
      console.error('Failed to filter history:', error);
      this.renderError('Failed to filter history');
    }
  }

  async copyHistoryItem(id: number): Promise<void> {
    try {
      const entries = await this.historyService.getHistory(1000);
      const entry = entries.find(e => e.id === id);
      
      if (entry) {
        const result = await copyToClipboard(entry.value);
        
        // Show temporary feedback on the item
        const itemElement = document.querySelector(`[data-history-id="${id}"]`);
        if (itemElement) {
          itemElement.textContent = result.message;
          setTimeout(() => {
            this.refresh();
          }, 1000);
        }
      }
    } catch (error) {
      console.error('Failed to copy history item:', error);
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
        tabindex="0"
        aria-label="${entry.type} generated ${entry.displayTimestamp}">
        <span class="history-item-type ${entry.type}">${entry.type}</span>
        <div class="history-item-preview">${entry.preview}</div>
        <div class="history-item-timestamp">${entry.displayTimestamp}</div>
      </div>
    `).join('');

    // Add click handlers to history items
    historyList.querySelectorAll('.history-item').forEach(item => {
      const historyId = parseInt(item.getAttribute('data-history-id') || '0');
      
      item.addEventListener('click', () => {
        this.copyHistoryItem(historyId);
      });

      item.addEventListener('keydown', (e) => {
        if ((e as KeyboardEvent).key === 'Enter' || (e as KeyboardEvent).key === ' ') {
          e.preventDefault();
          this.copyHistoryItem(historyId);
        }
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
