export interface Coordinates {
  lat: number;
  lng: number;
}

export interface RoutePoint extends Coordinates {
  elevation?: number;
  distance?: number;
}

export interface PaceNote {
  position: number; // Distance from route start in meters
  type: 'Turn' | 'SpecialTurn' | 'Straight' | 'Hazard' | 'Distance' | 'Advice';
  direction: 'Left' | 'Right' | null; // null for non-directional notes
  severity: number | string; // 1-6 for turns; strings for specials like "Square", "Hairpin", "Acute"
  modifiers: Array<string | { type: string; to?: number }>; // e.g., ["Long"], ["Tightens", {type: "to", to: 3}]
  distanceToNext?: number | null; // Meters to next pacenote; null if immediate
  hazards: string[]; // e.g., ["Crest", "Don't Cut", "Jump"]
  advice: string[]; // e.g., ["Caution", "Keep Middle"]
  surface: string;
  
  // Legacy fields for backward compatibility
  distance: number; // Same as position
  turnNumber: number; // Same as severity when it's a number
  lengthModifier?: 'Long' | 'Short';
  radiusChange?: {
    type: 'tightens' | 'widens';
    toSeverity: number;
  };
  elevation?: 'Crest' | 'Dip' | 'Jump';
}

export interface Route {
  points: RoutePoint[];
  totalDistance: number;
  totalTime: number;
  bbox: number[];
}

export interface GraphHopperResponse {
  paths: Array<{
    points: {
      coordinates: number[][];
    };
    distance: number;
    time: number;
    bbox: number[];
    points_encoded: boolean;
    snapped_waypoints: {
      coordinates: number[][];
    };
  }>;
}

export interface RouteInputData {
  start: string;
  end: string;
}

export interface AppState {
  route: Route | null;
  paceNotes: PaceNote[];
  loading: boolean;
  error: string | null;
  startPoint: Coordinates | null;
  endPoint: Coordinates | null;
  mapMode: 'select-start' | 'select-end' | 'view-route';
}
