import * as turf from '@turf/turf';
import { Route, RoutePoint, PaceNote } from '../types';

/**
 * RouteProcessor - Generates pace notes from GPS route data
 * Implements the McRae 1-6 severity system with advanced corner detection
 * Based on DiRT Rally pace notes specification
 * 
 * OFFLINE PROCESSING: We can afford deep analysis since we're not real-time constrained
 */
export class RouteProcessor {
  // Configuration constants
  private static readonly INTERPOLATION_DISTANCE = 3; // meters - fine resolution
  
  // McRae severity thresholds (radius in meters) - from design spec
  private static readonly SEVERITY_THRESHOLDS = {
    1: 20,   // Hairpin: <20m
    2: 40,   // Sharp: 20-40m
    3: 70,   // Medium: 40-70m
    4: 120,  // Open: 70-120m
    5: 200,  // Slight: 120-200m
    6: 500   // Near-straight: 200-500m (>500m is straight)
  };
  
  // Elevation change thresholds
  private static readonly CREST_THRESHOLD = 5; // meters per 100m
  private static readonly DIP_THRESHOLD = 5; // meters per 100m
  private static readonly JUMP_THRESHOLD = 10; // meters total over 50m
  
  /**
   * Main processing function - generates pace notes from route
   */
  static processRoute(route: Route): PaceNote[] {
    if (!route.points || route.points.length < 2) {
      return [];
    }

    // Step 1: Calculate proper distances for original route points
    this.calculateRoutePointDistances(route.points);

    // Step 2: Interpolate to 3m resolution for better accuracy
    const interpolatedPoints = this.interpolatePoints(route.points);
    
    if (interpolatedPoints.length < 10) {
      return [];
    }

    console.log(`Processing ${interpolatedPoints.length} interpolated points over ${(route.totalDistance / 1000).toFixed(2)}km`);
    console.log(`Route distance range: 0m to ${route.totalDistance.toFixed(0)}m`);

    // Step 3: Comprehensive curvature analysis - calculate radius at every point
    const curvatureData = this.calculateCurvatureProfile(interpolatedPoints);
    
    // Step 4: Identify significant corners from curvature profile
    const cornerSegments = this.identifySignificantCorners(curvatureData, interpolatedPoints);
    
    // Step 4.5: Detect sharp instant turns (1-2 point GPS turns like 90° street corners)
    const instantTurns = this.detectInstantSharpTurns(curvatureData, interpolatedPoints);
    
    // Merge instant turns with regular corners
    const allCorners = [...cornerSegments, ...instantTurns];
    
    // Sort by position and remove duplicates
    allCorners.sort((a, b) => a.position - b.position);
    const uniqueCorners = this.removeDuplicateCorners(allCorners);
    
    console.log(`Found ${cornerSegments.length} sustained corners + ${instantTurns.length} instant turns = ${uniqueCorners.length} total`);
    uniqueCorners.forEach((seg, idx) => {
      const length = (seg.endIdx - seg.startIdx) * this.INTERPOLATION_DISTANCE;
      console.log(`  Corner ${idx}: ${Math.round(seg.position / 10) * 10}m, length: ${length.toFixed(0)}m, angle: ${seg.totalAngle.toFixed(1)}°, direction: ${seg.direction}`);
    });
    
    // Step 5: Generate pace notes from corners
    const paceNotes: PaceNote[] = [];
    
    // Check if the first corner starts at or very near the beginning (within 50m)
    // If so, use it as the start note instead of a generic straight
    let firstCornerIsStart = false;
    if (uniqueCorners.length > 0 && uniqueCorners[0].position < 50) {
      const startNote = this.analyzeCorner(uniqueCorners[0], interpolatedPoints);
      if (startNote) {
        // Mark as start by setting position to 0
        startNote.position = 0;
        startNote.distance = 0;
        paceNotes.push(startNote);
        firstCornerIsStart = true;
      }
    }
    
    // If we didn't use the first corner as start, add generic start note
    if (!firstCornerIsStart) {
      paceNotes.push(this.createStartNote());
    }
    
    // Process remaining corners (skip first if it was used as start)
    const cornersToProcess = firstCornerIsStart ? uniqueCorners.slice(1) : uniqueCorners;
    for (const segment of cornersToProcess) {
      const note = this.analyzeCorner(segment, interpolatedPoints);
      if (note) {
        paceNotes.push(note);
      }
    }
    
    // Step 6: Add finish note
    const finishNote = this.createFinishNote(route.totalDistance);
    paceNotes.push(finishNote);
    
    // Step 7: Calculate distances to next notes (including to finish)
    this.calculateDistancesToNext(paceNotes);
    
    // Debug output
    console.log(`Generated ${paceNotes.length} pace notes (including START and FINISH)`);
    paceNotes.forEach((note, idx) => {
      if (idx > 0 && idx < paceNotes.length - 1) {
        console.log(`Note ${idx}: ${this.roundDistance(note.position)}m - ${note.severity} ${note.direction || ''}`);
      }
    });
    
    return paceNotes;
  }

