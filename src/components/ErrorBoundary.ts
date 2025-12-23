/**
 * Error Boundary Component
 * 
 * Catches unhandled JavaScript errors and displays user-friendly error messages.
 * Provides recovery options (reload or logout) and logs errors for debugging.
 * 
 * Usage:
 * ```typescript
 * const errorBoundary = new ErrorBoundary(document.body);
 * errorBoundary.initialize();
 * ```
 */

export interface ErrorInfo {
  message: string;
  stack?: string;
  timestamp: number;
  userAgent: string;
  url: string;
}

export class ErrorBoundary {
  private isProduction: boolean;
  private errorContainer: HTMLElement | null = null;
  private errorLog: ErrorInfo[] = [];
  private maxLogSize = 10;

  constructor(
    private rootElement: HTMLElement,
    private options: {
      isProduction?: boolean;
      onError?: (error: ErrorInfo) => void;
      maxErrors?: number;
    } = {}
  ) {
    this.isProduction = options.isProduction ?? (import.meta.env?.PROD || false);
  }

  /**
   * Initializes error boundary by setting up global error handlers
   */
  initialize(): void {
    // Handle uncaught errors
    window.addEventListener('error', (event: ErrorEvent) => {
      this.handleError(event.error || new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
      event.preventDefault();
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
      const error = event.reason instanceof Error 
        ? event.reason 
        : new Error(String(event.reason));
      
      this.handleError(error, { type: 'promise_rejection' });
      event.preventDefault();
    });

    // Handle SecurityError (common with crypto operations)
    this.setupCryptoErrorHandling();
  }

  /**
   * Handles an error by logging it and displaying UI
   */
  private handleError(error: Error, context?: Record<string, any>): void {
    const errorInfo: ErrorInfo = {
      message: error.message,
      stack: error.stack,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // Add to error log
    this.errorLog.push(errorInfo);
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }

    // Log to console in development
    if (!this.isProduction) {
      console.error('[ErrorBoundary] Caught error:', error);
      console.error('[ErrorBoundary] Context:', context);
      console.error('[ErrorBoundary] Stack:', error.stack);
    }

    // Call custom error handler if provided
    if (this.options.onError) {
      this.options.onError(errorInfo);
    }

    // Check if we should display error UI
    const shouldDisplay = this.shouldDisplayError(error);
    if (shouldDisplay) {
      this.displayErrorUI(error, context);
    }
  }

  /**
   * Determines if error should be displayed to user
   */
  private shouldDisplayError(error: Error): boolean {
    // Don't display for certain known non-critical errors
    const ignoredErrors = [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed',
    ];

    return !ignoredErrors.some(msg => error.message.includes(msg));
  }

  /**
   * Displays error UI to the user
   */
  private displayErrorUI(error: Error, context?: Record<string, any>): void {
    // Remove existing error UI if present
    if (this.errorContainer) {
      this.errorContainer.remove();
    }

    // Determine error type and message
    const { title, message, showLogout } = this.categorizeError(error);

    // Create error UI
    this.errorContainer = document.createElement('div');
    this.errorContainer.className = 'error-boundary';
    this.errorContainer.setAttribute('role', 'alert');
    this.errorContainer.setAttribute('aria-live', 'assertive');

    this.errorContainer.innerHTML = `
      <div class="error-boundary__overlay"></div>
      <div class="error-boundary__modal">
        <div class="error-boundary__icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
            <path d="M12 8V12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <circle cx="12" cy="16" r="1" fill="currentColor"/>
          </svg>
        </div>
        <h2 class="error-boundary__title">${this.escapeHtml(title)}</h2>
        <p class="error-boundary__message">${this.escapeHtml(message)}</p>
        ${!this.isProduction ? `
          <details class="error-boundary__details">
            <summary>Technical Details (Development)</summary>
            <pre class="error-boundary__stack">${this.escapeHtml(error.stack || error.message)}</pre>
          </details>
        ` : ''}
        <div class="error-boundary__actions">
          <button type="button" class="btn btn--primary" id="error-reload">
            Reload Page
          </button>
          ${showLogout ? `
            <button type="button" class="btn btn--secondary" id="error-logout">
              Logout
            </button>
          ` : ''}
        </div>
      </div>
    `;

    // Add to DOM
    document.body.appendChild(this.errorContainer);

    // Setup button handlers
    this.setupErrorUIHandlers(showLogout);

    // Focus on reload button for accessibility
    const reloadBtn = this.errorContainer.querySelector('#error-reload') as HTMLElement;
    reloadBtn?.focus();
  }

  /**
   * Categorizes error and returns appropriate UI messages
   */
  private categorizeError(error: Error): {
    title: string;
    message: string;
    showLogout: boolean;
  } {
    const errorMessage = error.message.toLowerCase();

    // Crypto/Security errors
    if (errorMessage.includes('crypto') || 
        errorMessage.includes('encryption') || 
        errorMessage.includes('decryption')) {
      return {
        title: 'Security Error',
        message: 'A security operation failed. This may be due to corrupted data or browser compatibility issues. Please try reloading the page.',
        showLogout: true,
      };
    }

    // Storage quota errors
    if (errorMessage.includes('quota') || 
        errorMessage.includes('storage') ||
        errorMessage.includes('localstorage')) {
      return {
        title: 'Storage Error',
        message: 'Your browser storage is full or unavailable. Please free up space by deleting old data or clearing browser storage.',
        showLogout: true,
      };
    }

    // Session errors
    if (errorMessage.includes('session') || 
        errorMessage.includes('authentication') ||
        errorMessage.includes('unauthorized')) {
      return {
        title: 'Session Error',
        message: 'Your session has expired or is invalid. Please log in again to continue.',
        showLogout: true,
      };
    }

    // Network errors
    if (errorMessage.includes('network') || 
        errorMessage.includes('fetch') ||
        errorMessage.includes('connection')) {
      return {
        title: 'Connection Error',
        message: 'Unable to connect to the server. Please check your internet connection and try again.',
        showLogout: false,
      };
    }

    // Generic error
    return {
      title: 'Something Went Wrong',
      message: 'An unexpected error occurred. Please try reloading the page. If the problem persists, try logging out and back in.',
      showLogout: true,
    };
  }

  /**
   * Sets up event handlers for error UI buttons
   */
  private setupErrorUIHandlers(showLogout: boolean): void {
    const reloadBtn = document.getElementById('error-reload');
    const logoutBtn = document.getElementById('error-logout');

    if (reloadBtn) {
      reloadBtn.addEventListener('click', () => {
        window.location.reload();
      });
    }

    if (logoutBtn && showLogout) {
      logoutBtn.addEventListener('click', () => {
        // Clear all storage
        try {
          localStorage.clear();
          sessionStorage.clear();
        } catch (e) {
          console.error('Failed to clear storage:', e);
        }
        
        // Redirect to login/home
        window.location.href = '/';
        window.location.reload();
      });
    }
  }

  /**
   * Sets up specific handling for crypto errors
   */
  private setupCryptoErrorHandling(): void {
    // Detect if Web Crypto API is available
    if (!window.crypto || !window.crypto.subtle) {
      this.handleError(new Error('Web Crypto API not supported'), {
        type: 'crypto_unsupported',
      });
    }
  }

  /**
   * Escapes HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Gets recent error log (useful for debugging)
   */
  getErrorLog(): ErrorInfo[] {
    return [...this.errorLog];
  }

  /**
   * Clears error log
   */
  clearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * Manually triggers error UI (useful for testing)
   */
  triggerError(error: Error): void {
    this.handleError(error);
  }

  /**
   * Dismisses error UI
   */
  dismissError(): void {
    if (this.errorContainer) {
      this.errorContainer.remove();
      this.errorContainer = null;
    }
  }

  /**
   * Cleans up error boundary
   */
  destroy(): void {
    this.dismissError();
    // Note: Can't remove global error handlers once added
    // This is intentional as errors should always be caught
  }
}
