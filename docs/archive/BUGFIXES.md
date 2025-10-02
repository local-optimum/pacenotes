# Bug Fixes & Enhancements - October 2, 2025

## Bug #1: Distance to Next Positioned Incorrectly
**Status**: Fixed ✓

### Problem
In the pace notes UI, the distance to the next note was displayed at the **start** of the pace note callout instead of at the **end**. This didn't follow traditional rally pace note format where distances are called last (e.g., "right 4 opens, 150" where 150m is the distance to the next instruction).

### Root Cause
In `src/components/ProgressiveNotesPanel.tsx`, the `formatCallout` function was:
1. Extracting `distanceToNext` as a separate value
2. Rendering it before the main callout text (lines 255-257)

### Solution
- Refactored `formatCallout` to return a single string instead of `{ distance, main }`
- Moved distance calculation to the end of the parts array (after hazards)
- Distance is now appended as the last element in the callout, following rally convention

### Files Changed
- `src/components/ProgressiveNotesPanel.tsx` (lines 108-172, 249-251)

---

## Bug #2: Map Zooms to Start Point for Some Notes
**Status**: Fixed ✓

### Problem
When clicking on certain pace notes, the map would zoom to the **start point of the stage** instead of the correct marker location. Most notes worked correctly, making it unclear why specific markers exhibited this behavior.

### Root Cause
In `src/components/InteractiveMapViewer.tsx`, the code used **two different methods** to find route points for pace notes:

1. **Marker placement** (lines 281-292): Used iteration to find the **absolute closest** route point - worked reliably
2. **Map zooming** (lines 360-363): Used `.find()` with a **strict 10-meter threshold** and defaulted to `route.points[0]` (start point) if no match found - caused the bug

When a pace note's position didn't match any route point within 10 meters (due to interpolation differences or rounding), the fallback `|| route.points[0]` kicked in, causing the map to zoom to the start.

### Solution
Replaced the `.find()` approach with the same "find absolute closest point" logic used for marker placement:

```typescript
// OLD (buggy):
const routePoint = route.points.find(p => 
  Math.abs((p.distance || 0) - note.position) < 10
) || route.points[0];  // BUG: Falls back to start!

// NEW (fixed):
let closestPoint = route.points[0];
let minDistDiff = Math.abs((route.points[0].distance || 0) - noteDistance);
for (const point of route.points) {
  const distDiff = Math.abs((point.distance || 0) - noteDistance);
  if (distDiff < minDistDiff) {
    minDistDiff = distDiff;
    closestPoint = point;
  }
}
```

This ensures the map always zooms to the correct location by finding the genuinely closest route point, regardless of how far away it is.

### Files Changed
- `src/components/InteractiveMapViewer.tsx` (lines 354-399)

---

## Bug #3: Distance Rounding & Pace Note Formatting
**Status**: Fixed ✓

### Problem
Two related issues affecting pace note authenticity:
1. **Distance not rounded to nearest 10m**: Distances showed exact values (e.g., "147m") instead of rally-standard 10m increments
2. **Lack of lyricism**: Pace notes didn't flow naturally when read aloud, missing the rhythm and cadence of real rally co-driving

### Root Cause
1. Distance formatting used `Math.round(note.distanceToNext)` which rounded to 1m precision
2. Hazards were bare words ("crest", "jump") instead of evocative phrases ("over crest", "over jump")
3. Radius changes included unnecessary word "to" ("tightens to 3" instead of "tightens 3")
4. No separation between main callout and distance (everything ran together)

### Solution
**Distance Rounding:**
```typescript
// OLD: Math.round(note.distanceToNext)
// NEW: Math.round(note.distanceToNext / 10) * 10
```
This ensures all distances are multiples of 10 (e.g., 150, 80, 200).

**Lyrical Formatting:**
- Added comma before distance for clear separation: `"4 RIGHT over crest, 150"`
- Hazards now use prepositions:
  - "crest" → "over crest"
  - "jump" → "over jump"
  - "dip" → "into dip"
- Radius changes drop "to": "tightens 3" not "tightens to 3"
- Direction and severity are UPPERCASE for emphasis: "4 RIGHT" not "4 right"
- Modifiers remain lowercase for natural rhythm: "long 4 RIGHT"

**Example transformations:**
```
BEFORE: "long 4 right crest tightens to 3 147"
AFTER:  "long 4 RIGHT over crest tightens 3, 150"

BEFORE: "hairpin left jump 83"
AFTER:  "HAIRPIN LEFT over jump, 80"
```

### Files Changed
- `src/components/ProgressiveNotesPanel.tsx` (lines 108-196, 293-295)

---

## Testing Recommendations

### Bug #1 - Distance to Next
**Manual Test:**
1. Generate pace notes for any route
2. Verify that the distance appears at the **end** of each callout (e.g., "long 4 right 150" not "150 long 4 right")
3. Check the yellow callout text displays in the correct rally format

### Bug #2 - Map Zoom
**Manual Test:**
1. Generate pace notes for a route
2. Click on multiple different pace notes throughout the route
3. Verify the map zooms to the correct marker for each note
4. Pay special attention to notes in the middle of long straight sections where interpolation might create larger gaps
5. Confirm no notes cause the map to zoom back to the start point

### Bug #3 - Distance Rounding & Lyricism
**Manual Test:**
1. Generate pace notes for any route
2. Check all distances are multiples of 10 (80, 150, 200, not 83, 147, 203)
3. Read pace notes aloud - they should flow naturally with rhythm
4. Verify hazards use prepositions: "over crest", "over jump", "into dip"
5. Verify radius changes are concise: "tightens 3" not "tightens to 3"
6. Verify capitalization: "long 4 RIGHT" with uppercase direction/severity
7. Verify comma separation: "4 RIGHT over crest, 150"

**Audio Test:**
Try reading several notes quickly in sequence - they should have a natural cadence like:
- "long 4 RIGHT over crest, 150"
- "6 LEFT tightens 3, 80"
- "HAIRPIN RIGHT don't cut, 40"

### Automated Testing
Consider adding unit tests for:
- `formatCallout()` function to verify:
  - Distance is last element and rounded to nearest 10m
  - Hazards include proper prepositions
  - Radius changes omit "to"
  - Capitalization is correct
- Route point matching algorithm to ensure it always finds a valid point (never undefined)