  /**
   * Calculate curvature at every point using multiple window sizes
   * Returns radius estimate for each point
   */
  private static calculateCurvatureProfile(points: RoutePoint[]): Array<{
    idx: number;
    radius: number;
    bearing: number;
  }> {
    const profile: Array<{ idx: number; radius: number; bearing: number }> = [];
    
    for (let i = 0; i < points.length; i++) {
      // Calculate bearing at this point
      let bearing = 0;
      if (i < points.length - 1) {
        bearing = turf.bearing(
          [points[i].lng, points[i].lat],
          [points[i + 1].lng, points[i + 1].lat]
        );
      }
      
      // Calculate radius using multiple window sizes, take minimum (tightest)
      const windowSizes = [5, 10, 15, 20]; // meters
      const radii: number[] = [];
      
      for (const windowMeters of windowSizes) {
        const windowPoints = Math.floor(windowMeters / this.INTERPOLATION_DISTANCE);
        const before = Math.max(0, i - windowPoints);
        const after = Math.min(points.length - 1, i + windowPoints);
        
        if (after - before >= 2) {
          const radius = this.calculateCircumradius(
            points[before],
            points[i],
            points[after]
          );
          
          if (radius && radius > 0 && radius < 2000) {
            radii.push(radius);
          }
        }
      }
      
      // Use minimum radius (represents tightest curve detected)
      const finalRadius = radii.length > 0 ? Math.min(...radii) : 9999;
      
      profile.push({
        idx: i,
        radius: finalRadius,
        bearing: bearing
      });
    }
    
    return profile;
  }

