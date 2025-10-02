# Pace Note Merging Proposal

## Concept
Merge very close corners into compound notes for better flow and realism.

## Example
Instead of:
```
500m: 4 LEFT, 20
520m: 6 RIGHT, 150
```

Say:
```
500m: 4 LEFT into 6 RIGHT, 150
```

(Distance is to the THIRD note, not the second merged note)

## Implementation Questions

### 1. Distance Threshold
**When are two notes "close enough" to merge?**

Options:
- **< 30m apart**: Very aggressive, merges chicanes and quick sequences
- **< 50m apart**: Moderate, catches most quick combinations
- **< 70m apart**: Looser, but might merge unrelated corners

**Recommendation**: Start with **< 40m** - catches genuine quick sequences without over-merging

### 2. Severity Rules
**Should all combinations merge, or only specific patterns?**

Options:
- **Any + Any**: Merge everything close (simple but might be confusing)
- **Tight → Gentle only**: e.g., "2 LEFT into 5 RIGHT" (makes sense - decelerate then accelerate)
- **Similar severity**: Only merge if severity difference ≤ 2 (keeps driver expectations consistent)
- **Never merge severity 1-2**: Hairpins/sharp corners always get their own callout (safety)

**Recommendation**: 
- Merge if severity difference ≤ 3 AND neither is severity 1
- This allows "3 LEFT into 6 RIGHT" but not "HAIRPIN LEFT into 4 RIGHT" (hairpin needs full attention)

### 3. Hazard Handling
**What if the first or second note has hazards?**

Options:
- **Never merge if hazards present**: Keep hazards prominent
- **Merge but include hazards**: e.g., "4 LEFT over crest into 6 RIGHT, 150"

**Recommendation**: **Never merge if either note has hazards** - safety critical information shouldn't be buried

### 4. Limit Chain Length
**Should we merge more than 2 notes? (e.g., chicanes with 3+ turns)**

Options:
- **Max 2 notes**: Simple, clear
- **Max 3 notes**: Could handle triple chicanes: "4 LEFT into 5 RIGHT into 4 LEFT, 100"

**Recommendation**: **Start with max 2** - keeps it simple and readable

### 5. Direction Patterns
**Any special handling for alternating directions?**

Ideas:
- Label obvious chicanes: "chicane 4 LEFT-RIGHT, 100"?
- Or just use "into": "4 LEFT into 4 RIGHT, 100"

**Recommendation**: Use "into" for simplicity - direction is already clear

## Proposed Rules (Conservative Start)

```typescript
shouldMergeNotes(note1: PaceNote, note2: PaceNote): boolean {
  // 1. Must be close (< 40m apart)
  if (note2.position - note1.position > 40) return false;
  
  // 2. Neither can be severity 1 (too critical)
  const sev1 = typeof note1.severity === 'number' ? note1.severity : 1;
  const sev2 = typeof note2.severity === 'number' ? note2.severity : 1;
  if (sev1 === 1 || sev2 === 1) return false;
  
  // 3. Severity difference ≤ 3 (not too jarring)
  if (Math.abs(sev1 - sev2) > 3) return false;
  
  // 4. No hazards on either note (keep hazards prominent)
  if (note1.hazards.length > 0 || note2.hazards.length > 0) return false;
  
  // 5. Both must have direction (can't merge straight sections)
  if (!note1.direction || !note2.direction) return false;
  
  return true;
}
```

## Example Results

**Will merge:**
- "4 LEFT into 6 RIGHT, 100" (40m apart, no hazards, good severity transition)
- "3 RIGHT into 5 LEFT, 80" (chicane-like sequence)
- "Square RIGHT into 4 LEFT, 60" (street circuit style)

**Won't merge:**
- "HAIRPIN LEFT, 15" then "3 RIGHT, 100" (severity 1 never merges)
- "4 LEFT over crest, 20" then "5 RIGHT, 100" (has hazard)
- "2 LEFT into 6 RIGHT, 100" (severity difference = 4, too different)
- "3 LEFT, 100" then "4 RIGHT, 200" (100m apart, too far)

## Implementation Location

**Option A**: Post-process in `RouteProcessor` after generating all notes
- Pros: Clean separation, can optimize distance calculations
- Cons: More complex, need to recalculate distanceToNext

**Option B**: Display-time merging in `ProgressiveNotesPanel`
- Pros: Simpler, doesn't affect core algorithm
- Cons: Notes stored separately but displayed merged (confusing?)

**Recommendation**: **Option A** - merge in RouteProcessor so the data model matches what's displayed

## Questions for You

1. **Distance threshold**: 40m okay, or do you want tighter/looser?
2. **Severity rules**: Never merge severity 1? Max difference of 3?
3. **Hazards**: Never merge if hazards present?
4. **Max chain**: 2 notes max, or should we handle 3+ for chicanes?
5. **Should we try this?** Or is it too complex for now?

Let me know your thoughts and I can implement accordingly!

