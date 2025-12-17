import type { PassphraseConfig } from '../models/PassphraseConfig';
import { DEFAULT_PASSPHRASE_CONFIG } from '../models/PassphraseConfig';
import { PassphraseGenerator } from '../services/passphraseGenerator';
import { Database } from '../services/database';
import { copyToClipboard } from '../services/clipboard';

export class PassphraseFormComponent {
  private config: PassphraseConfig = { ...DEFAULT_PASSPHRASE_CONFIG };
  private generator = new PassphraseGenerator();
  private currentPassphrase = '';

  constructor(private database: Database) {
    this.setupEventListeners();
    this.updateUI();
  }

  private setupEventListeners(): void {
    // Word count slider
    const wordsSlider = document.getElementById('passphrase-words') as HTMLInputElement;
    const wordsValue = document.getElementById('passphrase-words-value');
    wordsSlider?.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      this.config.wordCount = value;
      if (wordsValue) wordsValue.textContent = value.toString();
      this.updateValidation();
    });

    // Options checkboxes
    document.getElementById('passphrase-uppercase')?.addEventListener('change', (e) => {
      this.config.includeUppercase = (e.target as HTMLInputElement).checked;
      this.updateValidation();
    });

    document.getElementById('passphrase-numbers')?.addEventListener('change', (e) => {
      this.config.includeNumbers = (e.target as HTMLInputElement).checked;
      this.updateValidation();
    });

    // Separator input
    const separatorInput = document.getElementById('passphrase-separator') as HTMLInputElement;
    separatorInput?.addEventListener('input', (e) => {
      this.config.separator = (e.target as HTMLInputElement).value;
      this.updateValidation();
    });

    // Generate button
    document.getElementById('passphrase-generate-btn')?.addEventListener('click', () => {
      this.generate();
    });

    // Reset button
    document.getElementById('passphrase-reset-btn')?.addEventListener('click', () => {
      this.reset();
    });

    // Copy button
    document.getElementById('passphrase-copy-btn')?.addEventListener('click', () => {
      this.copyPassphrase();
    });

    // Keyboard navigation: Enter key to generate
    const form = document.getElementById('passphrase-form');
    form?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.generate();
      }
    });
  }

  getConfig(): PassphraseConfig {
    return { ...this.config };
  }

  setConfig(config: PassphraseConfig): void {
    this.config = { ...config };
    this.updateUI();
  }

  reset(): void {
    this.config = { ...DEFAULT_PASSPHRASE_CONFIG };
    this.updateUI();
    this.currentPassphrase = '';
    
    const resultDiv = document.getElementById('passphrase-result');
    if (resultDiv) {
      resultDiv.innerHTML = '<span class="result-placeholder">Click "Generate Passphrase" to create a passphrase</span>';
    }
    
    const copyBtn = document.getElementById('passphrase-copy-btn') as HTMLButtonElement;
    if (copyBtn) copyBtn.disabled = true;
  }

  generate(): string {
    try {
      this.currentPassphrase = this.generator.generate(this.config);
      
      // Display result
      const resultDiv = document.getElementById('passphrase-result');
      if (resultDiv) {
        resultDiv.textContent = this.currentPassphrase;
      }
      
      // Enable copy button
      const copyBtn = document.getElementById('passphrase-copy-btn') as HTMLButtonElement;
      if (copyBtn) copyBtn.disabled = false;
      
      // Save to database
      this.database.saveCredential({
        type: 'passphrase',
        value: this.currentPassphrase,
        timestamp: Date.now(),
        config: JSON.stringify(this.config),
      }).catch(err => {
        console.error('Failed to save to database:', err);
      });
      
      // Trigger history refresh event
      window.dispatchEvent(new CustomEvent('credential-generated'));
      
      return this.currentPassphrase;
    } catch (error) {
      console.error('Failed to generate passphrase:', error);
      const errorsDiv = document.getElementById('passphrase-errors');
      if (errorsDiv) {
        errorsDiv.textContent = error instanceof Error ? error.message : 'Failed to generate passphrase';
      }
      return '';
    }
  }

  async copyPassphrase(): Promise<void> {
    if (!this.currentPassphrase) return;
    
    const result = await copyToClipboard(this.currentPassphrase);
    const feedback = document.getElementById('passphrase-copy-feedback');
    if (feedback) {
      feedback.textContent = result.message;
      setTimeout(() => {
        feedback.textContent = '';
      }, 3000);
    }
  }

  getValidationErrors(): string[] {
    const validation = this.generator.validate(this.config);
    return validation.errors;
  }

  private updateValidation(): void {
    const errors = this.getValidationErrors();
    const errorsDiv = document.getElementById('passphrase-errors');
    const generateBtn = document.getElementById('passphrase-generate-btn') as HTMLButtonElement;
    
    if (errorsDiv) {
      if (errors.length > 0) {
        errorsDiv.innerHTML = '<ul>' + errors.map(e => `<li>${e}</li>`).join('') + '</ul>';
        if (generateBtn) generateBtn.disabled = true;
      } else {
        errorsDiv.innerHTML = '';
        if (generateBtn) generateBtn.disabled = false;
      }
    }
  }

  private updateUI(): void {
    // Update word count slider
    const wordsSlider = document.getElementById('passphrase-words') as HTMLInputElement;
    const wordsValue = document.getElementById('passphrase-words-value');
    if (wordsSlider) wordsSlider.value = this.config.wordCount.toString();
    if (wordsValue) wordsValue.textContent = this.config.wordCount.toString();

    // Update checkboxes
    (document.getElementById('passphrase-uppercase') as HTMLInputElement).checked = this.config.includeUppercase;
    (document.getElementById('passphrase-numbers') as HTMLInputElement).checked = this.config.includeNumbers;

    // Update separator
    const separatorInput = document.getElementById('passphrase-separator') as HTMLInputElement;
    if (separatorInput) separatorInput.value = this.config.separator;

    this.updateValidation();
  }
}