  /**
   * Identify significant corners from curvature profile
   * A corner is significant if it has sustained curvature AND sufficient angle change
   * Position is set to the TIGHTEST point (minimum radius) for accurate calling
   */
  private static identifySignificantCorners(
    curvatureData: Array<{ idx: number; radius: number; bearing: number }>,
    points: RoutePoint[]
  ): Array<{
    startIdx: number;
    endIdx: number;
    position: number;
    totalAngle: number;
    direction: 'Left' | 'Right';
    avgRadius: number;
  }> {
    const corners: Array<{
      startIdx: number;
      endIdx: number;
      position: number;
      totalAngle: number;
      direction: 'Left' | 'Right';
      avgRadius: number;
    }> = [];
    
    // Define what constitutes "curved" based on severity thresholds
    const CURVED_THRESHOLD = this.SEVERITY_THRESHOLDS[6]; // < 500m radius is curved
    const MIN_CORNER_ANGLE = 12; // degrees - lowered to catch gentle sweepers
    const MIN_CORNER_POINTS = 5; // minimum points to analyze
    const STRAIGHT_LOOKBACK = 7; // points to check for end of corner
    
    // For very tight corners (hairpins), lower the threshold even more
    const HAIRPIN_RADIUS_THRESHOLD = 50; // meters - anything tighter might be a hairpin
    const MIN_HAIRPIN_ANGLE = 8; // degrees - hairpins can be detected with less angle if very tight
    
    let inCorner = false;
    let cornerStart = 0;
    let cornerRadii: number[] = [];
    let bearingStart = 0;
    
    for (let i = 0; i < curvatureData.length; i++) {
      const { radius, bearing } = curvatureData[i];
      
      if (!inCorner) {
        // Start corner when radius drops below threshold
        if (radius < CURVED_THRESHOLD) {
          inCorner = true;
          cornerStart = i;
          cornerRadii = [radius];
          bearingStart = bearing;
        }
      } else {
        // In corner - keep going while curved
        if (radius < CURVED_THRESHOLD) {
          // CRITICAL SAFETY CHECK: Has the direction changed?
          // If we started turning left and now turning right (or vice versa), END CORNER NOW
          const currentBearingChange = this.normalizeBearing(bearing - bearingStart);
          const startDirection = currentBearingChange < 0 ? 'Left' : 'Right';
          
          // Check if accumulated angle shows we started one way
          if (cornerRadii.length > 5) { // Only check after we have some data
            const earlyBearing = curvatureData[cornerStart + 3].bearing;
            const earlyChange = this.normalizeBearing(earlyBearing - bearingStart);
            const earlyDirection = earlyChange < 0 ? 'Left' : 'Right';
            
            // If direction has flipped, this is TWO corners, not one!
            if (earlyDirection !== startDirection && Math.abs(earlyChange) > 10) {
              console.log(`  ⚠️ DIRECTION CHANGE DETECTED: ${earlyDirection} → ${startDirection} at ${points[i].distance?.toFixed(0)}m - ending corner`);
              
              // End the first corner NOW
              const cornerEnd = i - 1;
              const cornerLength = cornerEnd - cornerStart;
              
              if (cornerLength >= MIN_CORNER_POINTS && cornerRadii.length > 0) {
                const bearingEnd = curvatureData[cornerEnd].bearing;
                let totalAngle = Math.abs(this.normalizeBearing(bearingEnd - bearingStart));
                const avgRadius = cornerRadii.reduce((sum, r) => sum + r, 0) / cornerRadii.length;
                
                const isHairpin = avgRadius < HAIRPIN_RADIUS_THRESHOLD;
                const minAngle = isHairpin ? MIN_HAIRPIN_ANGLE : MIN_CORNER_ANGLE;
                
                if (totalAngle >= minAngle) {
                  const direction: 'Left' | 'Right' = earlyDirection;
                  
                  const turnStartIdx = this.findTurnStartPoint(
                    curvatureData, 
                    cornerStart, 
                    cornerEnd,
                    avgRadius
                  );
                  
                  corners.push({
                    startIdx: cornerStart,
                    endIdx: cornerEnd,
                    position: points[turnStartIdx].distance || 0,
                    totalAngle,
                    direction,
                    avgRadius
                  });
                }
              }
              
              // Start a NEW corner from current position
              inCorner = true;
              cornerStart = i;
              cornerRadii = [radius];
              bearingStart = bearing;
              continue;
            }
          }
          
          cornerRadii.push(radius);
        } else {
          // Check if we've accumulated enough straight sections to end
          // BUT be more conservative for sharp turns (they often have brief straight at apex)
          let straightCount = 0;
          for (let j = i; j < Math.min(i + STRAIGHT_LOOKBACK, curvatureData.length); j++) {
            if (curvatureData[j].radius >= CURVED_THRESHOLD) {
              straightCount++;
            }
          }
          
          // Calculate current average radius to determine corner tightness
          const currentAvgRadius = cornerRadii.length > 0 
            ? cornerRadii.reduce((sum, r) => sum + r, 0) / cornerRadii.length 
            : 999;
          
          // For sharp corners, require MORE straight points to end (don't split at apex)
          const requiredStraight = currentAvgRadius < 80 ? 6 : 4; // Sharp turns need 6, normal need 4
          
          if (straightCount >= requiredStraight) { // Need at least N straight points to end corner
            // End of corner - but check if this might be a split corner
            const cornerEnd = i - straightCount; // Don't include the straight section
            const cornerLength = cornerEnd - cornerStart;
            
            if (cornerLength >= MIN_CORNER_POINTS && cornerRadii.length > 0) {
              // Calculate total angle change
              const bearingEnd = curvatureData[cornerEnd].bearing;
              let totalAngle = Math.abs(this.normalizeBearing(bearingEnd - bearingStart));
              const avgRadius = cornerRadii.reduce((sum, r) => sum + r, 0) / cornerRadii.length;
              
              // Check if this looks like HALF of a 90° turn (might be split)
              const looksLikeSplitCorner = (
                totalAngle >= 35 && totalAngle <= 55 && // ~45° (half of 90°)
                avgRadius < 80 // Sharp corner
              );
              
              if (looksLikeSplitCorner) {
                // Don't end yet - might be hitting apex of a sharp turn
                // Look ahead to see if curvature resumes in same direction
                let resumesInSameDirection = false;
                const checkDistance = 10;
                
                for (let k = i; k < Math.min(i + checkDistance, curvatureData.length); k++) {
                  if (curvatureData[k].radius < CURVED_THRESHOLD) {
                    // Found more curve - check if same direction
                    const futureBearing = curvatureData[Math.min(k + 5, curvatureData.length - 1)].bearing;
                    const futureDirection = this.normalizeBearing(futureBearing - curvatureData[k].bearing);
                    const currentDirection = this.normalizeBearing(bearingEnd - bearingStart);
                    
                    if ((futureDirection < 0 && currentDirection < 0) || 
                        (futureDirection > 0 && currentDirection > 0)) {
                      resumesInSameDirection = true;
                      break;
                    }
                  }
                }
                
                if (resumesInSameDirection) {
                  // Keep going - this is likely a split corner
                  cornerRadii.push(radius);
                  continue;
                }
              }
              
              // Check if it's a tight corner (hairpin) with lower angle threshold
              const isHairpin = avgRadius < HAIRPIN_RADIUS_THRESHOLD;
              const minAngle = isHairpin ? MIN_HAIRPIN_ANGLE : MIN_CORNER_ANGLE;
              
              // Only register if angle change is significant
              if (totalAngle >= minAngle) {
                const direction: 'Left' | 'Right' = 
                  this.normalizeBearing(bearingEnd - bearingStart) < 0 ? 'Left' : 'Right';
                
                console.log(`  Detected: angle ${totalAngle.toFixed(1)}°, radius ${avgRadius.toFixed(1)}m (threshold: ${minAngle.toFixed(1)}°)`);
                
                // Smart positioning: find where the turn ACTUALLY starts
                const turnStartIdx = this.findTurnStartPoint(
                  curvatureData, 
                  cornerStart, 
                  cornerEnd,
                  avgRadius
                );
                
                corners.push({
                  startIdx: cornerStart,
                  endIdx: cornerEnd,
                  position: points[turnStartIdx].distance || 0,
                  totalAngle,
                  direction,
                  avgRadius
                });
              }
            }
            
            inCorner = false;
            cornerRadii = [];
          } else {
            // Brief straight, still in corner
            cornerRadii.push(radius);
          }
        }
      }
    }
    
    // Handle corner at end of route
    if (inCorner && cornerRadii.length >= MIN_CORNER_POINTS) {
      const cornerEnd = curvatureData.length - 1;
      const bearingEnd = curvatureData[cornerEnd].bearing;
      let totalAngle = Math.abs(this.normalizeBearing(bearingEnd - bearingStart));
      const avgRadius = cornerRadii.reduce((sum, r) => sum + r, 0) / cornerRadii.length;
      
      // Check if it's a tight corner (hairpin) with lower angle threshold
      const isHairpin = avgRadius < HAIRPIN_RADIUS_THRESHOLD;
      const minAngle = isHairpin ? MIN_HAIRPIN_ANGLE : MIN_CORNER_ANGLE;
      
      if (totalAngle >= minAngle) {
        const direction: 'Left' | 'Right' = 
          this.normalizeBearing(bearingEnd - bearingStart) < 0 ? 'Left' : 'Right';
        
        console.log(`  Detected end-of-route: angle ${totalAngle.toFixed(1)}°, radius ${avgRadius.toFixed(1)}m (threshold: ${minAngle.toFixed(1)}°)`);
        
        // Smart positioning: find where the turn ACTUALLY starts
        const turnStartIdx = this.findTurnStartPoint(
          curvatureData, 
          cornerStart, 
          cornerEnd,
          avgRadius
        );
        
        corners.push({
          startIdx: cornerStart,
          endIdx: cornerEnd,
          position: points[turnStartIdx].distance || 0,
          totalAngle,
          direction,
          avgRadius
        });
      }
    }
    
    return corners;
  }

