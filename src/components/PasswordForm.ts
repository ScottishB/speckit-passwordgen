import type { PasswordConfig } from '../models/PasswordConfig';
import { DEFAULT_PASSWORD_CONFIG } from '../models/PasswordConfig';
import { PasswordGenerator } from '../services/passwordGenerator';
import { Database } from '../services/database';
import { copyToClipboard } from '../services/clipboard';

export class PasswordFormComponent {
  private config: PasswordConfig = { ...DEFAULT_PASSWORD_CONFIG };
  private generator = new PasswordGenerator();
  private currentPassword = '';

  constructor(private database: Database) {
    this.setupEventListeners();
    this.updateUI();
  }

  private setupEventListeners(): void {
    // Length slider
    const lengthSlider = document.getElementById('password-length') as HTMLInputElement;
    const lengthValue = document.getElementById('password-length-value');
    lengthSlider?.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      this.config.length = value;
      if (lengthValue) lengthValue.textContent = value.toString();
      this.updateValidation();
    });

    // Character type checkboxes
    document.getElementById('password-uppercase')?.addEventListener('change', (e) => {
      this.config.includeUppercase = (e.target as HTMLInputElement).checked;
      this.updateValidation();
    });

    document.getElementById('password-lowercase')?.addEventListener('change', (e) => {
      this.config.includeLowercase = (e.target as HTMLInputElement).checked;
      this.updateValidation();
    });

    document.getElementById('password-numbers')?.addEventListener('change', (e) => {
      this.config.includeNumbers = (e.target as HTMLInputElement).checked;
      if (!this.config.includeNumbers) {
        this.config.minNumbers = 0;
        const minNumbersSlider = document.getElementById('password-min-numbers') as HTMLInputElement;
        if (minNumbersSlider) minNumbersSlider.value = '0';
        const minNumbersValue = document.getElementById('password-min-numbers-value');
        if (minNumbersValue) minNumbersValue.textContent = '0';
      }
      this.updateValidation();
    });

    document.getElementById('password-special')?.addEventListener('change', (e) => {
      this.config.includeSpecialChars = (e.target as HTMLInputElement).checked;
      if (!this.config.includeSpecialChars) {
        this.config.minSpecialChars = 0;
        const minSpecialSlider = document.getElementById('password-min-special') as HTMLInputElement;
        if (minSpecialSlider) minSpecialSlider.value = '0';
        const minSpecialValue = document.getElementById('password-min-special-value');
        if (minSpecialValue) minSpecialValue.textContent = '0';
      }
      this.updateValidation();
    });

    // Minimum sliders
    const minNumbersSlider = document.getElementById('password-min-numbers') as HTMLInputElement;
    const minNumbersValue = document.getElementById('password-min-numbers-value');
    minNumbersSlider?.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      this.config.minNumbers = value;
      if (minNumbersValue) minNumbersValue.textContent = value.toString();
      this.updateValidation();
    });

    const minSpecialSlider = document.getElementById('password-min-special') as HTMLInputElement;
    const minSpecialValue = document.getElementById('password-min-special-value');
    minSpecialSlider?.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      this.config.minSpecialChars = value;
      if (minSpecialValue) minSpecialValue.textContent = value.toString();
      this.updateValidation();
    });

    // Generate button
    document.getElementById('password-generate-btn')?.addEventListener('click', () => {
      this.generate();
    });

    // Reset button
    document.getElementById('password-reset-btn')?.addEventListener('click', () => {
      this.reset();
    });

    // Copy button
    document.getElementById('password-copy-btn')?.addEventListener('click', () => {
      this.copyPassword();
    });

    // Assign to Site button
    document.getElementById('password-assign-btn')?.addEventListener('click', () => {
      this.assignToSite();
    });

    // Keyboard navigation: Enter key to generate
    const form = document.getElementById('password-form');
    form?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.generate();
      }
    });
  }

  getConfig(): PasswordConfig {
    return { ...this.config };
  }

  setConfig(config: PasswordConfig): void {
    this.config = { ...config };
    this.updateUI();
  }

  reset(): void {
    this.config = { ...DEFAULT_PASSWORD_CONFIG };
    this.updateUI();
    this.currentPassword = '';
    
    const resultDiv = document.getElementById('password-result');
    if (resultDiv) {
      resultDiv.innerHTML = '<span class="result-placeholder">Click "Generate Password" to create a password</span>';
    }
    
    const copyBtn = document.getElementById('password-copy-btn') as HTMLButtonElement;
    if (copyBtn) copyBtn.disabled = true;
    
    const assignBtn = document.getElementById('password-assign-btn') as HTMLButtonElement;
    if (assignBtn) {
      assignBtn.disabled = true;
      assignBtn.style.display = 'none';
    }
  }

  assignToSite(): void {
    if (!this.currentPassword) return;
    
    // Dispatch event for main app to open SiteAssignModal
    window.dispatchEvent(new CustomEvent('open-assign-modal', {
      detail: { password: this.currentPassword }
    }));
  }

  generate(): string {
    try {
      this.currentPassword = this.generator.generate(this.config);
      
      // Display result
      const resultDiv = document.getElementById('password-result');
      if (resultDiv) {
        resultDiv.textContent = this.currentPassword;
      }
      
      // Enable copy and assign buttons
      const copyBtn = document.getElementById('password-copy-btn') as HTMLButtonElement;
      if (copyBtn) copyBtn.disabled = false;
      
      const assignBtn = document.getElementById('password-assign-btn') as HTMLButtonElement;
      if (assignBtn) {
        assignBtn.disabled = false;
        assignBtn.style.display = 'inline-block';
      }
      
      // Save to database
      this.database.saveCredential({
        type: 'password',
        value: this.currentPassword,
        timestamp: Date.now(),
        config: JSON.stringify(this.config),
      }).catch(err => {
        console.error('Failed to save to database:', err);
      });
      
      // Trigger history refresh event
      window.dispatchEvent(new CustomEvent('credential-generated'));
      
      return this.currentPassword;
    } catch (error) {
      console.error('Failed to generate password:', error);
      const errorsDiv = document.getElementById('password-errors');
      if (errorsDiv) {
        errorsDiv.textContent = error instanceof Error ? error.message : 'Failed to generate password';
      }
      return '';
    }
  }

  async copyPassword(): Promise<void> {
    if (!this.currentPassword) return;
    
    const result = await copyToClipboard(this.currentPassword);
    const feedback = document.getElementById('password-copy-feedback');
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
    const errorsDiv = document.getElementById('password-errors');
    const generateBtn = document.getElementById('password-generate-btn') as HTMLButtonElement;
    
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
    // Update length slider
    const lengthSlider = document.getElementById('password-length') as HTMLInputElement;
    const lengthValue = document.getElementById('password-length-value');
    if (lengthSlider) lengthSlider.value = this.config.length.toString();
    if (lengthValue) lengthValue.textContent = this.config.length.toString();

    // Update checkboxes
    (document.getElementById('password-uppercase') as HTMLInputElement).checked = this.config.includeUppercase;
    (document.getElementById('password-lowercase') as HTMLInputElement).checked = this.config.includeLowercase;
    (document.getElementById('password-numbers') as HTMLInputElement).checked = this.config.includeNumbers;
    (document.getElementById('password-special') as HTMLInputElement).checked = this.config.includeSpecialChars;

    // Update minimum sliders
    const minNumbersSlider = document.getElementById('password-min-numbers') as HTMLInputElement;
    const minNumbersValue = document.getElementById('password-min-numbers-value');
    if (minNumbersSlider) minNumbersSlider.value = this.config.minNumbers.toString();
    if (minNumbersValue) minNumbersValue.textContent = this.config.minNumbers.toString();

    const minSpecialSlider = document.getElementById('password-min-special') as HTMLInputElement;
    const minSpecialValue = document.getElementById('password-min-special-value');
    if (minSpecialSlider) minSpecialSlider.value = this.config.minSpecialChars.toString();
    if (minSpecialValue) minSpecialValue.textContent = this.config.minSpecialChars.toString();

    this.updateValidation();
  }
}
