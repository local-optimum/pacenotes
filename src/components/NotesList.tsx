import React from 'react';
import { PaceNote } from '../types';

interface NotesListProps {
  paceNotes: PaceNote[];
}

const NotesList: React.FC<NotesListProps> = ({ paceNotes }) => {
  const formatNote = (note: PaceNote): string => {
    const elevation = note.elevation ? ` ${note.elevation}` : '';
    return `${note.distance}m: ${note.turnNumber} ${note.direction}${elevation}, ${note.surface}`;
  };

  const getTurnSeverityColor = (turnNumber: number): string => {
    switch (turnNumber) {
      case 1: return 'text-red-600 bg-red-50'; // Hairpin
      case 2: return 'text-orange-600 bg-orange-50'; // Sharp
      case 3: return 'text-yellow-600 bg-yellow-50'; // Medium
      case 4: return 'text-blue-600 bg-blue-50'; // Open
      case 5: return 'text-green-600 bg-green-50'; // Slight
      case 6: return 'text-gray-600 bg-gray-50'; // Near straight
      default: return 'text-gray-600 bg-gray-50';
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

  if (paceNotes.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Pace Notes</h3>
        <p className="text-gray-500 text-center py-8">
          No pace notes generated yet. Enter a route to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg">
      <div className="p-4 bg-gray-50 border-b">
        <h3 className="text-lg font-semibold text-gray-800">
          Pace Notes ({paceNotes.length} instructions)
        </h3>
      </div>
      
      <div className="max-h-96 overflow-y-auto">
        <div className="p-4 space-y-2">
          {paceNotes.map((note, index) => (
            <div 
              key={index}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <span 
                  className={`px-2 py-1 rounded-full text-xs font-semibold ${getTurnSeverityColor(note.turnNumber)}`}
                  title={getTurnDescription(note.turnNumber)}
                >
                  {note.turnNumber}
                </span>
                <span className="font-mono text-sm text-gray-800">
                  {formatNote(note)}
                </span>
              </div>
              
              {note.elevation && (
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  note.elevation === 'Crest' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                }`}>
                  {note.elevation}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
      
      <div className="p-4 bg-gray-50 border-t">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="px-2 py-1 bg-red-50 text-red-600 rounded">1: Hairpin</span>
          <span className="px-2 py-1 bg-orange-50 text-orange-600 rounded">2: Sharp</span>
          <span className="px-2 py-1 bg-yellow-50 text-yellow-600 rounded">3: Medium</span>
          <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded">4: Open</span>
          <span className="px-2 py-1 bg-green-50 text-green-600 rounded">5: Slight</span>
          <span className="px-2 py-1 bg-gray-50 text-gray-600 rounded">6: Straight</span>
        </div>
      </div>
    </div>
  );
};

export default NotesList;
