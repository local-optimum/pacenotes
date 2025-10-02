import React, { useEffect, useRef, useCallback, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Route, Coordinates, PaceNote, RoutePoint } from '../types';
import LocationSearch from './LocationSearch';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

interface InteractiveMapViewerProps {
  route: Route | null;
  startPoint: Coordinates | null;
  endPoint: Coordinates | null;
  mapMode: 'select-start' | 'select-end' | 'view-route';
  onPointSelect: (point: Coordinates, type: 'start' | 'end') => void;
  onModeChange: (mode: 'select-start' | 'select-end' | 'view-route') => void;
  onResetRoute: () => void;
  paceNotes?: PaceNote[];
  selectedNoteIndex?: number | null;
  onNoteClick?: (index: number) => void;
}

const InteractiveMapViewer: React.FC<InteractiveMapViewerProps> = ({
  route,
  startPoint,
  endPoint,
  mapMode,
  onPointSelect,
  onModeChange,
  onResetRoute,
  paceNotes = [],
  onNoteClick,
  selectedNoteIndex
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const startMarkerRef = useRef<L.Marker | null>(null);
  const endMarkerRef = useRef<L.Marker | null>(null);
  const paceNoteMarkersRef = useRef<L.Marker[]>([]);
  const [showSearch, setShowSearch] = useState(false);

  // Create custom icons for start/end points (location markers you click)
  const createStartIcon = () => L.divIcon({
    html: '<div style="width: 16px; height: 16px; background-color: #10b981; border: 2px solid white; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>',
    className: 'custom-marker start-marker',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });

  const createEndIcon = () => L.divIcon({
    html: '<div style="width: 16px; height: 16px; background-color: #ef4444; border: 2px solid white; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>',
    className: 'custom-marker end-marker',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });

  // Get color based on severity
  const getSeverityColor = useCallback((severity: number): string => {
    switch (severity) {
      case 1: return '#dc2626'; // red-600 - Hairpin
      case 2: return '#ea580c'; // orange-600 - Sharp
      case 3: return '#d97706'; // yellow-600 - Medium
      case 4: return '#2563eb'; // blue-600 - Open
      case 5: return '#16a34a'; // green-600 - Slight
      case 6: return '#6b7280'; // gray-500 - Near straight
      default: return '#6b7280';
    }
  }, []);

  // Helper to find closest route point to a given distance
  const findClosestRoutePoint = (points: RoutePoint[], targetDistance: number): RoutePoint => {
    let closestPoint = points[0];
    let minDistDiff = Math.abs((points[0].distance || 0) - targetDistance);

    for (const point of points) {
      const distDiff = Math.abs((point.distance || 0) - targetDistance);
      if (distDiff < minDistDiff) {
        minDistDiff = distDiff;
        closestPoint = point;
      }
    }
    return closestPoint;
  };

  // Helper to create popup content for a note
  // Matches the same formatting as pace notes in the sidebar
  const createPopupContent = (note: PaceNote): string => {
    // Build callout same way as ProgressiveNotesPanel
    let callout = '';
    
    // Check if merged note
    if (typeof note.severity === 'string' && note.severity.includes(' into ')) {
      const [firstSev, , secondSev] = note.severity.split(' ');
      callout = `${firstSev.toUpperCase()} ${note.direction?.toUpperCase() || ''}`;
      
      // Add length modifiers after direction
      const lengthMods = note.modifiers?.filter(m => 
        typeof m === 'string' && (m.toLowerCase() === 'long' || m.toLowerCase() === 'short')
      ) || [];
      if (lengthMods.length > 0) {
        callout += `, ${lengthMods.join(', ')}`;
      }
      
      // Add hazards
      if (note.hazards && note.hazards.length > 0) {
        callout += `, ${note.hazards.map(h => {
          const hl = h.toLowerCase();
          if (hl === 'crest') return 'over crest';
          if (hl === 'jump') return 'over jump';
          if (hl === 'dip') return 'into dip';
          return hl;
        }).join(', ')}`;
      }
      
      callout += ` into ${secondSev.toUpperCase()} ${note._secondNote?.direction?.toUpperCase() || ''}`;
    } else {
      // Single note
      const sev = typeof note.severity === 'string' ? note.severity.toUpperCase() : note.severity;
      callout = `${sev} ${note.direction?.toUpperCase() || ''}`;
      
      // Add length modifiers after direction
      const lengthMods = note.modifiers?.filter(m => 
        typeof m === 'string' && (m.toLowerCase() === 'long' || m.toLowerCase() === 'short')
      ) || [];
      if (lengthMods.length > 0) {
        callout += `, ${lengthMods.join(', ')}`;
      }
      
      // Add radius changes
      const radiusChanges = note.modifiers?.filter(m => 
        typeof m === 'string' ? (m.toLowerCase() === 'tightens' || m.toLowerCase() === 'widens') : (m as any).to !== undefined
      ) || [];
      if (radiusChanges.length > 0) {
        const radiusParts: string[] = [];
        radiusChanges.forEach(m => {
          if (typeof m === 'string') {
            radiusParts.push(m.toLowerCase());
          } else if ((m as any).to) {
            radiusParts.push((m as any).to.toString());
          }
        });
        callout += `, ${radiusParts.join(' ')}`;
      }
      
      // Add hazards
      if (note.hazards && note.hazards.length > 0) {
        callout += `, ${note.hazards.map(h => {
          const hl = h.toLowerCase();
          if (hl === 'crest') return 'over crest';
          if (hl === 'jump') return 'over jump';
          if (hl === 'dip') return 'into dip';
          if (hl === "don't cut") return "don't cut";
          return hl;
        }).join(', ')}`;
      }
    }

    const adviceStr = note.advice && note.advice.length > 0 
      ? note.advice.join(', ')
      : '';

    let content = `<div style="
      font-family: monospace; 
      min-width: 180px; 
      padding: 12px;
      background: linear-gradient(to bottom right, #1f2937, #111827);
      border-radius: 8px;
      border: 2px solid #fbbf24;
    ">
      <div style="font-weight: bold; font-size: 14px; margin-bottom: 8px; color: #fbbf24; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">
        ${(note.position / 1000).toFixed(2)}km: ${callout.trim()}
      </div>`;
    
    if (adviceStr) {
      content += `<div style="color: #60a5fa; font-size: 12px; margin-top: 6px; padding: 4px 8px; background: rgba(59, 130, 246, 0.1); border-radius: 4px; border-left: 2px solid #60a5fa;">💡 ${adviceStr}</div>`;
    }
    
    content += `<div style="color: #9ca3af; font-size: 11px; margin-top: 8px; padding-top: 6px; border-top: 1px solid rgba(156, 163, 175, 0.2);">Surface: ${note.surface}</div>`;
    content += `</div>`;
    
    return content;
  };

  // Create pace note marker icon based on severity
  // mergedType: 'single' (normal note), 'first' (first of merged pair), 'second' (second of merged pair)
  const createPaceNoteIcon = useCallback((note: PaceNote, mergedType: 'single' | 'first' | 'second' = 'single') => {
    // Special handling for START note - green flag
    if (note.position === 0) {
      return L.divIcon({
        html: `
          <div style="
            width: 44px;
            height: 44px;
            display: flex;
            align-items: center;
            justify-content: center;
            filter: drop-shadow(0 4px 12px rgba(0,0,0,0.4));
          ">
            <span style="font-size: 36px;">🚩</span>
          </div>
        `,
        className: 'pace-note-marker start-flag',
        iconSize: [44, 44],
        iconAnchor: [22, 22]
      });
    }
    
    // Skip rendering FINISH note on map (only show in pace notes list)
    if (note.severity === 'FINISH') {
      return L.divIcon({
        html: '',
        className: 'hidden-marker',
        iconSize: [0, 0],
        iconAnchor: [0, 0]
      });
    }
    
    // For merged notes, extract the appropriate severity
    let severity: number;
    let displayText: string | number;
    
    if (mergedType === 'first') {
      // First marker of merged pair - show first severity
      const [firstSev] = note.severity.toString().split(' into ');
      severity = typeof note.severity === 'number' ? note.severity : 
                 (typeof firstSev === 'string' && !isNaN(Number(firstSev)) ? Number(firstSev) : note.turnNumber);
      displayText = firstSev;
    } else if (mergedType === 'second' && note._secondNote) {
      // Second marker of merged pair - show second severity
      const secondSev = note._secondNote.severity;
      severity = typeof secondSev === 'number' ? secondSev : note.turnNumber;
      displayText = secondSev;
    } else {
      // Normal single marker
      severity = typeof note.severity === 'number' ? note.severity : note.turnNumber;
      displayText = severity;
      if (typeof note.severity === 'string' && note.severity !== 'FINISH' && !note.severity.includes(' into ')) {
        displayText = note.severity.substring(0, 1); // H for Hairpin, S for Square, A for Acute
      }
    }
    
    const color = getSeverityColor(severity);
    const directionArrow = mergedType === 'second' && note._secondNote 
      ? (note._secondNote.direction === 'Left' ? '←' : '→')
      : (note.direction === 'Left' ? '←' : note.direction === 'Right' ? '→' : '');
    const hasHazard = note.hazards && note.hazards.length > 0;
    
    // Add chain link indicator for merged notes
    const isLinked = mergedType !== 'single';
    const linkIndicator = isLinked ? '🔗' : '';
    
    return L.divIcon({
      html: `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          background-color: ${color};
          border: 3px solid ${isLinked ? '#fbbf24' : 'white'};
          border-radius: 50%;
          box-shadow: 0 3px 10px rgba(0,0,0,0.4);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-weight: 900;
          color: white;
          position: relative;
          ${hasHazard ? 'animation: pulse 2s ease-in-out infinite;' : ''}
        ">
          <div style="font-size: 16px; line-height: 1; font-weight: 900;">${displayText}</div>
          ${directionArrow ? `<div style="font-size: 13px; line-height: 1; margin-top: 1px; font-weight: 900;">${directionArrow}</div>` : ''}
          ${hasHazard ? `<div style="position: absolute; top: -8px; right: -8px; font-size: 14px; background: linear-gradient(135deg, #ef4444, #dc2626); border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">⚠</div>` : ''}
          ${isLinked ? `<div style="position: absolute; top: -6px; left: -6px; font-size: 10px; background: #fbbf24; border-radius: 50%; width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">🔗</div>` : ''}
        </div>
        ${hasHazard ? `<style>@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }</style>` : ''}
      `,
      className: 'pace-note-marker',
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });
  }, [getSeverityColor]);

  const handleMapClick = useCallback((e: L.LeafletMouseEvent) => {
    const { lat, lng } = e.latlng;
    
    if (mapMode === 'select-start') {
      onPointSelect({ lat, lng }, 'start');
      onModeChange('select-end');
    } else if (mapMode === 'select-end') {
      onPointSelect({ lat, lng }, 'end');
      onModeChange('view-route');
    }
  }, [mapMode, onPointSelect, onModeChange]);

  useEffect(() => {
    if (mapRef.current && !mapInstanceRef.current) {
      // Initialize map
      mapInstanceRef.current = L.map(mapRef.current).setView([40.7589, -73.9851], 10);
      
      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapInstanceRef.current);
    }
  }, []);

  // Separate effect for click handler to avoid recreation issues
  useEffect(() => {
    if (mapInstanceRef.current) {
      // Remove existing handler
      mapInstanceRef.current.off('click');
      // Add new handler
      mapInstanceRef.current.on('click', handleMapClick);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.off('click', handleMapClick);
      }
    };
  }, [handleMapClick, mapMode]);

  // Update cursor based on mode
  useEffect(() => {
    if (mapInstanceRef.current) {
      const container = mapInstanceRef.current.getContainer();
      if (mapMode === 'select-start' || mapMode === 'select-end') {
        container.style.cursor = 'crosshair';
      } else {
        container.style.cursor = '';
      }
    }
  }, [mapMode]);

  // Update start point marker
  useEffect(() => {
    if (mapInstanceRef.current) {
      if (startMarkerRef.current) {
        mapInstanceRef.current.removeLayer(startMarkerRef.current);
        startMarkerRef.current = null;
      }

      if (startPoint) {
        startMarkerRef.current = L.marker([startPoint.lat, startPoint.lng], {
          icon: createStartIcon()
        })
          .bindPopup('Start Point')
          .addTo(mapInstanceRef.current);
      }
    }
  }, [startPoint]);

  // Update end point marker  
  useEffect(() => {
    if (mapInstanceRef.current) {
      if (endMarkerRef.current) {
        mapInstanceRef.current.removeLayer(endMarkerRef.current);
        endMarkerRef.current = null;
      }

      if (endPoint) {
        endMarkerRef.current = L.marker([endPoint.lat, endPoint.lng], {
          icon: createEndIcon()
        })
          .bindPopup('End Point')
          .addTo(mapInstanceRef.current);
      }
    }
  }, [endPoint]);

  // Update route
  useEffect(() => {
    if (mapInstanceRef.current && route) {
      // Remove existing route layer
      if (routeLayerRef.current) {
        mapInstanceRef.current.removeLayer(routeLayerRef.current);
      }

      // Add new route
      const latLngs: L.LatLngExpression[] = route.points.map(point => [point.lat, point.lng]);
      
      routeLayerRef.current = L.polyline(latLngs, {
        color: '#ef4444',
        weight: 4,
        opacity: 0.8
      }).addTo(mapInstanceRef.current);

      // Fit map to route bounds
      if (routeLayerRef.current) {
        mapInstanceRef.current.fitBounds(routeLayerRef.current.getBounds(), {
          padding: [20, 20]
        });
      }
    }
  }, [route]);

  // Update pace note markers
  useEffect(() => {
    if (!mapInstanceRef.current || !route) return;

    // Clear existing pace note markers
    paceNoteMarkersRef.current.forEach(marker => {
      mapInstanceRef.current?.removeLayer(marker);
    });
    paceNoteMarkersRef.current = [];

    // Add new pace note markers
    if (paceNotes && paceNotes.length > 0) {
      paceNotes.forEach((note, index) => {
        // Skip the start note (index 0)
        if (index === 0) return;

        // Check if this is a merged note (has _secondNote)
        const isMerged = note._secondNote !== undefined;
        
        // Create popup content for this note
        const popupContent = createPopupContent(note);

        // Create marker for the first corner
        const firstCornerPoint = findClosestRoutePoint(route.points, note.position);
        const firstMarker = L.marker([firstCornerPoint.lat, firstCornerPoint.lng], {
          icon: createPaceNoteIcon(note, isMerged ? 'first' : 'single')
        });
        
        firstMarker.bindPopup(popupContent);
        firstMarker.on('click', () => {
          if (onNoteClick) {
            onNoteClick(index);
          }
        });
        
        (firstMarker as any)._notePosition = note.position;
        firstMarker.addTo(mapInstanceRef.current!);
        paceNoteMarkersRef.current.push(firstMarker);

        // If merged, create a second marker for the second corner
        if (isMerged && note._secondNote) {
          // Use the actual position of the second note stored during merging
          const secondPosition = note._secondNote.position;
          
          const secondCornerPoint = findClosestRoutePoint(route.points, secondPosition);
          const secondMarker = L.marker([secondCornerPoint.lat, secondCornerPoint.lng], {
            icon: createPaceNoteIcon(note, 'second')
          });
          
          secondMarker.bindPopup(popupContent); // Same popup content
          secondMarker.on('click', () => {
            if (onNoteClick) {
              onNoteClick(index);
            }
          });
          
          (secondMarker as any)._notePosition = secondPosition;
          secondMarker.addTo(mapInstanceRef.current!);
          paceNoteMarkersRef.current.push(secondMarker);
          
          // Draw a connecting line between the two markers
          const linkLine = L.polyline(
            [[firstCornerPoint.lat, firstCornerPoint.lng], 
             [secondCornerPoint.lat, secondCornerPoint.lng]], 
            {
              color: '#fbbf24', // Yellow to match theme
              weight: 3,
              opacity: 0.6,
              dashArray: '5, 5' // Dashed line to show connection
            }
          );
          linkLine.addTo(mapInstanceRef.current!);
          // Store line reference so we can remove it later
          (paceNoteMarkersRef.current as any).push(linkLine);
        }
      });
    }
  }, [paceNotes, route, createPaceNoteIcon, onNoteClick]);

  // Auto-fit when both points are selected
  useEffect(() => {
    if (mapInstanceRef.current && startPoint && endPoint && !route) {
      const bounds = L.latLngBounds([
        [startPoint.lat, startPoint.lng],
        [endPoint.lat, endPoint.lng]
      ]);
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [startPoint, endPoint, route]);

  // Center and highlight selected pace note
  useEffect(() => {
    if (typeof selectedNoteIndex === 'number' && route && mapInstanceRef.current) {
      const note = paceNotes[selectedNoteIndex];
      if (!note) return;
      
      // Find the closest route point to this pace note (same logic as marker placement)
      const noteDistance = note.position;
      let closestPoint = route.points[0];
      let minDistDiff = Math.abs((route.points[0].distance || 0) - noteDistance);

      for (const point of route.points) {
        const distDiff = Math.abs((point.distance || 0) - noteDistance);
        if (distDiff < minDistDiff) {
          minDistDiff = distDiff;
          closestPoint = point;
        }
      }

      // Center map on the note with animation
      mapInstanceRef.current.flyTo(
        [closestPoint.lat, closestPoint.lng],
        16,
        { duration: 0.8 }
      );

      // Find the correct marker by matching the note position
      const marker = paceNoteMarkersRef.current.find(m => 
        (m as any)._notePosition === note.position
      );
      
      if (marker) {
        // Close all other popups
        paceNoteMarkersRef.current.forEach(m => {
          if (m !== marker) {
            m.closePopup();
          }
        });
        
        // Open the selected marker's popup with a slight delay for smooth animation
        setTimeout(() => {
          marker.openPopup();
        }, 500);
      }
    }
  }, [selectedNoteIndex, paceNotes, route]);

  const getModeInstructions = () => {
    switch (mapMode) {
      case 'select-start':
        return 'Click on the map to select your start point';
      case 'select-end':
        return 'Click on the map to select your end point';
      case 'view-route':
        return 'Route displayed - ready to generate pace notes';
      default:
        return '';
    }
  };

  const getModeColor = () => {
    switch (mapMode) {
      case 'select-start':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'select-end':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'view-route':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleSearchSelect = (coords: Coordinates) => {
    if (mapInstanceRef.current) {
      // Fly to the selected location
      mapInstanceRef.current.flyTo([coords.lat, coords.lng], 15, { duration: 1 });
      
      // Set the point based on current mode
      if (mapMode === 'select-start') {
        onPointSelect(coords, 'start');
        onModeChange('select-end');
      } else if (mapMode === 'select-end') {
        onPointSelect(coords, 'end');
        onModeChange('view-route');
      }
    }
    setShowSearch(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden h-full flex flex-col">
      {/* Status Bar */}
      <div className={`p-3 border-b ${getModeColor()}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">{getModeInstructions()}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="text-xs px-3 py-1.5 rounded bg-blue-500 text-white hover:bg-blue-600 transition-colors font-medium flex items-center gap-1"
              title="Search for location"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="hidden sm:inline">Search</span>
            </button>
            {(startPoint || endPoint) && (
              <button
                onClick={onResetRoute}
                className="text-xs px-2 py-1 rounded bg-white/50 hover:bg-white/80 transition-colors flex items-center gap-1"
                title="Clear route and start over"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="hidden sm:inline">Reset Route</span>
                <span className="sm:hidden">Reset</span>
              </button>
            )}
          </div>
        </div>
        
        {/* Search Panel */}
        {showSearch && (
          <div className="mt-2 relative z-50">
            <LocationSearch
              placeholder={
                mapMode === 'select-start' 
                  ? "Search for start location..." 
                  : mapMode === 'select-end'
                  ? "Search for finish location..."
                  : "Search for a location..."
              }
              onLocationSelect={handleSearchSelect}
              disabled={mapMode === 'view-route'}
            />
          </div>
        )}
      </div>

      {/* Map Container */}
      <div 
        ref={mapRef} 
        className="flex-1 w-full min-h-0 relative z-0"
        style={{ minHeight: '400px' }}
      />

      {/* Point Summary */}
      <div className="p-3 bg-gray-50 border-t text-xs">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="font-medium text-green-600">Start:</span>
            {startPoint ? (
              <span className="ml-1 font-mono">
                {startPoint.lat.toFixed(6)}, {startPoint.lng.toFixed(6)}
              </span>
            ) : (
              <span className="ml-1 text-gray-500">Not selected</span>
            )}
          </div>
          <div>
            <span className="font-medium text-red-600">End:</span>
            {endPoint ? (
              <span className="ml-1 font-mono">
                {endPoint.lat.toFixed(6)}, {endPoint.lng.toFixed(6)}
              </span>
            ) : (
              <span className="ml-1 text-gray-500">Not selected</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InteractiveMapViewer;
