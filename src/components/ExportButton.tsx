import React from 'react';
import { PaceNote } from '../types';
import { exportToPDF, exportToText } from '../utils/exportUtils';

interface ExportButtonProps {
  paceNotes: PaceNote[];
  routeName?: string;
}

const ExportButton: React.FC<ExportButtonProps> = ({ paceNotes, routeName = 'Rally Route' }) => {
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

  if (paceNotes.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Export Options</h3>
      
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleExportPDF}
          className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors flex items-center justify-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Export PDF</span>
        </button>
        
        <button
          onClick={handleExportText}
          className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors flex items-center justify-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Export Text</span>
        </button>
      </div>
      
      <p className="text-sm text-gray-500 mt-3">
        Export your pace notes as a PDF for printing or as a text file for digital use.
      </p>
    </div>
  );
};

export default ExportButton;
