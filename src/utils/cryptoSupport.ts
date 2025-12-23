/**
 * Web Crypto API Feature Detection Utility
 * 
 * Detects browser support for cryptographic operations required by the app.
 * Tests: crypto.subtle.importKey, encrypt, decrypt, deriveKey
 */

export interface CryptoSupportResult {
  supported: boolean;
  features: {
    cryptoAvailable: boolean;
    subtleAvailable: boolean;
    importKey: boolean;
    encrypt: boolean;
    decrypt: boolean;
    deriveKey: boolean;
  };
  browserInfo: {
    userAgent: string;
    platform: string;
  };
  minimumVersions: {
    chrome: string;
    firefox: string;
    safari: string;
    edge: string;
    ios: string;
    android: string;
  };
}

/**
 * Tests if crypto.subtle.importKey is supported
 */
async function testImportKey(): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new Uint8Array(32),
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    return key instanceof CryptoKey;
  } catch {
    return false;
  }
}

/**
 * Tests if crypto.subtle.encrypt is supported
 */
async function testEncrypt(): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new Uint8Array(32),
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(12),
      },
      key,
      new Uint8Array(16)
    );
    return encrypted instanceof ArrayBuffer;
  } catch {
    return false;
  }
}

/**
 * Tests if crypto.subtle.decrypt is supported
 */
async function testDecrypt(): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new Uint8Array(32),
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(12),
      },
      key,
      new Uint8Array(16)
    );
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(12),
      },
      key,
      encrypted
    );
    return decrypted instanceof ArrayBuffer;
  } catch {
    return false;
  }
}

/**
 * Tests if crypto.subtle.deriveKey (PBKDF2) is supported
 */
async function testDeriveKey(): Promise<boolean> {
  try {
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode('test'),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    const derivedKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: new Uint8Array(16),
        iterations: 1000,
        hash: 'SHA-256',
      },
      passwordKey,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    return derivedKey instanceof CryptoKey;
  } catch {
    return false;
  }
}

/**
 * Checks Web Crypto API support in the current browser
 */
export async function checkCryptoSupport(): Promise<CryptoSupportResult> {
  const cryptoAvailable = typeof crypto !== 'undefined';
  const subtleAvailable = cryptoAvailable && typeof crypto.subtle !== 'undefined';

  const features = {
    cryptoAvailable,
    subtleAvailable,
    importKey: false,
    encrypt: false,
    decrypt: false,
    deriveKey: false,
  };

  // Only run tests if crypto.subtle is available
  if (subtleAvailable) {
    [features.importKey, features.encrypt, features.decrypt, features.deriveKey] =
      await Promise.all([
        testImportKey(),
        testEncrypt(),
        testDecrypt(),
        testDeriveKey(),
      ]);
  }

  const allSupported =
    features.cryptoAvailable &&
    features.subtleAvailable &&
    features.importKey &&
    features.encrypt &&
    features.decrypt &&
    features.deriveKey;

  return {
    supported: allSupported,
    features,
    browserInfo: {
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      platform: typeof navigator !== 'undefined' ? navigator.platform : 'Unknown',
    },
    minimumVersions: {
      chrome: '37+',
      firefox: '34+',
      safari: '11+',
      edge: '79+',
      ios: '11+',
      android: '5.0+ (WebView 37+)',
    },
  };
}

/**
 * Gets a user-friendly error message for unsupported browsers
 */
export function getUnsupportedBrowserMessage(result: CryptoSupportResult): string {
  if (result.supported) {
    return '';
  }

  const messages: string[] = [
    '🔒 Secure Password Manager requires modern browser features',
    '',
  ];

  if (!result.features.cryptoAvailable) {
    messages.push('✗ Web Crypto API is not available');
  } else if (!result.features.subtleAvailable) {
    messages.push('✗ Web Crypto SubtleCrypto API is not available');
  } else {
    if (!result.features.importKey) messages.push('✗ Key import not supported');
    if (!result.features.encrypt) messages.push('✗ Encryption not supported');
    if (!result.features.decrypt) messages.push('✗ Decryption not supported');
    if (!result.features.deriveKey) messages.push('✗ Key derivation (PBKDF2) not supported');
  }

  messages.push('');
  messages.push('Minimum browser versions required:');
  messages.push(`• Chrome ${result.minimumVersions.chrome}`);
  messages.push(`• Firefox ${result.minimumVersions.firefox}`);
  messages.push(`• Safari ${result.minimumVersions.safari}`);
  messages.push(`• Edge ${result.minimumVersions.edge}`);
  messages.push(`• iOS Safari ${result.minimumVersions.ios}`);
  messages.push(`• Android ${result.minimumVersions.android}`);
  messages.push('');
  messages.push('Please update your browser to use this application.');

  return messages.join('\n');
}

/**
 * Displays a full-screen error overlay for unsupported browsers
 */
export function showUnsupportedBrowserError(result: CryptoSupportResult): void {
  const message = getUnsupportedBrowserMessage(result);
  const overlay = document.createElement('div');
  overlay.id = 'crypto-unsupported-overlay';
  overlay.innerHTML = `
    <style>
      #crypto-unsupported-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      #crypto-unsupported-content {
        background: white;
        border-radius: 12px;
        padding: 40px;
        max-width: 600px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        text-align: center;
      }
      #crypto-unsupported-content h1 {
        color: #333;
        margin-bottom: 20px;
        font-size: 24px;
      }
      #crypto-unsupported-content pre {
        text-align: left;
        background: #f5f5f5;
        padding: 20px;
        border-radius: 8px;
        overflow-x: auto;
        font-size: 14px;
        line-height: 1.6;
        color: #333;
      }
      #crypto-unsupported-content .icon {
        font-size: 64px;
        margin-bottom: 20px;
      }
    </style>
    <div id="crypto-unsupported-content">
      <div class="icon">🔒</div>
      <h1>Browser Not Supported</h1>
      <pre>${message}</pre>
    </div>
  `;
  document.body.appendChild(overlay);
}

/**
 * Initialize crypto support check on page load
 * Blocks app initialization if browser is unsupported
 */
export async function initializeCryptoCheck(): Promise<boolean> {
  const result = await checkCryptoSupport();

  if (!result.supported) {
    console.error('Web Crypto API not supported:', result);
    showUnsupportedBrowserError(result);
    return false;
  }

  console.log('✅ Web Crypto API fully supported');
  return true;
}
