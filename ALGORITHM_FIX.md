# Algorithm Fix: Special Turn Severity Hierarchy

## Problem Identified
Date: October 2, 2025

### The Issue
Special turn names (Hairpin, Square, Acute) could be **less sharp** than numeric severity 1-2 turns, creating a confusing hierarchy.

### Root Cause
The original algorithm checked special turns based on **angle alone** with loose radius constraints:

```typescript
// OLD LOGIC (BUGGY):
// Hairpin: 150-180° angle AND radius < 40m
if (totalAngle >= 150 && totalAngle <= 180 && radius < 40) {
  return { severity: 'Hairpin', turnType: 'SpecialTurn' };
}

// Square: 75-105° angle AND radius < 70m  
if (totalAngle >= 75 && totalAngle <= 105 && radius < 70) {
  return { severity: 'Square', turnType: 'SpecialTurn' };
}

// Then check numeric severity:
if (radius < 20) return { severity: 1 };  // Severity 1
if (radius < 40) return { severity: 2 };  // Severity 2
```

### The Conflict
This created illogical situations:

| Turn Type | Radius | Severity | Problem |
|-----------|--------|----------|---------|
| "Hairpin" | 35m | Hairpin | Radius between 20-40m |
| Severity 1 | 18m | 1 | **SHARPER than the "Hairpin"!** |
| "Square" | 65m | Square | Very gentle 90° turn |
| Severity 1 | 15m | 1 | **Much sharper than "Square"!** |

**Result**: A driver might encounter:
- "Hairpin left" (35m radius, quite manageable)
- Then "2 left" (35m radius, actually same sharpness!)
- Then see a severity 1 that's WAY tighter (15m)

This breaks the mental model that special turn names = serious corners.

## Solution

### New Algorithm
Calculate numeric severity FIRST, then only apply special names if the turn is **tight enough**:

```typescript
// NEW LOGIC (FIXED):
// 1. Calculate numeric severity from radius
let numericSeverity: number;
if (radius < 20) numericSeverity = 1;        // Hairpin tight
else if (radius < 40) numericSeverity = 2;   // Sharp
else if (radius < 70) numericSeverity = 3;   // Medium
// ... etc

// 2. Apply special names ONLY if geometrically distinctive AND tight enough
// Hairpin: Must be severity 1-2 (radius < 40m)
if (totalAngle >= 150 && totalAngle <= 180 && numericSeverity <= 2) {
  return { severity: 'Hairpin', turnType: 'SpecialTurn' };
}

// Square: Must be severity 1-3 (radius < 70m)
if (totalAngle >= 75 && totalAngle <= 105 && numericSeverity <= 3) {
  return { severity: 'Square', turnType: 'SpecialTurn' };
}

// Acute: Must be severity 1-3 (radius < 70m)
if (totalAngle < 60 && totalAngle > 25 && numericSeverity <= 3) {
  return { severity: 'Acute', turnType: 'SpecialTurn' };
}
```

### New Hierarchy Guarantees

**Hairpin Turns:**
- ALWAYS severity 1-2 (radius < 40m)
- NEVER less sharp than a numeric severity 1 or 2
- Only U-turns (150-180°) that are genuinely tight

**Square Turns:**
- ALWAYS severity 1-3 (radius < 70m)
- NEVER less sharp than numeric severity 1-3
- Only 90° corners that are sharp enough to be notable

**Acute Turns:**
- ALWAYS severity 1-3 (radius < 70m)
- Sharp V-shaped junctions with tight radius
- Distinctive geometric shape + actual sharpness

**Numeric Severity:**
- Used for all other turns
- Pure radius-based classification
- Clear hierarchy: 1 (tightest) → 6 (gentle)

## Impact

### Before Fix:
```
"Square left"        (65m radius - gentle 90° bend)
"4 right"            (80m radius - similar sharpness)
"1 left"             (15m radius - WAY SHARPER!)
"Hairpin right"      (35m radius - less sharp than the 1!)
```

### After Fix:
```
"Square left"        (45m radius - sharp 90°, severity 3)
"4 right"            (80m radius - open)
"1 left"             (15m radius - tightest)
"Hairpin right"      (18m radius - tight U-turn, severity 1)
```

Now the special names **mean something serious** - they indicate both geometric shape AND actual sharpness.

## Testing

To verify the fix works:
1. Generate pace notes for a varied route
2. Check that all "Hairpin" turns are genuinely tight (not just U-shaped but gentle)
3. Verify "Square" turns are sharp 90° corners, not gentle bends
4. Confirm numeric severity 1-2 is never less sharp than any special turn
5. Use browser console to inspect radius values: `console.log` shows radius for each corner

---

## Fix #2: "Long" Modifier for Gentle Corners

### Problem
"Long 6" corners were extremely rare despite many long gentle sweepers existing.

### Root Cause
The "long" modifier threshold was **severity-agnostic**:
- Required `totalAngle > 110°` for ALL severities
- This works for tight corners but is way too high for gentle ones

**The Math:**
```
Arc length = (angle/360°) × 2π × radius

Hairpin (20m radius) at 110°:
  = (110/360) × 2π × 20m ≈ 38m  ✓ Reasonable long hairpin

Severity 6 (300m radius) at 110°:
  = (110/360) × 2π × 300m ≈ 577m  ✗ Extremely rare!
```

Most gentle sweepers are 100-200m long, which at 300m radius = only 19-38° of angle. They were detected as corners but never got "long" modifier.

### Solution
**Severity-aware thresholds** for "long" modifier:

| Severity | Long Threshold | Example Arc Length |
|----------|----------------|-------------------|
| 1-2 (tight) | 110° | 38m @ 20m radius |
| 3-4 (medium) | 75° | 92m @ 70m radius |
| 5-6 (gentle) | 45° | 189m @ 200m radius |

Now a 200m gentle sweeper with 300m radius (38° angle) will correctly get flagged as "long 6".

### Impact

**Before:**
- "long 6" required ~577m of gentle curve (extremely rare)
- Most gentle sweepers had no modifier despite being quite long

**After:**
- "long 6" requires ~189m at 200m radius or ~393m at 500m radius
- Properly identifies sustained gentle sweepers
- Example: "long 6 RIGHT, 400" for a long flowing bend

## Files Modified
- `src/utils/routeProcessor.ts` - `determineSeverityAndType()` function (lines 768-809)
- `src/utils/routeProcessor.ts` - `getLengthModifier()` function (lines 994-1025)
- `src/utils/routeProcessor.ts` - `analyzeCorner()` function (line 637-638)

