import { Coordinates, Route, RoutePoint, GraphHopperResponse } from '../types';

const API_KEY = process.env.REACT_APP_GRAPHHOPPER_API_KEY;
const BASE_URL = 'https://graphhopper.com/api/1/route';

export class GraphHopperService {
  private static validateApiKey(): void {
    if (!API_KEY || API_KEY === 'your_graphhopper_api_key_here') {
      throw new Error('GraphHopper API key not configured. Please set REACT_APP_GRAPHHOPPER_API_KEY in your .env file.');
    }
  }

  private static parseCoordinates(input: string): Coordinates {
    // Try to parse as coordinates first (lat,lng)
    const coordMatch = input.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
    if (coordMatch) {
      return {
        lat: parseFloat(coordMatch[1]),
        lng: parseFloat(coordMatch[2])
      };
    }
    
    // If not coordinates, throw error (geocoding would require additional service)
    throw new Error(`Invalid coordinates format: ${input}. Please use "lat,lng" format (e.g., "40.748817,-73.985428")`);
  }

  static async getRoute(startInput: string, endInput: string): Promise<Route> {
    this.validateApiKey();

    try {
      const start = this.parseCoordinates(startInput);
      const end = this.parseCoordinates(endInput);

      const url = new URL(BASE_URL);
      url.searchParams.append('point', `${start.lat},${start.lng}`);
      url.searchParams.append('point', `${end.lat},${end.lng}`);
      url.searchParams.append('vehicle', 'car');
      url.searchParams.append('elevation', 'true');
      url.searchParams.append('points_encoded', 'false');
      url.searchParams.append('type', 'json');
      url.searchParams.append('key', API_KEY!);

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid GraphHopper API key. Please check your configuration.');
        }
        throw new Error(`GraphHopper API error: ${response.status} ${response.statusText}`);
      }

      const data: GraphHopperResponse = await response.json();
      
      if (!data.paths || data.paths.length === 0) {
        throw new Error('No route found between the specified points.');
      }

      const path = data.paths[0];
      
      // Convert coordinates to RoutePoint format
      const points: RoutePoint[] = path.points.coordinates.map((coord, index) => ({
        lng: coord[0],
        lat: coord[1],
        elevation: coord[2] || 0,
        distance: index // Will be calculated properly in route processing
      }));

      return {
        points,
        totalDistance: path.distance,
        totalTime: path.time,
        bbox: path.bbox
      };

    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to fetch route from GraphHopper');
    }
  }

  static async testApiKey(): Promise<boolean> {
    try {
      this.validateApiKey();
      
      // Test with a simple route request
      const url = new URL(BASE_URL);
      url.searchParams.append('point', '40.748817,-73.985428');
      url.searchParams.append('point', '40.758896,-73.985130');
      url.searchParams.append('vehicle', 'car');
      url.searchParams.append('key', API_KEY!);

      const response = await fetch(url.toString());
      return response.ok;
    } catch {
      return false;
    }
  }
}
