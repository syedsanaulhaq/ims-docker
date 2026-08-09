import { utils, writeFile, WorkBook, WorkSheet } from 'xlsx';
import { notificationService } from './notificationService';

export interface ExportConfig {
  filename: string;
  data: any[];
  columns?: { key: string; header: string; width?: number }[];
  format: 'excel' | 'csv' | 'json' | 'pdf';
  title?: string;
  subtitle?: string;
}

export class DataExportService {
  private static instance: DataExportService;

  private constructor() {}

  public static getInstance(): DataExportService {
    if (!DataExportService.instance) {
      DataExportService.instance = new DataExportService();
    }
    return DataExportService.instance;
  }

  public async exportData(config: ExportConfig): Promise<void> {
    try {
      notificationService.info('Export Started', `Preparing ${config.format.toUpperCase()} export...`);

      switch (config.format) {
        case 'excel':
          await this.exportToExcel(config);
          break;
        case 'csv':
          await this.exportToCSV(config);
          break;
        case 'json':
          await this.exportToJSON(config);
          break;
        case 'pdf':
          await this.exportToPDF(config);
          break;
        default:
          throw new Error(`Unsupported export format: ${config.format}`);
      }

      notificationService.success(
        'Export Complete',
        `${config.filename} has been downloaded successfully`,
        {
          label: 'Export More',
          onClick: () => ,
        }
      );
    } catch (error) {
      console.error('Export error:', error);
      notificationService.error(
        'Export Failed',
        `Failed to export ${config.filename}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async exportToExcel(config: ExportConfig): Promise<void> {
    const workbook: WorkBook = utils.book_new();
    
    // Prepare data with headers
    const headers = config.columns?.map(col => col.header) || Object.keys(config.data[0] || {});
    const keys = config.columns?.map(col => col.key) || Object.keys(config.data[0] || {});
    
    const exportData = [
      headers,
      ...config.data.map(row => keys.map(key => row[key]))
    ];

    const worksheet: WorkSheet = utils.aoa_to_sheet(exportData);

    // Set column widths
    if (config.columns) {
      worksheet['!cols'] = config.columns.map(col => ({
        wch: col.width || 15
      }));
    }

    // Add title and subtitle
    if (config.title || config.subtitle) {
      const titleRows = [];
      if (config.title) {
        titleRows.push([config.title]);
        titleRows.push([]);
      }
      if (config.subtitle) {
        titleRows.push([config.subtitle]);
        titleRows.push([]);
      }
      
      utils.sheet_add_aoa(worksheet, titleRows, { origin: 'A1' });
      utils.sheet_add_aoa(worksheet, exportData, { origin: `A${titleRows.length + 1}` });
    }

    utils.book_append_sheet(workbook, worksheet, 'Data');
    
    const filename = config.filename.endsWith('.xlsx') ? config.filename : `${config.filename}.xlsx`;
    writeFile(workbook, filename);
  }

  private async exportToCSV(config: ExportConfig): Promise<void> {
    const headers = config.columns?.map(col => col.header) || Object.keys(config.data[0] || {});
    const keys = config.columns?.map(col => col.key) || Object.keys(config.data[0] || {});
    
    let csvContent = headers.join(',') + '\n';
    
    config.data.forEach(row => {
      const rowData = keys.map(key => {
        const value = row[key];
        // Escape commas and quotes in CSV
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvContent += rowData.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      const filename = config.filename.endsWith('.csv') ? config.filename : `${config.filename}.csv`;
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  private async exportToJSON(config: ExportConfig): Promise<void> {
    const jsonData = {
      metadata: {
        title: config.title,
        subtitle: config.subtitle,
        exportDate: new Date().toISOString(),
        recordCount: config.data.length,
      },
      data: config.data,
    };

    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { 
      type: 'application/json;charset=utf-8;' 
    });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      const filename = config.filename.endsWith('.json') ? config.filename : `${config.filename}.json`;
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  private async exportToPDF(config: ExportConfig): Promise<void> {
    // For PDF export, we'll create an HTML table and convert it
    const headers = config.columns?.map(col => col.header) || Object.keys(config.data[0] || {});
    const keys = config.columns?.map(col => col.key) || Object.keys(config.data[0] || {});
    
    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${config.title || 'Export'}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; }
          h2 { color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; font-weight: bold; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .meta { color: #666; font-size: 0.9em; margin-bottom: 20px; }
        </style>
      </head>
      <body>
    `;
    
    if (config.title) {
      htmlContent += `<h1>${config.title}</h1>`;
    }
    
    if (config.subtitle) {
      htmlContent += `<h2>${config.subtitle}</h2>`;
    }
    
    htmlContent += `
      <div class="meta">
        Generated on: ${new Date().toLocaleString()}<br>
        Total Records: ${config.data.length}
      </div>
      <table>
        <thead>
          <tr>
            ${headers.map(header => `<th>${header}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
    `;
    
    config.data.forEach(row => {
      htmlContent += '<tr>';
      keys.forEach(key => {
        htmlContent += `<td>${row[key] || ''}</td>`;
      });
      htmlContent += '</tr>';
    });
    
    htmlContent += `
        </tbody>
      </table>
      </body>
      </html>
    `;

    // Create a new window and print
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      printWindow.onload = () => {
        printWindow.print();
        printWindow.close();
      };
    } else {
      throw new Error('Unable to open print window. Please allow pop-ups.');
    }
  }

  // Quick export methods
  public exportUsersToExcel(users: any[]): Promise<void> {
    return this.exportData({
      filename: `users_export_${new Date().toISOString().split('T')[0]}`,
      data: users,
      format: 'excel',
      title: 'InvMIS Users Report',
      subtitle: `Generated on ${new Date().toLocaleDateString()}`,
      columns: [
        { key: 'username', header: 'Username', width: 15 },
        { key: 'fullName', header: 'Full Name', width: 25 },
        { key: 'email', header: 'Email', width: 30 },
        { key: 'role', header: 'Role', width: 15 },
        { key: 'officeName', header: 'Office', width: 20 },
        { key: 'wingName', header: 'Wing', width: 20 },
      ]
    });
  }

  public exportTendersToExcel(tenders: any[]): Promise<void> {
    return this.exportData({
      filename: `tenders_export_${new Date().toISOString().split('T')[0]}`,
      data: tenders,
      format: 'excel',
      title: 'InvMIS Tenders Report',
      subtitle: `Generated on ${new Date().toLocaleDateString()}`,
      columns: [
        { key: 'id', header: 'Tender ID', width: 12 },
        { key: 'title', header: 'Title', width: 30 },
        { key: 'status', header: 'Status', width: 15 },
        { key: 'totalValue', header: 'Total Value', width: 15 },
        { key: 'createdDate', header: 'Created Date', width: 15 },
        { key: 'deadline', header: 'Deadline', width: 15 },
      ]
    });
  }

  public exportInventoryToExcel(inventory: any[]): Promise<void> {
    return this.exportData({
      filename: `inventory_export_${new Date().toISOString().split('T')[0]}`,
      data: inventory,
      format: 'excel',
      title: 'InvMIS Inventory Report',
      subtitle: `Generated on ${new Date().toLocaleDateString()}`,
      columns: [
        { key: 'itemCode', header: 'Item Code', width: 15 },
        { key: 'description', header: 'Description', width: 30 },
        { key: 'currentStock', header: 'Current Stock', width: 15 },
        { key: 'unitPrice', header: 'Unit Price', width: 15 },
        { key: 'totalValue', header: 'Total Value', width: 15 },
        { key: 'lastUpdated', header: 'Last Updated', width: 15 },
      ]
    });
  }
}

// Export singleton instance
export const dataExportService = DataExportService.getInstance();