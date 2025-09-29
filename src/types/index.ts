export interface Coordinates {
  lat: number;
  lng: number;
}

export interface RoutePoint extends Coordinates {
  elevation?: number;
  distance?: number;
}

export interface PaceNote {
  distance: number;
  turnNumber: number;
  direction: 'Left' | 'Right' | 'Straight' | 'U-turn Left' | 'U-turn Right';
  lengthModifier?: 'Long' | 'Short';
  radiusChange?: {
    type: 'tightens' | 'widens';
    toSeverity: number;
  };
  elevation?: 'Crest' | 'Dip' | 'Jump';
  surface: string;
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
