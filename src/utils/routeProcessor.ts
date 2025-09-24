import * as turf from '@turf/turf';
import { Route, RoutePoint, PaceNote } from '../types';

export class RouteProcessor {
  private static readonly SEGMENT_DISTANCE = 50; // meters
  private static readonly ELEVATION_THRESHOLD = 5; // meters

  static processRoute(route: Route): PaceNote[] {
    if (!route.points || route.points.length < 2) {
      return [];
    }

    // Create segments every 50m
    const segments = this.createSegments(route.points);
    
    // Generate pace notes for each segment
    const paceNotes: PaceNote[] = [];
    let cumulativeDistance = 0;

    for (let i = 1; i < segments.length; i++) {
      const prevSegment = segments[i - 1];
      const currentSegment = segments[i];
      const nextSegment = segments[i + 1];

      // Calculate distance
      cumulativeDistance += this.SEGMENT_DISTANCE;

      // Calculate turn angle if we have enough points
      if (nextSegment) {
        const turnAngle = this.calculateTurnAngle(prevSegment, currentSegment, nextSegment);
        const turnNumber = this.getTurnNumber(Math.abs(turnAngle));
        const direction = this.getTurnDirection(turnAngle);

        // Only add pace note if it's a significant turn (not near straight)
        if (turnNumber < 6) {
          const elevation = this.getElevationChange(prevSegment, currentSegment, nextSegment);
          
          paceNotes.push({
            distance: cumulativeDistance,
            turnNumber,
            direction,
            elevation,
            surface: 'asphalt'
          });
        }
      }
    }

    return paceNotes;
  }

  private static createSegments(points: RoutePoint[]): RoutePoint[] {
    if (points.length < 2) return points;

    const segments: RoutePoint[] = [points[0]];
    let currentDistance = 0;
    let currentPointIndex = 0;

    while (currentPointIndex < points.length - 1) {
      const currentPoint = points[currentPointIndex];
      const nextPoint = points[currentPointIndex + 1];

      const segmentDistance = turf.distance(
        [currentPoint.lng, currentPoint.lat],
        [nextPoint.lng, nextPoint.lat],
        { units: 'meters' }
      );

      if (currentDistance + segmentDistance >= this.SEGMENT_DISTANCE) {
        // Interpolate point at exact segment distance
        const ratio = (this.SEGMENT_DISTANCE - currentDistance) / segmentDistance;
        const interpolatedPoint = this.interpolatePoint(currentPoint, nextPoint, ratio);
        segments.push(interpolatedPoint);
        
        // Reset distance counter
        currentDistance = 0;
        
        // Continue from interpolated point
        points[currentPointIndex] = interpolatedPoint;
      } else {
        currentDistance += segmentDistance;
        currentPointIndex++;
      }
    }

    // Add final point if not already added
    const lastPoint = points[points.length - 1];
    if (segments[segments.length - 1] !== lastPoint) {
      segments.push(lastPoint);
    }

    return segments;
  }

  private static interpolatePoint(point1: RoutePoint, point2: RoutePoint, ratio: number): RoutePoint {
    return {
      lat: point1.lat + (point2.lat - point1.lat) * ratio,
      lng: point1.lng + (point2.lng - point1.lng) * ratio,
      elevation: (point1.elevation || 0) + ((point2.elevation || 0) - (point1.elevation || 0)) * ratio
    };
  }

  private static calculateTurnAngle(point1: RoutePoint, point2: RoutePoint, point3: RoutePoint): number {
    // Calculate bearing from point1 to point2
    const bearing1 = turf.bearing([point1.lng, point1.lat], [point2.lng, point2.lat]);
    
    // Calculate bearing from point2 to point3
    const bearing2 = turf.bearing([point2.lng, point2.lat], [point3.lng, point3.lat]);
    
    // Calculate turn angle
    let turnAngle = bearing2 - bearing1;
    
    // Normalize to -180 to 180 range
    while (turnAngle > 180) turnAngle -= 360;
    while (turnAngle < -180) turnAngle += 360;
    
    return turnAngle;
  }

  private static getTurnNumber(absoluteAngle: number): number {
    if (absoluteAngle < 30) return 1;  // Hairpin
    if (absoluteAngle < 60) return 2;  // Sharp
    if (absoluteAngle < 90) return 3;  // Medium
    if (absoluteAngle < 120) return 4; // Open
    if (absoluteAngle < 150) return 5; // Slight
    return 6; // Near straight
  }

  private static getTurnDirection(turnAngle: number): 'Left' | 'Right' | 'Straight' {
    if (Math.abs(turnAngle) < 15) return 'Straight';
    return turnAngle < 0 ? 'Left' : 'Right';
  }

  private static getElevationChange(
    point1: RoutePoint, 
    point2: RoutePoint, 
    point3: RoutePoint
  ): 'Crest' | 'Dip' | undefined {
    const elev1 = point1.elevation || 0;
    const elev2 = point2.elevation || 0;
    const elev3 = point3.elevation || 0;

    // Check for crest (going up then down)
    if (elev2 > elev1 + this.ELEVATION_THRESHOLD && elev2 > elev3 + this.ELEVATION_THRESHOLD) {
      return 'Crest';
    }
    
    // Check for dip (going down then up)
    if (elev2 < elev1 - this.ELEVATION_THRESHOLD && elev2 < elev3 - this.ELEVATION_THRESHOLD) {
      return 'Dip';
    }

    return undefined;
  }
}