  /**
   * Detect instant sharp turns - these are 90° street corners that appear as 1-2 GPS points
   * between straight sections. Traditional curvature analysis misses these.
   */
  private static detectInstantSharpTurns(
    curvatureData: Array<{ idx: number; radius: number; bearing: number }>,
    points: RoutePoint[]
  ): Array<{
    startIdx: number;
    endIdx: number;
    position: number;
    totalAngle: number;
    direction: 'Left' | 'Right';
    avgRadius: number;
  }> {
    const instantTurns: Array<{
      startIdx: number;
      endIdx: number;
      position: number;
      totalAngle: number;
      direction: 'Left' | 'Right';
      avgRadius: number;
    }> = [];
    
    // Scan for large bearing changes over very short distances
    const lookback = 3; // Check 3 points (~9m) back and forward
    
    for (let i = lookback; i < curvatureData.length - lookback; i++) {
      const beforeBearing = curvatureData[i - lookback].bearing;
      const afterBearing = curvatureData[i + lookback].bearing;
      
      let bearingChange = this.normalizeBearing(afterBearing - beforeBearing);
      const absBearingChange = Math.abs(bearingChange);
      
      // Sharp turn: > 60° change over just 6 points (~18m)
      if (absBearingChange > 60) {
        // Check if this point has tight radius
        const localRadius = curvatureData[i].radius;
        
        if (localRadius < 100) { // Must be reasonably tight
          const direction: 'Left' | 'Right' = bearingChange < 0 ? 'Left' : 'Right';
          
          console.log(`  Instant turn detected at ${points[i].distance?.toFixed(0)}m: ${absBearingChange.toFixed(1)}° over ${lookback * 2 * this.INTERPOLATION_DISTANCE}m, radius ${localRadius.toFixed(1)}m`);
          
          instantTurns.push({
            startIdx: Math.max(0, i - 2),
            endIdx: Math.min(curvatureData.length - 1, i + 2),
            position: points[i].distance || 0,
            totalAngle: absBearingChange,
            direction,
            avgRadius: localRadius
          });
          
          // Skip ahead to avoid detecting same turn multiple times
          i += lookback;
        }
      }
    }
    
    return instantTurns;
  }

