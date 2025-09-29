import { Coordinates } from '../types';

export interface GeocodingResult {
  displayName: string;
  lat: number;
  lng: number;
  type: string;
  importance: number;
}

/**
 * Nominatim Geocoding Service (OpenStreetMap)
 * Free geocoding service, no API key required
 */
export class GeocodingService {
  private static readonly BASE_URL = 'https://nominatim.openstreetmap.org';
  
  /**
   * Search for places/addresses
   */
  static async search(query: string): Promise<GeocodingResult[]> {
    if (!query || query.trim().length < 3) {
      return [];
    }

    try {
      const params = new URLSearchParams({
        q: query,
        format: 'json',
        addressdetails: '1',
        limit: '5',
        countrycodes: 'gb,ie,us,ca,au,nz,de,fr,es,it' // Focus on common rally countries
      });

      const response = await fetch(`${this.BASE_URL}/search?${params}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'RallyPaceNotesGenerator/1.0' // Required by Nominatim policy
        }
      });

      if (!response.ok) {
        console.warn('Geocoding request failed:', response.status);
        return [];
      }

      const data = await response.json();
      
      return data.map((result: any) => ({
        displayName: result.display_name,
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        type: result.type,
        importance: result.importance
      }));
    } catch (error) {
      console.error('Geocoding error:', error);
      return [];
    }
  }

  /**
   * Reverse geocode (coordinates to address)
   */
  static async reverseGeocode(coords: Coordinates): Promise<string | null> {
    try {
      const params = new URLSearchParams({
        lat: coords.lat.toString(),
        lon: coords.lng.toString(),
        format: 'json',
        zoom: '18'
      });

      const response = await fetch(`${this.BASE_URL}/reverse?${params}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'RallyPaceNotesGenerator/1.0'
        }
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.display_name || null;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return null;
    }
  }
}
