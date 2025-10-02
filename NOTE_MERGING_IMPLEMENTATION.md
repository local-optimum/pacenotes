# Note Merging Implementation Summary

## Feature Overview
Automatically merges close corners into compound pace notes for better flow and authenticity, matching real rally co-driving style.

## Implementation Details

### Merging Rules (As Specified)
1. **Distance**: < 40m apart
2. **Severity**: Neither can be severity 1, max difference of 3
3. **Hazards**: Included in merged notes (not excluded)
4. **Format**: Uses "into" connector
5. **Chain length**: Max 2 notes

### Examples

**Before Merging:**
```
500m: 4 LEFT, 20
520m: 6 RIGHT, 150
```

**After Merging:**
```
500m: 4 LEFT into 6 RIGHT, 150
```
(Distance is to the 3rd note, 150m after the 520m position)

**With Hazards:**
```
4 LEFT over crest into 6 RIGHT, 80
```

**Street Circuit Style:**
```
Square RIGHT into 4 LEFT, 60
```

### Algorithm Flow

1. **Detection** (`RouteProcessor.shouldMergeNotes`):
   - Check distance < 40m
   - Check severity constraints
   - Check both have directions
   - Don't merge START or FINISH

2. **Merging** (`RouteProcessor.createMergedNote`):
   - Combine modifiers and hazards from both notes
   - Create compound severity string ("4 into 6")
   - Store second note info in `_secondNote` for formatting
   - Use first note's position

3. **Formatting** (`ProgressiveNotesPanel.formatMergedCallout`):
   - Format first note with modifiers, severity, direction
   - Add hazards with prepositions
   - Add "into" connector
   - Format second note with its severity and direction
   - Append distance to next (3rd) note

### Data Structure

Merged notes have a special structure:
```typescript
{
  position: 500,  // First note's position
  severity: "4 into 6",  // Compound string
  direction: "Left",  // First note's direction
  modifiers: [...],  // First note's modifiers
  hazards: [...],  // Combined hazards from both
  _secondNote: {  // Second note stored for formatting
    severity: 6,
    direction: "Right",
    modifiers: [...]
  }
}
```

### Processing Pipeline

```
1. Generate individual pace notes for each corner
2. Add START note (with turn info if applicable)
3. Add FINISH note
4. Merge close notes (new step!)
5. Calculate distanceToNext (now points to correct notes)
6. Return merged notes array
```

### Will Merge:
- ✅ "4 LEFT" + "6 RIGHT" (20m apart) → "4 LEFT into 6 RIGHT"
- ✅ "3 RIGHT over crest" + "5 LEFT" → "3 RIGHT over crest into 5 LEFT"
- ✅ "Square RIGHT" + "4 LEFT" → "Square RIGHT into 4 LEFT"

### Won't Merge:
- ❌ "HAIRPIN LEFT" + "3 RIGHT" (severity 1 never merges)
- ❌ "2 LEFT" + "6 RIGHT" (severity difference = 4, too different)
- ❌ "3 LEFT" + "4 RIGHT" (100m apart, too far)
- ❌ START or FINISH notes

## Console Output

When merging occurs, console shows:
```
Generated 25 pace notes (28 before merging, including START and FINISH)
```

This indicates 3 pairs of notes were merged.

## Testing

To test the feature:
1. Find a route with chicanes or quick corner sequences
2. Generate pace notes
3. Look for "into" in the callouts
4. Verify merged notes show correct severity transitions
5. Check distance points to the 3rd note (not the merged 2nd)
6. Console will show before/after merge count

## Future Enhancements

Potential improvements:
- Support 3-note chains for triple chicanes
- Add special "chicane" keyword for alternating L-R patterns
- Configurable distance threshold
- UI indicator showing which notes are merged

## Files Modified
- `src/utils/routeProcessor.ts` - Core merging logic
- `src/components/ProgressiveNotesPanel.tsx` - Merged note formatting
- `CHANGELOG.md` - Feature documentation
- `NOTE_MERGING_PROPOSAL.md` - Original design spec
- `NOTE_MERGING_IMPLEMENTATION.md` - This file