  /**
   * Remove duplicate corners (when instant and sustained detectors find the same corner)
   */
  private static removeDuplicateCorners(
    corners: Array<{
      startIdx: number;
      endIdx: number;
      position: number;
      totalAngle: number;
      direction: 'Left' | 'Right';
      avgRadius: number;
    }>
  ): Array<{
    startIdx: number;
    endIdx: number;
    position: number;
    totalAngle: number;
    direction: 'Left' | 'Right';
    avgRadius: number;
  }> {
    if (corners.length === 0) return corners;
    
    const unique: typeof corners = [];
    
    for (const corner of corners) {
      // Check if this is too close to an existing corner
      const isDuplicate = unique.some(existing => {
        const distDiff = Math.abs(corner.position - existing.position);
        const samDirection = corner.direction === existing.direction;
        
        // If within 20m and same direction, it's a duplicate
        return distDiff < 20 && samDirection;
      });
      
      if (!isDuplicate) {
        unique.push(corner);
      } else {
        // Keep the one with better data (more angle or tighter radius)
        const duplicateIdx = unique.findIndex(existing => {
          const distDiff = Math.abs(corner.position - existing.position);
          const samDirection = corner.direction === existing.direction;
          return distDiff < 20 && samDirection;
        });
        
        if (duplicateIdx >= 0) {
          // Replace if this one is sharper (more angle or tighter)
          if (corner.totalAngle > unique[duplicateIdx].totalAngle || 
              corner.avgRadius < unique[duplicateIdx].avgRadius) {
            unique[duplicateIdx] = corner;
          }
        }
      }
    }
    
    return unique;
  }

  /**
   * Find where the turn actually STARTS within a detected corner region
   * This handles cases where there's a gentle approach followed by a sharp turn
   */
  private static findTurnStartPoint(
    curvatureData: Array<{ idx: number; radius: number; bearing: number }>,
    startIdx: number,
    endIdx: number,
    avgRadius: number
  ): number {
    // For very tight corners (severity 1-2), find where curvature sharply increases
    if (avgRadius < this.SEVERITY_THRESHOLDS[2]) { // < 40m = tight corner
      // Look for the point where radius drops significantly
      // Scan from start, find first point where radius is within 20% of minimum
      let minRadius = Infinity;
      for (let i = startIdx; i <= endIdx; i++) {
        if (curvatureData[i].radius < minRadius) {
          minRadius = curvatureData[i].radius;
        }
      }
      
      const targetRadius = minRadius * 1.3; // Within 30% of tightest
      
      for (let i = startIdx; i <= endIdx; i++) {
        if (curvatureData[i].radius <= targetRadius) {
          return i; // This is where it starts getting tight
        }
      }
    }
    
    // For medium corners (severity 3-4), use the point where curvature first exceeds average
    if (avgRadius < this.SEVERITY_THRESHOLDS[4]) { // < 120m = medium corner
      const targetRadius = avgRadius * 1.2; // Slightly above average
      
      for (let i = startIdx; i <= endIdx; i++) {
        if (curvatureData[i].radius <= targetRadius) {
          return i;
        }
      }
    }
    
    // For gentle sweepers (severity 5-6), the entry point is fine
    // Just use the start of the detected region
    return startIdx;
  }

