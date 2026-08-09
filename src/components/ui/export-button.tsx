
import React from 'react';
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ExportButtonProps {
  data: any[];
  filename: string;
  format?: 'csv' | 'json';
}

const ExportButton: React.FC<ExportButtonProps> = ({ 
  data, 
  filename, 
  format = 'csv' 
}) => {
  const { toast } = useToast();

  const exportData = () => {
    try {
      let content = '';
      let mimeType = '';

      if (format === 'csv') {
        if (data.length === 0) {
          toast({
            title: "No Data",
            description: "No data available to export",
            variant: "destructive"
          });
          return;
        }

        const headers = Object.keys(data[0]).join(',');
        const rows = data.map(item => 
          Object.values(item).map(value => 
            typeof value === 'string' && value.includes(',') 
              ? `"${value}"` 
              : value
          ).join(',')
        );
        content = [headers, ...rows].join('\n');
        mimeType = 'text/csv';
      } else {
        content = JSON.stringify(data, null, 2);
        mimeType = 'application/json';
      }

      const blob = new Blob([content], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: `Data exported as ${format.toUpperCase()} file`
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export data",
        variant: "destructive"
      });
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={exportData}>
      <Download className="h-4 w-4 mr-2" />
      Export {format.toUpperCase()}
    </Button>
  );
};

export default ExportButton;
