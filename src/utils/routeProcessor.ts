import * as turf from '@turf/turf';
import { Route, RoutePoint, PaceNote } from '../types';

// Removed unused CornerSegment interface

export class RouteProcessor {
  private static readonly INTERPOLATION_DISTANCE = 5; // meters
  private static readonly BEARING_CHANGE_THRESHOLD = 15; // degrees
  private static readonly CORNER_END_THRESHOLD = 5; // degrees
  private static readonly CORNER_END_DISTANCE = 10; // meters

  static processRoute(route: Route): PaceNote[] {
    if (!route.points || route.points.length < 2) {
      return [];
    }

    // Interpolate to 5m resolution
    const interpolatedPoints = this.interpolatePoints(route.points);
    
    // Generate pace notes
    const paceNotes: PaceNote[] = [];
    
    // Add start note
    paceNotes.push({
      distance: 0,
      turnNumber: 6, // Start is straight
      direction: 'Straight',
      surface: 'asphalt'
    });

    // Analyze route in segments for corners
    const cornerNotes = this.findCorners(interpolatedPoints);
    paceNotes.push(...cornerNotes);

    return paceNotes;
  }

  private static interpolatePoints(points: RoutePoint[]): RoutePoint[] {
    const interpolated: RoutePoint[] = [];
    let cumulativeDistance = 0;

    for (let i = 0; i < points.length - 1; i++) {
      const currentPoint = points[i];
      const nextPoint = points[i + 1];
      
      interpolated.push({
        ...currentPoint,
        distance: cumulativeDistance
      });

      const segmentDistance = turf.distance(
        [currentPoint.lng, currentPoint.lat],
        [nextPoint.lng, nextPoint.lat],
        { units: 'meters' }
      );

      // Add interpolated points every 5m
      const numSegments = Math.floor(segmentDistance / this.INTERPOLATION_DISTANCE);
      for (let j = 1; j <= numSegments; j++) {
        const ratio = (j * this.INTERPOLATION_DISTANCE) / segmentDistance;
        const interpolatedPoint = this.interpolatePoint(currentPoint, nextPoint, ratio);
        cumulativeDistance += this.INTERPOLATION_DISTANCE;
        
        interpolated.push({
          ...interpolatedPoint,
          distance: cumulativeDistance
        });
      }

      cumulativeDistance += segmentDistance % this.INTERPOLATION_DISTANCE;
    }

    // Add final point
    const lastPoint = points[points.length - 1];
    interpolated.push({
      ...lastPoint,
      distance: cumulativeDistance
    });

    return interpolated;
  }

  private static interpolatePoint(point1: RoutePoint, point2: RoutePoint, ratio: number): RoutePoint {
    return {
      lat: point1.lat + (point2.lat - point1.lat) * ratio,
      lng: point1.lng + (point2.lng - point1.lng) * ratio,
      elevation: (point1.elevation || 0) + ((point2.elevation || 0) - (point1.elevation || 0)) * ratio
    };
  }

  private static findCorners(points: RoutePoint[]): PaceNote[] {
    const notes: PaceNote[] = [];
    
    // Use a sliding window to find corners
    const windowSize = Math.min(20, Math.floor(points.length / 10)); // ~100m window at 5m resolution
    
    for (let i = windowSize; i < points.length - windowSize; i += windowSize / 2) {
      const startIdx = Math.max(0, i - windowSize);
      const endIdx = Math.min(points.length - 1, i + windowSize);
      const centerIdx = i;
      
      if (endIdx - startIdx < 6) continue; // Need at least 6 points for analysis
      
      const cornerNote = this.analyzeCorner(points, startIdx, centerIdx, endIdx);
      if (cornerNote) {
        notes.push(cornerNote);
      }
    }
    
    return notes;
  }

  private static analyzeCorner(points: RoutePoint[], startIdx: number, centerIdx: number, endIdx: number): PaceNote | null {
    const startPoint = points[startIdx];
    const centerPoint = points[centerIdx];
    const endPoint = points[endIdx];
    
    // Calculate the overall bearing change
    const bearing1 = turf.bearing([startPoint.lng, startPoint.lat], [centerPoint.lng, centerPoint.lat]);
    const bearing2 = turf.bearing([centerPoint.lng, centerPoint.lat], [endPoint.lng, endPoint.lat]);
    
    let bearingChange = bearing2 - bearing1;
    bearingChange = this.normalizeBearing(bearingChange);
    
    const absBearingChange = Math.abs(bearingChange);
    
    // Only create notes for significant direction changes (>10 degrees)
    if (absBearingChange < 10) return null;
    
    // Calculate radius using circumcircle formula
    const radius = this.calculateCircumradius(startPoint, centerPoint, endPoint);
    if (!radius || radius < 0 || radius > 2000) return null;
    
    // Map to McRae scale
    const turnNumber = this.mapRadiusToMcRae(radius);
    
    // Determine direction
    const direction = bearingChange > 0 ? 'Right' : 'Left';
    
    // Calculate length modifier based on total angle
    const totalAngle = absBearingChange;
    const lengthModifier = this.getLengthModifier(totalAngle);
    
    // Check for elevation changes
    const elevation = this.getElevationChangeSimple(points.slice(startIdx, endIdx + 1));
    
    return {
      distance: Math.round(centerPoint.distance || 0),
      turnNumber,
      direction,
      lengthModifier,
      elevation,
      surface: 'asphalt'
    };
  }

  private static normalizeBearing(bearing: number): number {
    while (bearing > 180) bearing -= 360;
    while (bearing < -180) bearing += 360;
    return bearing;
  }

  private static getElevationChangeSimple(points: RoutePoint[]): 'Crest' | 'Dip' | 'Jump' | undefined {
    if (points.length < 3) return undefined;
    
    const elevations = points.map(p => p.elevation || 0);
    const startElev = elevations[0];
    const endElev = elevations[elevations.length - 1];
    const maxElev = Math.max(...elevations);
    const minElev = Math.min(...elevations);
    
    const elevChange = endElev - startElev;
    const elevRange = maxElev - minElev;
    
    // Simple elevation detection
    if (elevRange > 15) return 'Jump';
    if (elevChange > 8) return 'Crest';
    if (elevChange < -8) return 'Dip';
    
    return undefined;
  }

  private static calculateCircumradius(p1: RoutePoint, p2: RoutePoint, p3: RoutePoint): number | null {
    // Convert to meters for calculation
    const a = turf.distance([p1.lng, p1.lat], [p2.lng, p2.lat], { units: 'meters' });
    const b = turf.distance([p2.lng, p2.lat], [p3.lng, p3.lat], { units: 'meters' });
    const c = turf.distance([p3.lng, p3.lat], [p1.lng, p1.lat], { units: 'meters' });

    // Calculate area using Heron's formula
    const s = (a + b + c) / 2;
    const area = Math.sqrt(s * (s - a) * (s - b) * (s - c));

    if (area === 0) return null;

    // Circumradius formula: R = abc / (4 * Area)
    return (a * b * c) / (4 * area);
  }

  private static mapRadiusToMcRae(radius: number): number {
    if (radius < 20) return 1;  // Hairpin
    if (radius < 40) return 2;  // Sharp
    if (radius < 70) return 3;  // Medium
    if (radius < 120) return 4; // Open
    if (radius < 200) return 5; // Slight
    return 6; // Near-straight
  }

  private static getLengthModifier(totalAngle: number): 'Long' | 'Short' | undefined {
    if (totalAngle > 90) return 'Long';
    if (totalAngle < 45) return 'Short';
    return undefined;
  }
}
