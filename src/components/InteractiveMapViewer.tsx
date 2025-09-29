import React, { useEffect, useRef, useCallback, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Route, Coordinates, PaceNote } from '../types';
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
  selectedNoteIndex
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const startMarkerRef = useRef<L.Marker | null>(null);
  const endMarkerRef = useRef<L.Marker | null>(null);
  const paceNoteMarkersRef = useRef<L.Marker[]>([]);
  const [showSearch, setShowSearch] = useState(false);

  // Create custom icons
  const createStartIcon = () => L.divIcon({
    html: '<div style="width: 16px; height: 16px; background-color: #10b981; border: 2px solid white; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>',
    className: 'custom-marker',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });

  const createEndIcon = () => L.divIcon({
    html: '<div style="width: 16px; height: 16px; background-color: #ef4444; border: 2px solid white; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>',
    className: 'custom-marker', 
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

  // Create pace note marker icon based on severity
  const createPaceNoteIcon = useCallback((note: PaceNote) => {
    const severity = typeof note.severity === 'number' ? note.severity : note.turnNumber;
    const color = getSeverityColor(severity);
    const directionArrow = note.direction === 'Left' ? '←' : note.direction === 'Right' ? '→' : '•';
    const hasHazard = note.hazards && note.hazards.length > 0;
    const hazardIndicator = hasHazard ? '⚠' : '';
    
    return L.divIcon({
      html: `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          background-color: ${color};
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          font-weight: bold;
          color: white;
          font-size: 14px;
          position: relative;
        ">
          <div style="font-size: 10px; line-height: 1;">${severity}</div>
          <div style="font-size: 8px; line-height: 1; margin-top: -2px;">${directionArrow}</div>
          ${hasHazard ? `<div style="position: absolute; top: -6px; right: -6px; font-size: 12px; background: #fbbf24; border-radius: 50%; width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; border: 2px solid white;">${hazardIndicator}</div>` : ''}
        </div>
      `,
      className: 'pace-note-marker',
      iconSize: [28, 28],
      iconAnchor: [14, 14]
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

        // Find the corresponding route point
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

        // Create marker
        const marker = L.marker([closestPoint.lat, closestPoint.lng], {
          icon: createPaceNoteIcon(note)
        });

        // Create popup content
        const modifiersStr = note.modifiers && note.modifiers.length > 0 
          ? note.modifiers.map(m => typeof m === 'string' ? m : `to ${m.to}`).join(' ')
          : '';
        const hazardsStr = note.hazards && note.hazards.length > 0 
          ? note.hazards.join(', ')
          : '';
        const adviceStr = note.advice && note.advice.length > 0 
          ? note.advice.join(', ')
          : '';

        let popupContent = `<div style="font-family: sans-serif; min-width: 150px;">
          <div style="font-weight: bold; font-size: 14px; margin-bottom: 4px;">
            ${note.position}m: ${modifiersStr} ${note.severity} ${note.direction || ''}
          </div>`;
        
        if (hazardsStr) {
          popupContent += `<div style="color: #f59e0b; font-size: 12px; margin-top: 4px;">⚠ ${hazardsStr}</div>`;
        }
        
        if (adviceStr) {
          popupContent += `<div style="color: #3b82f6; font-size: 12px; margin-top: 4px;">ℹ ${adviceStr}</div>`;
        }
        
        popupContent += `<div style="color: #6b7280; font-size: 11px; margin-top: 4px;">Surface: ${note.surface}</div>`;
        popupContent += `</div>`;

        marker.bindPopup(popupContent);
        // Store the note position as a custom property so we can find it later
        (marker as any)._notePosition = note.position;
        marker.addTo(mapInstanceRef.current!);
        paceNoteMarkersRef.current.push(marker);
      });
    }
  }, [paceNotes, route, createPaceNoteIcon]);

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
      
      // Find the closest route point to this pace note
      const routePoint = route.points.find(p => 
        Math.abs((p.distance || 0) - note.position) < 10
      ) || route.points[0];

      // Center map on the note with animation
      mapInstanceRef.current.flyTo(
        [routePoint.lat, routePoint.lng],
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