  /**
   * Analyze a corner to generate a pace note
   */
  private static analyzeCorner(
    corner: {
      startIdx: number;
      endIdx: number;
      position: number;
      totalAngle: number;
      direction: 'Left' | 'Right';
      avgRadius: number;
    },
    points: RoutePoint[]
  ): PaceNote | null {
    const segmentPoints = points.slice(corner.startIdx, corner.endIdx + 1);
    
    if (segmentPoints.length < 3) return null;
    
    console.log(`Analyzing corner at ${this.roundDistance(corner.position)}m: radius ${corner.avgRadius.toFixed(1)}m, angle ${corner.totalAngle.toFixed(1)}°`);
    
    // Analyze radius changes (tightens/widens) FIRST
    const radiusChange = this.analyzeRadiusChangeInCorner(segmentPoints);
    
    // Determine severity - if there's a radius change, use the ENTRY severity, otherwise use average
    let entryRadius = corner.avgRadius;
    if (radiusChange) {
      // If tightening, entry is looser (larger radius)
      // If widening, entry is tighter (smaller radius)
      if (radiusChange.type === 'tightens') {
        // Corner gets tighter, so entry is the starting (larger) radius
        entryRadius = radiusChange.entryRadius;
      } else {
        // Corner gets wider, so entry is the starting (smaller) radius
        entryRadius = radiusChange.entryRadius;
      }
    }
    
    const { severity, turnType } = this.determineSeverityAndType(entryRadius, corner.totalAngle);
    
    // Determine length modifier
    const lengthModifier = this.getLengthModifier(corner.totalAngle);
    
    // Detect elevation hazards
    const elevationHazards = this.detectElevationHazards(segmentPoints);
    
    // Build modifiers array
    const modifiers: Array<string | { type: string; to?: number }> = [];
    if (lengthModifier) {
      modifiers.push(lengthModifier);
    }
    if (radiusChange) {
      // Only add radius change if the target severity is different from entry severity
      const currentSeverity = typeof severity === 'number' ? severity : this.severityStringToNumber(severity);
      if (radiusChange.toSeverity !== currentSeverity) {
        modifiers.push(radiusChange.type);
        modifiers.push({ type: 'to', to: radiusChange.toSeverity });
      }
    }
    
    // Create the pace note with rounded position
    const note: PaceNote = {
      position: this.roundDistance(corner.position),
      distance: this.roundDistance(corner.position), // Legacy
      type: turnType === 'Turn' ? 'Turn' : 'SpecialTurn',
      direction: corner.direction,
      severity: severity,
      turnNumber: typeof severity === 'number' ? severity : this.severityStringToNumber(severity), // Legacy
      modifiers: modifiers,
      hazards: elevationHazards,
      advice: this.generateAdvice(severity, corner.avgRadius, elevationHazards),
      surface: 'asphalt',
      lengthModifier: lengthModifier, // Legacy
      radiusChange: radiusChange, // Legacy
      elevation: elevationHazards.length > 0 ? elevationHazards[0] as ('Crest' | 'Dip' | 'Jump') : undefined // Legacy
    };
    
    return note;
  }

  /**
   * Round distance to nearest 10m for human readability
   */
  private static roundDistance(distance: number): number {
    return Math.round(distance / 10) * 10;
  }

  /**
   * Calculate cumulative distances for route points
   */
  private static calculateRoutePointDistances(points: RoutePoint[]): void {
    let cumulativeDistance = 0;
    points[0].distance = 0;
    
    for (let i = 1; i < points.length; i++) {
      const prevPoint = points[i - 1];
      const currentPoint = points[i];
      
      const segmentDistance = turf.distance(
        [prevPoint.lng, prevPoint.lat],
        [currentPoint.lng, currentPoint.lat],
        { units: 'meters' }
      );
      
      cumulativeDistance += segmentDistance;
      currentPoint.distance = cumulativeDistance;
    }
  }

  /**
   * Interpolate route points to consistent 3m spacing
   */
  private static interpolatePoints(points: RoutePoint[]): RoutePoint[] {
    const interpolated: RoutePoint[] = [];
    let cumulativeDistance = 0;

    for (let i = 0; i < points.length - 1; i++) {
      const currentPoint = points[i];
      const nextPoint = points[i + 1];
      
      // Add current point
      interpolated.push({
        ...currentPoint,
        distance: cumulativeDistance
      });

      const segmentDistance = turf.distance(
        [currentPoint.lng, currentPoint.lat],
        [nextPoint.lng, nextPoint.lat],
        { units: 'meters' }
      );

      // Add interpolated points every 3m
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

      cumulativeDistance += segmentDistance - (numSegments * this.INTERPOLATION_DISTANCE);
    }

    // Add final point
    const lastPoint = points[points.length - 1];
    const lastDistance = interpolated.length > 0 ? 
      interpolated[interpolated.length - 1].distance || 0 : 0;
    
    interpolated.push({
      ...lastPoint,
      distance: lastDistance
    });

    return interpolated;
  }

  /**
   * Linear interpolation between two points
   */
  private static interpolatePoint(point1: RoutePoint, point2: RoutePoint, ratio: number): RoutePoint {
    return {
      lat: point1.lat + (point2.lat - point1.lat) * ratio,
      lng: point1.lng + (point2.lng - point1.lng) * ratio,
      elevation: (point1.elevation || 0) + ((point2.elevation || 0) - (point1.elevation || 0)) * ratio
    };
  }

