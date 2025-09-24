import React, { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Route, Coordinates } from '../types';

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
}

const InteractiveMapViewer: React.FC<InteractiveMapViewerProps> = ({
  route,
  startPoint,
  endPoint,
  mapMode,
  onPointSelect,
  onModeChange
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const startMarkerRef = useRef<L.Marker | null>(null);
  const endMarkerRef = useRef<L.Marker | null>(null);

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

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden h-full flex flex-col">
      {/* Status Bar */}
      <div className={`p-3 border-b ${getModeColor()}`}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{getModeInstructions()}</span>
          <div className="flex gap-2">
            <button
              onClick={() => onModeChange('select-start')}
              className="text-xs px-2 py-1 rounded bg-white/50 hover:bg-white/80 transition-colors"
            >
              Reset Start
            </button>
            <button
              onClick={() => onModeChange('select-end')}
              className="text-xs px-2 py-1 rounded bg-white/50 hover:bg-white/80 transition-colors"
              disabled={!startPoint}
            >
              Reset End
            </button>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div 
        ref={mapRef} 
        className="flex-1 w-full min-h-0"
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
