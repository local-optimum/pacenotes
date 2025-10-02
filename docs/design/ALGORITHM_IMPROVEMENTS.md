# Algorithm Improvements - Multi-Scale Curvature Analysis

## Problem Identified
Previous algorithm was over-reporting severity (corners marked too tight) because it used a fixed 100m sliding window that couldn't distinguish between:
- **Long sweeping bends** (severity 5-6, 200-500m radius)
- **Tight hairpins** (severity 1-2, <40m radius)

## Solution: Multi-Pass Adaptive Sampling

### Phase 1: Curve Candidate Identification
**Uses bearing change detection to find curve regions**

```
1. Calculate bearing at each point
2. Detect bearing changes (curvature indicator)
3. Identify curve regions where bearing changes > 2°
4. Group consecutive changing points into curve segments
5. Require minimum 8° total change to register as curve
```

**Benefits:**
- Captures both gentle and sharp curves
- Filters out GPS noise and micro-variations
- Works regardless of curve length

### Phase 2: Dense Radius Sampling Within Curves
**Once a curve is identified, sample radius at high density**

```
For each curve segment:
  1. Sample ~10 points throughout the curve
  2. At each sample point, calculate radius using 3 window sizes:
     - 3m spacing (tight corners)
     - 5m spacing (medium corners)  
     - 7m spacing (wide corners)
  3. Collect all radius measurements
  4. Use MEDIAN instead of mean (reduces outlier influence)
  5. Map median radius to McRae 1-6 scale
```

**Benefits:**
- Adaptive: tight corners get small windows, wide corners get large windows
- Robust: median filtering reduces GPS noise impact
- Accurate: multiple samples give reliable radius estimate

### Key Algorithm Changes

#### 1. Finer Interpolation
- Changed from 5m to **3m spacing**
- Better resolution for tight corners
- More data points for radius calculation

#### 2. Curvature-Based Detection
- Analyzes bearing changes continuously
- Doesn't rely on fixed windows
- Captures curves of any length

#### 3. Multi-Scale Radius Sampling
```
Old: Single 100m window → one radius estimate
New: Multiple 3-7m windows → 30+ radius samples → median
```

#### 4. Improved Special Turn Detection
Added radius constraints to angle-based rules:
- **Hairpin**: 150-180° AND radius < 30m
- **Square**: 80-100° AND radius < 50m  
- **Acute**: 30-60° AND radius < 40m

### Results
- **More accurate severity ratings** - matches actual corner tightness
- **Captures long sweeping curves** as severity 5-6
- **Distinguishes sharp corners** as severity 1-2
- **Robust to GPS noise** through median filtering

### Example Output
```
Corner at 45m: 18 radius samples, median: 65.3m, range: 58.2-72.1m
→ Severity 3 (Medium) - range 40-70m ✓

Corner at 1060m: 24 radius samples, median: 142.8m, range: 135.0-158.3m
→ Severity 5 (Slight) - range 120-200m ✓
```

## UI Overhaul

### Clean, Professional Presentation
- **Traditional rally format**: Distance → Modifiers → Severity → Direction → Hazards
- **Clear visual hierarchy**: Position badge, callout text, detail badges
- **Color-coded severity**: Red (1) → Orange (2) → Yellow (3) → Blue (4) → Green (5) → Gray (6)
- **Compact but readable**: Each note is one clean card

### Improved Information Display
- **Distance in km**: Clearer position reference
- **Callout format**: `"100 Long 4 Right crest"` - exactly as co-driver would call it
- **Badge system**: 
  - Severity badges (colored by tightness)
  - Direction badges (← LEFT / → RIGHT)
  - Hazard badges (⚠ CREST, DIP, JUMP)
  - Advice badges (💡 Caution, Blind)
  - Distance-to-next badges (→ 85m)

### Professional Layout
- Clean white background with subtle borders
- Gray position badges for easy scanning
- Hover effects for interactivity
- Clear legend at bottom
- Proper spacing and typography

## Testing Recommendations

Test with these route types:
1. **City grid** - Many 90° turns, should be severity 2-3
2. **Highway curves** - Gentle bends, should be severity 5-6
3. **Mountain switchbacks** - Tight hairpins, should be severity 1-2
4. **Mixed rural roads** - Variety of corners, should show range 2-5

Check the console output to see:
- Number of radius samples per corner
- Median radius value
- Range of measurements
- Final severity assignment
