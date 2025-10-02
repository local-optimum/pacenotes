import React, { useState, useEffect, useRef } from 'react';
import { PaceNote } from '../types';
import ExportButton from './ExportButton';

interface ProgressiveNotesPanelProps {
  paceNotes: PaceNote[];
  isGenerating: boolean;
  routeName?: string;
  onNoteClick?: (index: number) => void;
  selectedNoteIndex?: number | null;
}

const ProgressiveNotesPanel: React.FC<ProgressiveNotesPanelProps> = ({
  paceNotes,
  isGenerating,
  routeName = 'Rally Route',
  onNoteClick,
  selectedNoteIndex
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

  // Scroll to selected note when clicked from map
  useEffect(() => {
    if (selectedNoteIndex !== null && selectedNoteIndex !== undefined && scrollContainerRef.current) {
      const noteElements = scrollContainerRef.current.querySelectorAll('[data-note-index]');
      const targetElement = noteElements[selectedNoteIndex];
      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    }
  }, [selectedNoteIndex]);

  const getSeverityColor = (severity: number | string): string => {
    if (typeof severity === 'string') {
      // Special turns
      if (severity === 'Hairpin') return 'bg-red-600';
      if (severity === 'Square') return 'bg-orange-600';
      if (severity === 'Acute') return 'bg-orange-500';
      if (severity === 'FINISH') return 'bg-yellow-500 border-yellow-400';
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

  /**
   * Format merged pace note (e.g., "4 LEFT, long, into 6 RIGHT")
   */
  const formatMergedCallout = (note: PaceNote): string => {
    const parts: string[] = [];
    const secondNote = note._secondNote;
    
    if (!secondNote) {
      // Fallback if _secondNote is missing
      return formatSingleNote(note);
    }
    
    // Extract first and second severity from compound
    const [firstSev, , secondSev] = note.severity.toString().split(' ');
    
    // Extract length modifiers
    const firstLengthMods: string[] = [];
    const secondLengthMods: string[] = [];
    
    if (note.modifiers && note.modifiers.length > 0) {
      note.modifiers.forEach(m => {
        if (typeof m === 'string' && (m.toLowerCase() === 'long' || m.toLowerCase() === 'short')) {
          firstLengthMods.push(m.toLowerCase());
        }
      });
    }
    
    if (secondNote.modifiers && secondNote.modifiers.length > 0) {
      secondNote.modifiers.forEach(m => {
        if (typeof m === 'string' && (m.toLowerCase() === 'long' || m.toLowerCase() === 'short')) {
          secondLengthMods.push(m.toLowerCase());
        }
      });
    }
    
    // 1. First note's severity - UPPERCASE
    parts.push(firstSev.toUpperCase());
    
    // 2. First note's direction - UPPERCASE
    if (note.direction) {
      parts.push(note.direction.toUpperCase());
    }
    
    // Build main part with commas
    let callout = parts.join(' ');
    
    // 3. First note's length modifiers AFTER direction - with comma
    if (firstLengthMods.length > 0) {
      callout += `, ${firstLengthMods.join(', ')}`;
    }
    
    // 4. First note's hazards (with prepositions) - with comma
    if (note.hazards && note.hazards.length > 0) {
      const hazardParts: string[] = [];
      const firstNoteHazards = note.hazards.slice(0, 1);
      firstNoteHazards.forEach(h => {
        const hazardLower = h.toLowerCase();
        if (hazardLower === 'crest') {
          hazardParts.push('over crest');
        } else if (hazardLower === 'jump') {
          hazardParts.push('over jump');
        } else if (hazardLower === 'dip') {
          hazardParts.push('into dip');
        } else {
          hazardParts.push(hazardLower);
        }
      });
      if (hazardParts.length > 0) {
        callout += `, ${hazardParts.join(', ')}`;
      }
    }
    
    // 5. "into" connector
    callout += ' into';
    
    // 6. Second note's severity - UPPERCASE
    callout += ` ${secondSev.toUpperCase()}`;
    
    // 7. Second note's direction - UPPERCASE
    if (secondNote.direction) {
      callout += ` ${secondNote.direction.toUpperCase()}`;
    }
    
    // 8. Second note's length modifiers AFTER direction - with comma
    if (secondLengthMods.length > 0) {
      callout += `, ${secondLengthMods.join(', ')}`;
    }
    
    // 9. Distance to next (third note)
    if (note.distanceToNext !== null && note.distanceToNext !== undefined) {
      const roundedDistance = Math.round(note.distanceToNext / 10) * 10;
      callout += `, ${roundedDistance}`;
    }
    
    return callout;
  };

  /**
   * Format single (non-merged) pace note
   * Example: "4 LEFT, long, over crest, 150"
   */
  const formatSingleNote = (note: PaceNote): string => {
    const parts: string[] = [];
    
    // Extract different modifier types
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
    
    // 1. Severity - UPPERCASE
    parts.push(typeof note.severity === 'string' ? note.severity.toUpperCase() : note.severity.toString());
    
    // 2. Direction - UPPERCASE
    if (note.direction) {
      parts.push(note.direction.toUpperCase());
    }
    
    // Start building callout
    let callout = parts.join(' ');
    
    // 3. Length modifiers AFTER direction - with comma
    if (lengthMods.length > 0) {
      callout += `, ${lengthMods.join(', ')}`;
    }
    
    // 4. Radius change modifiers - with comma
    if (radiusChangeMods.length > 0) {
      const radiusParts: string[] = [];
      radiusChangeMods.forEach(m => {
        if (typeof m === 'string') {
          radiusParts.push(m);
        } else if (m.to) {
          radiusParts.push(m.to.toString());
        }
      });
      callout += `, ${radiusParts.join(' ')}`;
    }
    
    // 5. Hazards - with comma
    if (note.hazards && note.hazards.length > 0) {
      const hazardParts: string[] = [];
      note.hazards.forEach(h => {
        const hazardLower = h.toLowerCase();
        if (hazardLower === 'crest') {
          hazardParts.push('over crest');
        } else if (hazardLower === 'jump') {
          hazardParts.push('over jump');
        } else if (hazardLower === 'dip') {
          hazardParts.push('into dip');
        } else if (hazardLower === "don't cut") {
          hazardParts.push("don't cut");
        } else {
          hazardParts.push(hazardLower);
        }
      });
      if (hazardParts.length > 0) {
        callout += `, ${hazardParts.join(', ')}`;
      }
    }
    
    // Special handling for start notes
    if (note.position === 0 && callout.length > 0) {
      callout = `START into ${callout}`;
    }
    
    // 6. Distance to next
    if (note.distanceToNext !== null && note.distanceToNext !== undefined) {
      const roundedDistance = Math.round(note.distanceToNext / 10) * 10;
      callout += `, ${roundedDistance}`;
    }
    
    return callout;
  };

  /**
   * Format pace note with proper rally lyricism and rhythm
   * Examples: "4 RIGHT, long, over crest, 150" or "4 LEFT into 6 RIGHT, 80"
   */
  const formatCallout = (note: PaceNote): string => {
    // Finish note special case
    if (note.severity === 'FINISH') {
      return 'OVER FINISH 🏁';
    }
    
    // Merged note special case (compound severity like "4 into 6")
    if (typeof note.severity === 'string' && note.severity.includes(' into ')) {
      return formatMergedCallout(note);
    }
    
    // Start note - show turn info if it's actually a turn, otherwise just "START"
    if (note.position === 0) {
      // If it's a straight start (severity 6), just say START
      if (note.severity === 6 && !note.direction) {
        let startCallout = 'START';
        // But still show distance to next corner
        if (note.distanceToNext !== null && note.distanceToNext !== undefined) {
          const roundedDistance = Math.round(note.distanceToNext / 10) * 10;
          startCallout += `, ${roundedDistance}`;
        }
        return startCallout;
      }
    }
    
    // All other notes use single note formatting
    return formatSingleNote(note);
  };

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg shadow-2xl h-full flex flex-col border-4 border-yellow-400">
      {/* Header */}
      <div className="p-2 sm:p-3 lg:p-4 border-b-4 border-yellow-400 bg-gradient-to-r from-red-600 to-red-700 flex-shrink-0">
        <div className="flex items-center justify-between mb-1 sm:mb-2">
          <h2 className="text-base sm:text-lg lg:text-xl font-black text-white uppercase tracking-widest flex items-center gap-2">
            <span className="text-yellow-400">⚡</span> PACE NOTES
          </h2>
          {isGenerating && (
            <div className="flex items-center space-x-1 sm:space-x-2">
              <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-2 border-yellow-400 border-t-transparent"></div>
              <span className="text-xs sm:text-sm text-yellow-200 font-bold hidden sm:inline">ANALYZING...</span>
            </div>
          )}
        </div>
        
        {displayedNotes.length > 0 && (
          <div className="flex items-center justify-between text-xs text-yellow-200">
            <span className="font-bold">{displayedNotes.length} of {paceNotes.length} NOTES</span>
            <div className="flex items-center space-x-2">
              <div className="w-16 sm:w-20 lg:w-24 bg-black/40 rounded-full h-1.5 sm:h-2 border border-yellow-400/30">
                <div
                  className="bg-gradient-to-r from-yellow-400 to-yellow-300 h-full rounded-full transition-all duration-300"
                  style={{ width: `${(displayedNotes.length / Math.max(paceNotes.length, 1)) * 100}%` }}
                ></div>
              </div>
              <span className="font-black text-yellow-400">{Math.round((displayedNotes.length / Math.max(paceNotes.length, 1)) * 100)}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Notes List */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-2 sm:p-3 lg:p-4 space-y-1.5 sm:space-y-2 bg-gradient-to-b from-gray-800 to-gray-900"
        style={{ scrollBehavior: 'smooth' }}
      >
        {displayedNotes.length === 0 && !isGenerating ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 px-4">
            <svg className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 text-yellow-400/30 mb-3 sm:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-base sm:text-lg font-black text-yellow-400 mb-1 sm:mb-2 uppercase">No Pace Notes Yet</h3>
            <p className="text-xs sm:text-sm text-center text-gray-400 max-w-xs">
              Select a start and end point on the map to generate pace notes for your rally stage.
            </p>
          </div>
        ) : (
          <>
            {displayedNotes.map((note, index) => (
              <div 
                key={index}
                data-note-index={index}
                onClick={() => onNoteClick?.(index)}
                className={`group hover:bg-black/40 rounded-md sm:rounded-lg border-2 transition-all duration-200 hover:shadow-2xl cursor-pointer ${
                  selectedNoteIndex === index 
                    ? 'border-yellow-400 bg-yellow-400/10 shadow-2xl ring-2 ring-yellow-400/50 scale-[1.02]' 
                    : 'border-gray-700 bg-black/20'
                }`}
              >
                {/* Main Note Display */}
                <div className="flex items-stretch">
                  {/* Position Badge - Subdued */}
                  <div className="flex-shrink-0 w-12 sm:w-14 lg:w-16 bg-gray-800 rounded-l-md sm:rounded-l-lg flex items-center justify-center border-r border-gray-700">
                    <div className="text-center">
                      <div className="text-xs text-gray-500 font-medium hidden sm:block">DIST</div>
                      <div className="text-xs sm:text-sm lg:text-base font-bold text-gray-400">{(note.position / 1000).toFixed(2)}</div>
                      <div className="text-xs text-gray-600 font-medium">km</div>
                    </div>
                  </div>
                  
                  {/* Note Content */}
                  <div className="flex-1 p-2 sm:p-2.5 lg:p-3 bg-gradient-to-r from-gray-900 to-gray-800">
                    {/* Callout - Traditional Rally Format */}
                    <div className="font-mono text-sm sm:text-base lg:text-lg font-black mb-1 leading-tight break-words tracking-wide text-yellow-400 drop-shadow-lg">
                      {formatCallout(note)}
                    </div>
                    
                    {/* Detailed Breakdown */}
                    <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 lg:gap-2 mt-1 sm:mt-1.5 lg:mt-2">
                      {/* Severity Badge */}
                      {note.position !== 0 && (
                        <span className={`inline-flex items-center px-1.5 py-0.5 sm:px-2 rounded text-xs font-black text-white border-2 ${getSeverityColor(note.severity)} uppercase tracking-wider shadow-lg`}>
                          <span className="hidden sm:inline">
                            {typeof note.severity === 'string' ? note.severity : `${note.severity} ${getSeverityLabel(note.severity)}`}
                          </span>
                          <span className="sm:hidden">{note.severity}</span>
                        </span>
                      )}
                      
                      {/* Direction Badge */}
                      {note.direction && (
                        <span className="inline-flex items-center px-1.5 py-0.5 sm:px-2 rounded text-xs font-black bg-white text-black border-2 border-white shadow-lg uppercase">
                          <span className="hidden sm:inline">{note.direction === 'Left' ? '← LEFT' : '→ RIGHT'}</span>
                          <span className="sm:hidden">{note.direction === 'Left' ? '←' : '→'}</span>
                        </span>
                      )}
                      
                      {/* Hazard Badges */}
                      {note.hazards && note.hazards.map((hazard, idx) => (
                        <span key={`hazard-${idx}`} className="inline-flex items-center px-1.5 py-0.5 sm:px-2 rounded text-xs font-black bg-red-600 text-white border-2 border-red-400 shadow-lg animate-pulse uppercase">
                          ⚠<span className="hidden sm:inline ml-1">{hazard.toUpperCase()}</span>
                        </span>
                      ))}
                      
                      {/* Advice Badges */}
                      {note.advice && note.advice.map((adv, idx) => (
                        <span key={`advice-${idx}`} className="inline-flex items-center px-1.5 py-0.5 sm:px-2 rounded text-xs font-black bg-blue-600 text-white border-2 border-blue-400 shadow-lg uppercase">
                          💡<span className="hidden sm:inline ml-1">{adv}</span>
                        </span>
                      ))}
                      
                      {/* Distance to Next */}
                      {note.distanceToNext !== null && note.distanceToNext !== undefined && (
                        <span className="inline-flex items-center px-1.5 py-0.5 sm:px-2 rounded text-xs font-black bg-gray-700 text-green-400 border-2 border-green-400/50 shadow-lg">
                          → {Math.round(note.distanceToNext / 10) * 10}m
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
                <div className="flex items-center space-x-2 text-yellow-400">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <span className="ml-2 text-sm font-bold uppercase">Generating notes...</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Legend */}
      <div className="p-2 sm:p-3 lg:p-4 bg-black/60 border-t-4 border-yellow-400 flex-shrink-0">
        <div className="text-xs font-black text-yellow-400 mb-1 sm:mb-2 uppercase tracking-widest">McRAE SEVERITY SCALE</div>
        <div className="grid grid-cols-6 gap-0.5 sm:gap-1">
          {[
            { num: 1, label: 'Hairpin', color: 'bg-red-600' },
            { num: 2, label: 'Sharp', color: 'bg-orange-600' },
            { num: 3, label: 'Medium', color: 'bg-yellow-600' },
            { num: 4, label: 'Open', color: 'bg-blue-600' },
            { num: 5, label: 'Slight', color: 'bg-green-600' },
            { num: 6, label: 'Flat', color: 'bg-gray-600' }
          ].map((item) => (
            <div key={item.num} className="text-center">
              <div className={`${item.color} text-white text-xs sm:text-sm font-black py-0.5 sm:py-1 rounded-t border-2 border-white/20`}>
                {item.num}
              </div>
              <div className="bg-gray-800 text-gray-300 text-xs py-0.5 sm:py-1 border-2 border-t-0 border-gray-700 rounded-b font-bold uppercase">
                <span className="hidden sm:inline">{item.label}</span>
                <span className="sm:hidden">{item.label.substring(0, 3)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Export Section */}
      <div className="p-2 sm:p-3 lg:p-4 border-t-2 border-yellow-400/50 bg-gradient-to-b from-gray-900 to-black flex-shrink-0 rounded-b-lg">
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