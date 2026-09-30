/**
 * Utility to trigger a download of text content as a file.
 * 
 * @param content The text content to be downloaded
 * @param filename The name of the file (e.g., 'data.json')
 * @param mimeType The MIME type of the content (e.g., 'application/json', 'text/plain')
 */
export function exportToFile(content: string, filename: string, mimeType: string = 'text/plain') {
  try {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    // Append to body, click, and remove to ensure it works across all browsers
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Defer revocation — some browsers (notably Firefox) initiate the download
    // asynchronously after click(), so immediate revocation can produce 0-byte files
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    console.error('Failed to export file:', error);
  }
}
