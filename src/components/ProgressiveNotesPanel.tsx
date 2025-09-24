import React, { useState, useEffect } from 'react';
import { PaceNote } from '../types';
import ExportButton from './ExportButton';

interface ProgressiveNotesPanelProps {
  paceNotes: PaceNote[];
  isGenerating: boolean;
  routeName?: string;
}

const ProgressiveNotesPanel: React.FC<ProgressiveNotesPanelProps> = ({
  paceNotes,
  isGenerating,
  routeName = 'Rally Route'
}) => {
  const [displayedNotes, setDisplayedNotes] = useState<PaceNote[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Progressive note display effect
  useEffect(() => {
    if (paceNotes.length === 0) {
      setDisplayedNotes([]);
      setCurrentIndex(0);
      return;
    }

    if (currentIndex < paceNotes.length) {
      const timer = setTimeout(() => {
        setDisplayedNotes(prev => [...prev, paceNotes[currentIndex]]);
        setCurrentIndex(prev => prev + 1);
      }, 150); // Add a note every 150ms for smooth animation

      return () => clearTimeout(timer);
    }
  }, [paceNotes, currentIndex]);

  // Reset when new notes come in
  useEffect(() => {
    setDisplayedNotes([]);
    setCurrentIndex(0);
  }, [paceNotes.length]);

  const formatNote = (note: PaceNote): string => {
    const elevation = note.elevation ? ` ${note.elevation}` : '';
    return `${note.distance}m: ${note.turnNumber} ${note.direction}${elevation}, ${note.surface}`;
  };

  const getTurnSeverityColor = (turnNumber: number): string => {
    switch (turnNumber) {
      case 1: return 'bg-red-500'; // Hairpin
      case 2: return 'bg-orange-500'; // Sharp
      case 3: return 'bg-yellow-500'; // Medium
      case 4: return 'bg-blue-500'; // Open
      case 5: return 'bg-green-500'; // Slight
      case 6: return 'bg-gray-500'; // Near straight
      default: return 'bg-gray-500';
    }
  };

  const getTurnDescription = (turnNumber: number): string => {
    switch (turnNumber) {
      case 1: return 'Hairpin (<30°)';
      case 2: return 'Sharp (30-60°)';
      case 3: return 'Medium (60-90°)';
      case 4: return 'Open (90-120°)';
      case 5: return 'Slight (120-150°)';
      case 6: return 'Near Straight (>150°)';
      default: return 'Unknown';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg h-full flex flex-col max-h-full">
      {/* Header */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Pace Notes</h2>
          {isGenerating && (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
              <span className="text-sm text-blue-600">Generating...</span>
            </div>
          )}
        </div>
        
        {displayedNotes.length > 0 && (
          <div className="mt-2 flex items-center justify-between text-sm text-gray-600">
            <span>{displayedNotes.length} of {paceNotes.length} instructions</span>
            <div className="flex items-center space-x-1">
              <div className="w-16 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(displayedNotes.length / Math.max(paceNotes.length, 1)) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {displayedNotes.length === 0 && !isGenerating ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
            <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-lg font-medium mb-2">No pace notes yet</p>
            <p className="text-sm text-center">Select start and end points on the map to generate rally pace notes</p>
          </div>
        ) : (
          <div className="p-4 space-y-3 h-full">
            {displayedNotes.map((note, index) => (
              <div 
                key={index}
                className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200 animate-slideIn"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Turn Number Badge */}
                <div className="flex-shrink-0">
                  <div 
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${getTurnSeverityColor(note.turnNumber)}`}
                    title={getTurnDescription(note.turnNumber)}
                  >
                    {note.turnNumber}
                  </div>
                </div>

                {/* Note Content */}
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-sm text-gray-800 leading-relaxed">
                    {formatNote(note)}
                  </div>
                  
                  {/* Additional Info */}
                  <div className="flex items-center space-x-3 mt-2 text-xs text-gray-500">
                    <span className="flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {note.direction}
                    </span>
                    
                    {note.elevation && (
                      <span className={`flex items-center px-2 py-1 rounded ${
                        note.elevation === 'Crest' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {note.elevation === 'Crest' ? '↗' : '↘'} {note.elevation}
                      </span>
                    )}
                  </div>
                </div>

                {/* Distance Badge */}
                <div className="flex-shrink-0">
                  <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-200 text-gray-700 rounded">
                    {note.distance}m
                  </span>
                </div>
              </div>
            ))}

            {/* Loading indicator for more notes */}
            {isGenerating && displayedNotes.length < paceNotes.length && (
              <div className="flex items-center justify-center p-4">
                <div className="animate-pulse flex items-center space-x-2 text-gray-500">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <span className="ml-2 text-sm">Analyzing route...</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      {displayedNotes.length > 0 && (
        <div className="p-3 bg-gray-50 border-t">
          <div className="text-xs text-gray-600 mb-2 font-medium">Turn Severity Legend:</div>
          <div className="flex flex-wrap gap-1">
            {[
              { num: 1, label: 'Hairpin', color: 'bg-red-500' },
              { num: 2, label: 'Sharp', color: 'bg-orange-500' },
              { num: 3, label: 'Medium', color: 'bg-yellow-500' },
              { num: 4, label: 'Open', color: 'bg-blue-500' },
              { num: 5, label: 'Slight', color: 'bg-green-500' },
              { num: 6, label: 'Straight', color: 'bg-gray-500' }
            ].map(item => (
              <span key={item.num} className="flex items-center space-x-1 text-xs">
                <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                <span className="text-gray-600">{item.num}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Export Section */}
      {displayedNotes.length > 0 && !isGenerating && (
        <div className="p-4 border-t bg-white">
          <ExportButton paceNotes={displayedNotes} routeName={routeName} />
        </div>
      )}
    </div>
  );
};

export default ProgressiveNotesPanel;
