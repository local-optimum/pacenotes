import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Route } from '../types';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

interface MapViewerProps {
  route: Route | null;
}

const MapViewer: React.FC<MapViewerProps> = ({ route }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    if (mapRef.current && !mapInstanceRef.current) {
      // Initialize map
      mapInstanceRef.current = L.map(mapRef.current).setView([40.7589, -73.9851], 13);
      
      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapInstanceRef.current);
    }
  }, []);

  useEffect(() => {
    if (mapInstanceRef.current && route) {
      // Remove existing route layer
      if (routeLayerRef.current) {
        mapInstanceRef.current.removeLayer(routeLayerRef.current);
      }

      // Add new route
      const latLngs: L.LatLngExpression[] = route.points.map(point => [point.lat, point.lng]);
      
      routeLayerRef.current = L.polyline(latLngs, {
        color: 'red',
        weight: 4,
        opacity: 0.8
      }).addTo(mapInstanceRef.current);

      // Add start and end markers
      if (route.points.length > 0) {
        const startPoint = route.points[0];
        const endPoint = route.points[route.points.length - 1];

        L.marker([startPoint.lat, startPoint.lng])
          .bindPopup('Start')
          .addTo(mapInstanceRef.current);

        L.marker([endPoint.lat, endPoint.lng])
          .bindPopup('Finish')
          .addTo(mapInstanceRef.current);
      }

      // Fit map to route bounds
      if (routeLayerRef.current) {
        mapInstanceRef.current.fitBounds(routeLayerRef.current.getBounds(), {
          padding: [20, 20]
        });
      }
    }
  }, [route]);

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
      <div className="p-4 bg-gray-50 border-b">
        <h3 className="text-lg font-semibold text-gray-800">Route Map</h3>
      </div>
      <div 
        ref={mapRef} 
        className="h-96 w-full"
        style={{ minHeight: '400px' }}
      />
    </div>
  );
};

export default MapViewer;
