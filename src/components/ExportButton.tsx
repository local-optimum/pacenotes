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
    ? "flex-1 bg-gray-600 text-gray-400 py-3 px-4 rounded-xl cursor-not-allowed flex items-center justify-center space-x-2 border-2 border-gray-500"
    : "flex-1 py-3 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all transform hover:scale-105 flex items-center justify-center space-x-2 font-bold shadow-lg border-2";

  return (
    <div>
      <div className="flex items-center space-x-2 mb-4">
        <div className="bg-yellow-400 p-1 rounded-lg">
          <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
            <polyline points="14,2 14,8 20,8"/>
          </svg>
        </div>
        <h3 className={`text-base font-black uppercase tracking-wide ${disabled ? 'text-gray-400' : 'text-yellow-300'}`}>
          Export Rally Notes
        </h3>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={disabled ? undefined : handleExportPDF}
          disabled={disabled}
          className={`${buttonClass} ${!disabled ? 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-500 hover:to-red-600 focus:ring-red-500 border-red-500' : ''}`}
        >
          <div className="flex items-center space-x-2">
            <div className="bg-white/20 p-1 rounded">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
                <polyline points="14,2 14,8 20,8" fill="none" stroke="currentColor" strokeWidth="2"/>
                <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="2"/>
                <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="2"/>
                <line x1="10" y1="9" x2="8" y2="9" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
            <span className="uppercase tracking-wide font-black">PDF Rally Notes</span>
          </div>
        </button>
        
        <button
          onClick={disabled ? undefined : handleExportText}
          disabled={disabled}
          className={`${buttonClass} ${!disabled ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white hover:from-gray-500 hover:to-gray-600 focus:ring-gray-500 border-gray-500' : ''}`}
        >
          <div className="flex items-center space-x-2">
            <div className="bg-white/20 p-1 rounded">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="uppercase tracking-wide font-black">TXT File</span>
          </div>
        </button>
      </div>
      
      <div className={`text-xs mt-3 p-2 rounded-lg border ${disabled ? 'text-gray-400 bg-gray-800/50 border-gray-600' : 'text-yellow-300 bg-yellow-400/10 border-yellow-400/30'}`}>
        <div className="flex items-center space-x-1">
          <div className={`w-2 h-2 rounded-full ${disabled ? 'bg-gray-500' : 'bg-yellow-400 animate-pulse'}`}></div>
          <span className="font-medium uppercase tracking-wide">
            {hasNotes ? '✅ Ready for Export' : '⏳ Awaiting Stage Generation'}
          </span>
        </div>
        <div className="text-xs mt-1 opacity-80">
          {hasNotes ? 'Professional rally navigation files' : 'Select route points to begin'}
        </div>
      </div>
    </div>
  );
};

export default ExportButton;
