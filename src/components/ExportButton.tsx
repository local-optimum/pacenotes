import React from 'react';
import { PaceNote } from '../types';
import { exportToPDF, exportToText } from '../utils/exportUtils';

interface ExportButtonProps {
  paceNotes: PaceNote[];
  routeName?: string;
  disabled?: boolean;
}

const ExportButton: React.FC<ExportButtonProps> = ({ 
  paceNotes, 
  routeName = 'Rally Route',
  disabled = false 
}) => {
  const handleExportPDF = async () => {
    try {
      await exportToPDF(paceNotes, routeName);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
    }
  };

  const handleExportText = () => {
    try {
      exportToText(paceNotes, routeName);
    } catch (error) {
      console.error('Error exporting text:', error);
      alert('Failed to export text file. Please try again.');
    }
  };

  const hasNotes = paceNotes.length > 0;
  const buttonClass = disabled 
    ? "flex-1 bg-gray-300 text-gray-500 py-2 px-4 rounded-lg cursor-not-allowed flex items-center justify-center space-x-2"
    : "flex-1 py-2 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors flex items-center justify-center space-x-2";

  return (
    <div>
      <h3 className={`text-sm font-semibold mb-3 ${disabled ? 'text-gray-400' : 'text-gray-800'}`}>
        Export Options
      </h3>
      
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={disabled ? undefined : handleExportPDF}
          disabled={disabled}
          className={`${buttonClass} ${!disabled ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500' : ''}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Export PDF</span>
        </button>
        
        <button
          onClick={disabled ? undefined : handleExportText}
          disabled={disabled}
          className={`${buttonClass} ${!disabled ? 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500' : ''}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Export Text</span>
        </button>
      </div>
      
      <p className={`text-xs mt-2 ${disabled ? 'text-gray-400' : 'text-gray-500'}`}>
        {hasNotes ? 'Export your pace notes as PDF or text file' : 'Generate pace notes to enable export'}
      </p>
    </div>
  );
};

export default ExportButton;