  /**
   * Determine severity and turn type from radius and angle
   */
  private static determineSeverityAndType(
    radius: number,
    totalAngle: number
  ): { severity: number | string; turnType: 'Turn' | 'SpecialTurn' } {
    // Check for special turn types - angle is more important than radius for these
    // Square turn: ~90° angle (prioritize angle over radius)
    if (totalAngle >= 75 && totalAngle <= 105 && radius < 70) {
      return { severity: 'Square', turnType: 'SpecialTurn' };
    }
    
    // Hairpin: very tight U-turn
    if (totalAngle >= 150 && totalAngle <= 180 && radius < 40) {
      return { severity: 'Hairpin', turnType: 'SpecialTurn' };
    }
    
    // Acute: sharp angle
    if (totalAngle < 60 && totalAngle > 25 && radius < 50) {
      return { severity: 'Acute', turnType: 'SpecialTurn' };
    }
    
    // Map radius to McRae 1-6 scale
    if (radius < this.SEVERITY_THRESHOLDS[1]) return { severity: 1, turnType: 'Turn' };
    if (radius < this.SEVERITY_THRESHOLDS[2]) return { severity: 2, turnType: 'Turn' };
    if (radius < this.SEVERITY_THRESHOLDS[3]) return { severity: 3, turnType: 'Turn' };
    if (radius < this.SEVERITY_THRESHOLDS[4]) return { severity: 4, turnType: 'Turn' };
    if (radius < this.SEVERITY_THRESHOLDS[5]) return { severity: 5, turnType: 'Turn' };
    return { severity: 6, turnType: 'Turn' };
  }

  /**
   * Analyze radius changes within a corner (tightens/widens)
   */
  private static analyzeRadiusChangeInCorner(points: RoutePoint[]): {
    type: 'tightens' | 'widens';
    toSeverity: number;
    entryRadius: number;
  } | undefined {
    if (points.length < 9) return undefined;
    
    // SAFETY CHECK: Ensure direction is consistent throughout corner
    // If direction changes, this is TWO corners, not one that tightens/widens
    const startIdx = 0;
    const midStartIdx = Math.min(3, points.length - 1);
    const midEndIdx = Math.max(0, points.length - 4);
    const endIdx = points.length - 1;
    
    const startBearing = turf.bearing(
      [points[startIdx].lng, points[startIdx].lat],
      [points[midStartIdx].lng, points[midStartIdx].lat]
    );
    const endBearing = turf.bearing(
      [points[midEndIdx].lng, points[midEndIdx].lat],
      [points[endIdx].lng, points[endIdx].lat]
    );
    
    // Calculate the overall direction of the segment
    const overallBearing = turf.bearing(
      [points[startIdx].lng, points[startIdx].lat],
      [points[endIdx].lng, points[endIdx].lat]
    );
    
    const startTurnDirection = this.normalizeBearing(startBearing - overallBearing);
    const endTurnDirection = this.normalizeBearing(endBearing - overallBearing);
    
    const startDirection = startTurnDirection < 0 ? 'Left' : 'Right';
    const endDirection = endTurnDirection < 0 ? 'Left' : 'Right';
    
    // If direction flips, DO NOT report radius change - these are separate corners!
    if (startDirection !== endDirection && Math.abs(startTurnDirection) > 5 && Math.abs(endTurnDirection) > 5) {
      console.log(`  ⚠️ Direction inconsistent in segment: ${startDirection} → ${endDirection}, skipping radius change`);
      return undefined;
    }
    
    // Calculate radius at multiple points
    const radii: number[] = [];
    for (let i = 2; i < points.length - 2; i += 2) {
      const radius = this.calculateCircumradius(points[i - 2], points[i], points[i + 2]);
      if (radius && radius > 0 && radius < 1000) {
        radii.push(radius);
      }
    }
    
    if (radii.length < 3) return undefined;
    
    // Split into thirds
    const thirdSize = Math.floor(radii.length / 3);
    const firstThird = radii.slice(0, thirdSize);
    const lastThird = radii.slice(-thirdSize);
    
    const firstAvg = firstThird.reduce((sum, r) => sum + r, 0) / firstThird.length;
    const lastAvg = lastThird.reduce((sum, r) => sum + r, 0) / lastThird.length;
    
    const change = (lastAvg - firstAvg) / firstAvg;
    
    // Tightens: radius decreases by >20%
    if (change < -0.2) {
      return {
        type: 'tightens',
        toSeverity: this.mapRadiusToMcRae(lastAvg),
        entryRadius: firstAvg // Entry is the larger (looser) radius
      };
    }
    
    // Widens: radius increases by >20%
    if (change > 0.2) {
      return {
        type: 'widens',
        toSeverity: this.mapRadiusToMcRae(lastAvg),
        entryRadius: firstAvg // Entry is the smaller (tighter) radius
      };
    }
    
    return undefined;
  }

