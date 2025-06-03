export interface GoogleSheetsConfig {
  spreadsheetId: string;
  credentials: any;
}

export class GoogleSheetsService {
  private config: GoogleSheetsConfig;

  constructor(config: GoogleSheetsConfig) {
    this.config = config;
  }

  async syncOrderToSheets(order: any, orderItems: any[]) {
    try {
      // This would typically use the Google Sheets API
      // For now, we'll call our backend endpoint
      const response = await fetch('/api/sync-to-sheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId: order.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to sync to Google Sheets');
      }

      return await response.json();
    } catch (error) {
      console.error('Google Sheets sync error:', error);
      throw error;
    }
  }

  async exportToExcel(data: any[]) {
    // This would handle Excel export functionality
    // For now, we'll provide a basic CSV download
    const csvContent = this.convertToCSV(data);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `revenue-report-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private convertToCSV(data: any[]): string {
    if (!data.length) return '';

    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');
    
    const csvRows = data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escape commas and quotes in CSV
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    );

    return [csvHeaders, ...csvRows].join('\n');
  }
}

// Singleton instance
export const googleSheetsService = new GoogleSheetsService({
  spreadsheetId: import.meta.env.VITE_GOOGLE_SHEETS_ID || '',
  credentials: null, // This would be loaded from environment
});
