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
        }, 50);
      }, 100); // Add a note every 100ms for smooth animation

      return () => clearTimeout(timer);
    }
  }, [paceNotes, currentIndex]);

  // Reset when new notes come in
  useEffect(() => {
    setDisplayedNotes([]);
    setCurrentIndex(0);
  }, [paceNotes.length]);

  const getSeverityColor = (severity: number | string): string => {
    if (typeof severity === 'string') {
      // Special turns
      if (severity === 'Hairpin') return 'bg-red-600';
      if (severity === 'Square') return 'bg-orange-600';
      if (severity === 'Acute') return 'bg-orange-500';
      return 'bg-gray-600';
    }
    
    // Numeric severity
    switch (severity) {
      case 1: return 'bg-red-600';
      case 2: return 'bg-orange-600';
      case 3: return 'bg-yellow-600';
      case 4: return 'bg-blue-600';
      case 5: return 'bg-green-600';
      case 6: return 'bg-gray-600';
      default: return 'bg-gray-600';
    }
  };

  const getSeverityLabel = (severity: number | string): string => {
    if (typeof severity === 'string') return severity;
    
    switch (severity) {
      case 1: return 'Hairpin';
      case 2: return 'Sharp';
      case 3: return 'Medium';
      case 4: return 'Open';
      case 5: return 'Slight';
      case 6: return 'Flat';
      default: return 'Unknown';
    }
  };

  const formatCallout = (note: PaceNote): string => {
    // Start note special case
    if (note.position === 0) {
      return 'START';
    }
    
    const parts: string[] = [];
    
    // 1. Distance to next (ALWAYS first in rally callouts)
    if (note.distanceToNext !== null && note.distanceToNext !== undefined) {
      parts.push(`${Math.round(note.distanceToNext)}`);
    }
    
    // 2. Length modifiers (long/short) come before severity
    const lengthMods: string[] = [];
    const radiusChangeMods: Array<string | { to?: number }> = [];
    
    if (note.modifiers && note.modifiers.length > 0) {
      for (const m of note.modifiers) {
        if (typeof m === 'string') {
          if (m.toLowerCase() === 'long' || m.toLowerCase() === 'short') {
            lengthMods.push(m.toLowerCase());
          } else if (m.toLowerCase() === 'tightens' || m.toLowerCase() === 'widens') {
            radiusChangeMods.push(m.toLowerCase());
          }
        } else if (m.to) {
          radiusChangeMods.push(m);
        }
      }
    }
    
    // Add length modifiers
    parts.push(...lengthMods);
    
    // 3. Severity (MUST come after length mods, before radius changes)
    parts.push(typeof note.severity === 'string' ? note.severity.toLowerCase() : note.severity.toString());
    
    // 4. Radius change modifiers (tightens/widens to X)
    if (radiusChangeMods.length > 0) {
      radiusChangeMods.forEach(m => {
        if (typeof m === 'string') {
          parts.push(m);
        } else if (m.to) {
          parts.push(`to ${m.to}`);
        }
      });
    }
    
    // 5. Direction
    if (note.direction) {
      parts.push(note.direction.toLowerCase());
    }
    
    // 6. Hazards
    if (note.hazards && note.hazards.length > 0) {
      parts.push(...note.hazards.map(h => h.toLowerCase()));
    }
    
    return parts.join(' ');
  };

  return (
    <div className="bg-white rounded-lg shadow-2xl h-full flex flex-col border-2 border-gray-200">
      {/* Header */}
      <div className="p-4 border-b-2 border-gray-200 bg-gray-50 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-gray-900 uppercase tracking-tight">Pace Notes</h2>
          {isGenerating && (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
              <span className="text-sm text-gray-600 font-medium">Analyzing...</span>
            </div>
          )}
        </div>
        
        {displayedNotes.length > 0 && (
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span className="font-medium">{displayedNotes.length} of {paceNotes.length} notes</span>
            <div className="flex items-center space-x-2">
              <div className="w-24 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${(displayedNotes.length / Math.max(paceNotes.length, 1)) * 100}%` }}
                ></div>
              </div>
              <span className="font-semibold">{Math.round((displayedNotes.length / Math.max(paceNotes.length, 1)) * 100)}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Notes List */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-2"
        style={{ scrollBehavior: 'smooth' }}
      >
        {displayedNotes.length === 0 && !isGenerating ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Pace Notes Yet</h3>
            <p className="text-sm text-center text-gray-500 max-w-xs">
              Select a start and end point on the map to generate pace notes for your rally stage.
            </p>
          </div>
        ) : (
          <>
            {displayedNotes.map((note, index) => (
              <div 
                key={index}
                className="group hover:bg-gray-50 rounded-lg border border-gray-200 transition-all duration-200 hover:shadow-md"
              >
                {/* Main Note Display */}
                <div className="flex items-stretch">
                  {/* Position Badge */}
                  <div className="flex-shrink-0 w-20 bg-gray-100 rounded-l-lg flex items-center justify-center border-r border-gray-200">
                    <div className="text-center">
                      <div className="text-xs text-gray-500 font-medium">DIST</div>
                      <div className="text-lg font-bold text-gray-900">{(note.position / 1000).toFixed(2)}</div>
                      <div className="text-xs text-gray-500">km</div>
                    </div>
                  </div>
                  
                  {/* Note Content */}
                  <div className="flex-1 p-3">
                    {/* Callout - Traditional Format */}
                    <div className="font-mono text-lg font-bold text-gray-900 mb-1 leading-tight">
                      {formatCallout(note)}
                    </div>
                    
                    {/* Detailed Breakdown */}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {/* Severity Badge */}
                      {note.position !== 0 && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold text-white ${getSeverityColor(note.severity)}`}>
                          {note.severity} {getSeverityLabel(note.severity)}
                        </span>
                      )}
                      
                      {/* Direction Badge */}
                      {note.direction && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800">
                          {note.direction === 'Left' ? '← LEFT' : '→ RIGHT'}
                        </span>
                      )}
                      
                      {/* Hazard Badges */}
                      {note.hazards && note.hazards.map((hazard, idx) => (
                        <span key={`hazard-${idx}`} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
                          ⚠ {hazard.toUpperCase()}
                        </span>
                      ))}
                      
                      {/* Advice Badges */}
                      {note.advice && note.advice.map((adv, idx) => (
                        <span key={`advice-${idx}`} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-800">
                          💡 {adv}
                        </span>
                      ))}
                      
                      {/* Distance to Next */}
                      {note.distanceToNext !== null && note.distanceToNext !== undefined && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800">
                          → {Math.round(note.distanceToNext)}m
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Loading indicator for more notes */}
            {isGenerating && displayedNotes.length < paceNotes.length && (
              <div className="flex items-center justify-center p-4">
                <div className="flex items-center space-x-2 text-gray-500">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <span className="ml-2 text-sm">Generating notes...</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Legend */}
      <div className="p-4 bg-gray-50 border-t-2 border-gray-200 flex-shrink-0">
        <div className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Severity Scale</div>
        <div className="grid grid-cols-6 gap-1">
          {[
            { num: 1, label: 'Hairpin', color: 'bg-red-600' },
            { num: 2, label: 'Sharp', color: 'bg-orange-600' },
            { num: 3, label: 'Medium', color: 'bg-yellow-600' },
            { num: 4, label: 'Open', color: 'bg-blue-600' },
            { num: 5, label: 'Slight', color: 'bg-green-600' },
            { num: 6, label: 'Flat', color: 'bg-gray-600' }
          ].map((item) => (
            <div key={item.num} className="text-center">
              <div className={`${item.color} text-white text-sm font-bold py-1 rounded-t`}>
                {item.num}
              </div>
              <div className="bg-white text-gray-700 text-xs py-1 border border-t-0 border-gray-200 rounded-b font-medium">
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Export Section */}
      <div className="p-4 border-t border-gray-200 bg-white flex-shrink-0 rounded-b-lg">
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