  /**
   * Detect elevation-based hazards
   */
  private static detectElevationHazards(points: RoutePoint[]): string[] {
    const hazards: string[] = [];
    
    if (points.length < 3) return hazards;
    
    const elevations = points.map(p => p.elevation || 0);
    const segmentLength = points.length * this.INTERPOLATION_DISTANCE;
    
    const startElev = elevations[0];
    const endElev = elevations[elevations.length - 1];
    const maxElev = Math.max(...elevations);
    const minElev = Math.min(...elevations);
    const elevChange = endElev - startElev;
    const elevRange = maxElev - minElev;
    
    // Normalize to per-100m
    const normalizedChange = (elevChange / segmentLength) * 100;
    
    // Jump: significant elevation variation over short distance
    if (elevRange > this.JUMP_THRESHOLD && segmentLength < 50) {
      hazards.push('Jump');
      return hazards;
    }
    
    // Crest: significant upward then downward
    const midIdx = Math.floor(elevations.length / 2);
    const firstHalfChange = elevations[midIdx] - elevations[0];
    const secondHalfChange = elevations[elevations.length - 1] - elevations[midIdx];
    
    if (firstHalfChange > 3 && secondHalfChange < -3) {
      hazards.push('Crest');
    } else if (normalizedChange > this.CREST_THRESHOLD) {
      hazards.push('Crest');
    } else if (normalizedChange < -this.DIP_THRESHOLD) {
      hazards.push('Dip');
    }
    
    return hazards;
  }

  /**
   * Generate advice based on corner characteristics
   */
  private static generateAdvice(
    severity: number | string,
    radius: number,
    hazards: string[]
  ): string[] {
    const advice: string[] = [];
    
    // Caution for tight corners
    if ((typeof severity === 'number' && severity <= 2) || severity === 'Hairpin') {
      advice.push('Caution');
    }
    
    // Additional caution for hazards
    if (hazards.includes('Jump')) {
      advice.push('Heavy Braking');
    } else if (hazards.includes('Crest')) {
      advice.push('Blind');
    }
    
    return advice;
  }

  /**
   * Calculate circumradius of a triangle formed by three points
   */
  private static calculateCircumradius(p1: RoutePoint, p2: RoutePoint, p3: RoutePoint): number | null {
    const a = turf.distance([p1.lng, p1.lat], [p2.lng, p2.lat], { units: 'meters' });
    const b = turf.distance([p2.lng, p2.lat], [p3.lng, p3.lat], { units: 'meters' });
    const c = turf.distance([p3.lng, p3.lat], [p1.lng, p1.lat], { units: 'meters' });

    const s = (a + b + c) / 2;
    const area = Math.sqrt(s * (s - a) * (s - b) * (s - c));

    if (area === 0 || isNaN(area)) return null;

    return (a * b * c) / (4 * area);
  }

  /**
   * Map radius to McRae 1-6 scale
   */
  private static mapRadiusToMcRae(radius: number): number {
    if (radius < this.SEVERITY_THRESHOLDS[1]) return 1;
    if (radius < this.SEVERITY_THRESHOLDS[2]) return 2;
    if (radius < this.SEVERITY_THRESHOLDS[3]) return 3;
    if (radius < this.SEVERITY_THRESHOLDS[4]) return 4;
    if (radius < this.SEVERITY_THRESHOLDS[5]) return 5;
    return 6;
  }

  /**
   * Determine length modifier based on total angle
   * Only use for EXTREME cases - most corners should be called without modifiers
   */
  private static getLengthModifier(totalAngle: number): 'Long' | 'Short' | undefined {
    if (totalAngle > 110) return 'Long'; // Very long sustained curves
    if (totalAngle < 35) return 'Short'; // Very quick flicks
    return undefined; // Most corners are regular - no modifier
  }

  /**
   * Normalize bearing to -180 to 180 range
   */
  private static normalizeBearing(bearing: number): number {
    while (bearing > 180) bearing -= 360;
    while (bearing < -180) bearing += 360;
    return bearing;
  }

  /**
   * Create start note
   */
  private static createStartNote(): PaceNote {
    return {
      position: 0,
      distance: 0,
      type: 'Straight',
      direction: null,
      severity: 6,
      turnNumber: 6,
      modifiers: [],
      hazards: [],
      advice: [],
      surface: 'asphalt'
    };
  }

  /**
   * Create finish note at the end of the route
   */
  private static createFinishNote(totalDistance: number): PaceNote {
    return {
      position: totalDistance,
      distance: totalDistance,
      type: 'Advice',
      direction: null,
      severity: 'FINISH',
      turnNumber: 0,
      modifiers: [],
      hazards: [],
      advice: ['Over Finish'],
      surface: 'asphalt',
      distanceToNext: null
    };
  }

  /**
   * Calculate distances to next notes
   */
  private static calculateDistancesToNext(notes: PaceNote[]): void {
    for (let i = 0; i < notes.length - 1; i++) {
      notes[i].distanceToNext = notes[i + 1].position - notes[i].position;
    }
    if (notes.length > 0) {
      notes[notes.length - 1].distanceToNext = null;
    }
  }

  /**
   * Convert severity string to number for legacy support
   */
  private static severityStringToNumber(severity: string): number {
    switch (severity) {
      case 'Hairpin': return 1;
      case 'Square': return 2;
      case 'Acute': return 2;
      default: return 3;
    }
  }
}