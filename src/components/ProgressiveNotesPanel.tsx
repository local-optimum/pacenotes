import React, { useState, useEffect, useRef } from 'react';
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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
        
        // Auto-scroll to bottom when new note is added with smooth animation
        setTimeout(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({
              top: scrollContainerRef.current.scrollHeight,
              behavior: 'smooth'
            });
          }
        }, 100);
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
      case 0: return 'bg-purple-600'; // U-turn
      case 1: return 'bg-red-500'; // 90° corner
      case 2: return 'bg-orange-500'; // Sharp
      case 3: return 'bg-yellow-500'; // Medium
      case 4: return 'bg-blue-500'; // Open
      case 5: return 'bg-green-500'; // Slight
      case 6: return 'bg-gray-500'; // Very slight
      default: return 'bg-gray-500';
    }
  };

  const getTurnDescription = (turnNumber: number): string => {
    switch (turnNumber) {
      case 0: return 'U-turn (>135°)';
      case 1: return '90° Corner (~105°)';
      case 2: return 'Sharp (~75°)';
      case 3: return 'Medium (~45°)';
      case 4: return 'Open (~25°)';
      case 5: return 'Slight (~10°)';
      case 6: return 'Very Slight (<10°)';
      default: return 'Unknown';
    }
  };

  return (
    <div className="bg-gradient-to-b from-gray-800 to-gray-900 border-2 border-yellow-400/30 rounded-2xl shadow-2xl h-full flex flex-col backdrop-blur-sm">
        {/* Scrollable Content Area - Everything above legend */}
        <div className="flex flex-col overflow-hidden" style={{ height: 'calc(100% - 240px)' }}>
          {/* Header - Fixed Height */}
          <div className="p-4 border-b border-yellow-400/30 bg-gradient-to-r from-red-700 to-red-800 flex-shrink-0" style={{ minHeight: '96px', maxHeight: '96px' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3">
                <div className="bg-yellow-400 p-2 rounded-lg">
                  <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-black text-white uppercase tracking-wide">Pace Notes</h2>
                  <div className="text-yellow-300 text-xs font-medium uppercase tracking-wider">Stage Navigation</div>
                </div>
              </div>
              {isGenerating && (
                <div className="flex items-center space-x-2 bg-black/30 backdrop-blur-sm px-3 py-2 rounded-lg border border-yellow-400/30">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-yellow-400 border-t-transparent"></div>
                  <span className="text-sm text-yellow-300 font-bold uppercase tracking-wide">Analyzing...</span>
                </div>
              )}
            </div>
          
            {displayedNotes.length > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-yellow-200 font-medium uppercase tracking-wide">{displayedNotes.length} of {paceNotes.length} Instructions</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 bg-gray-700 rounded-full h-3 border border-yellow-400/30">
                    <div
                      className="bg-gradient-to-r from-yellow-400 to-red-500 h-full rounded-full transition-all duration-500 shadow-lg"
                      style={{ width: `${(displayedNotes.length / Math.max(paceNotes.length, 1)) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-yellow-300 text-xs font-bold">{Math.round((displayedNotes.length / Math.max(paceNotes.length, 1)) * 100)}%</span>
                </div>
              </div>
            )}
        </div>

        {/* Notes List - The ONLY scrollable part */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto" 
          style={{ 
            minHeight: '300px',
            maxHeight: '400px',
            scrollBehavior: 'smooth'
          }}
        >
          {displayedNotes.length === 0 && !isGenerating ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
              <div className="bg-yellow-400/10 p-6 rounded-2xl border-2 border-yellow-400/20 mb-6">
                <svg className="w-20 h-20 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-black text-white mb-3 uppercase tracking-wide">Rally Stage Ready</h3>
              <p className="text-sm text-center text-gray-300 leading-relaxed">
                <span className="text-yellow-300 font-bold">📍 SELECT START POINT</span><br/>
                <span className="text-red-300 font-bold">🏁 SELECT FINISH LINE</span><br/>
                <span className="text-green-300 font-bold">⚡ GENERATE PACE NOTES</span>
              </p>
              <div className="mt-6 bg-red-600/20 border border-red-400/30 rounded-lg px-4 py-2">
                <span className="text-red-300 text-xs font-bold uppercase tracking-wide">Professional Rally Navigation</span>
              </div>
            </div>
            ) : (
              <div className="p-4 space-y-4">
                {displayedNotes.map((note, index) => (
                  <div 
                    key={index}
                    className="flex items-start space-x-3 p-4 bg-gradient-to-r from-gray-700/50 to-gray-800/50 backdrop-blur-sm rounded-xl border-2 border-gray-600/30 shadow-xl animate-slideIn hover:border-yellow-400/50 transition-all duration-300"
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
                      <div className="font-mono text-base text-white font-bold leading-relaxed mb-2 tracking-wide">
                        {formatNote(note)}
                      </div>
                      
                      {/* Traditional Directions */}
                      <div className="text-xs text-gray-300 leading-relaxed bg-black/20 rounded-lg px-2 py-1 border border-gray-600/30">
                        <span className="text-yellow-300 font-medium">📍</span> At {note.distance}m: <span className="text-red-300 font-bold uppercase">{note.turnNumber === 0 ? 'U-TURN' : note.turnNumber === 1 ? 'NINETY DEGREE' : note.turnNumber === 2 ? 'SHARP' : note.turnNumber === 3 ? 'MEDIUM' : note.turnNumber === 4 ? 'OPEN' : note.turnNumber === 5 ? 'SLIGHT' : note.turnNumber === 6 ? 'VERY SLIGHT' : 'STRAIGHT'}</span> <span className="text-blue-300 font-medium">{note.direction.toLowerCase()}</span> {note.elevation ? (note.elevation === 'Crest' ? <span className="text-green-300">over crest</span> : <span className="text-orange-300">into dip</span>) : <span className="text-gray-400">continues</span>} on <span className="text-gray-300">tarmac</span>
                      </div>
                    
                      {/* Additional Info - Only Elevation */}
                      {note.elevation && (
                        <div className="flex items-center mt-2">
                          <span className={`flex items-center px-3 py-1 rounded-lg text-xs font-bold border-2 ${
                            note.elevation === 'Crest' 
                              ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' 
                              : 'bg-orange-500/20 text-orange-300 border-orange-500/30'
                          }`}>
                            {note.elevation === 'Crest' ? '⛰️ CREST' : '🕳️ DIP'}
                          </span>
                        </div>
                      )}
                  </div>

                    {/* Distance Badge */}
                    <div className="flex-shrink-0">
                      <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black px-3 py-2 rounded-lg text-sm font-black shadow-lg border-2 border-yellow-300">
                        <div className="text-xs font-medium">DIST</div>
                        <div className="text-lg leading-tight">{note.distance}m</div>
                      </div>
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
      </div>

      {/* Legend - Always Visible */}
      <div className="p-4 bg-gradient-to-r from-gray-800 to-gray-900 border-t-2 border-yellow-400/30 flex-shrink-0">
        <div className="text-xs text-yellow-300 mb-3 font-bold uppercase tracking-wide">🏁 Turn Severity Legend</div>
          <div className="flex flex-wrap gap-2">
            {[
              { num: 'U', label: 'U-turn', color: 'bg-purple-600' },
              { num: 1, label: '90°', color: 'bg-red-500' },
              { num: 2, label: 'Sharp', color: 'bg-orange-500' },
              { num: 3, label: 'Medium', color: 'bg-yellow-500' },
              { num: 4, label: 'Open', color: 'bg-blue-500' },
              { num: 5, label: 'Slight', color: 'bg-green-500' },
              { num: 6, label: 'V.Slight', color: 'bg-gray-500' }
            ].map((item, index) => (
              <div key={index} className="flex items-center space-x-1 bg-black/30 rounded-lg px-2 py-1 border border-gray-600/30">
                <div className={`w-4 h-4 rounded-full ${item.color} shadow-lg border border-white/20`}></div>
                <span className="text-white text-xs font-bold">{item.num}</span>
                <span className="text-gray-300 text-xs">{item.label}</span>
              </div>
            ))}
        </div>
      </div>

      {/* Export Section - Always Visible */}
      <div className="p-4 border-t-2 border-yellow-400/30 bg-gradient-to-r from-gray-900 to-black flex-shrink-0 rounded-b-2xl">
        <ExportButton 
          paceNotes={displayedNotes} 
          routeName={routeName} 
          disabled={displayedNotes.length === 0 || isGenerating}
        />
      </div>
    </div>
  );
};

export default ProgressiveNotesPanel;
