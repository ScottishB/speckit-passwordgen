export async function copyToClipboard(text: string): Promise<{ success: boolean; message: string }> {
  // Try modern Clipboard API first
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return { success: true, message: 'Copied to clipboard!' };
    } catch (err) {
      // Fall through to fallback
    }
  }

  // Fallback for older browsers or insecure contexts
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.setAttribute('aria-hidden', 'true');
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    
    if (successful) {
      return { success: true, message: 'Copied to clipboard!' };
    } else {
      return { success: false, message: 'Failed to copy. Please copy manually.' };
    }
  } catch (err) {
    return { success: false, message: 'Failed to copy. Please copy manually.' };
  }
}
