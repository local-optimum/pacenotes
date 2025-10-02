# Rally Pace Notes Generator - Documentation

This directory contains technical documentation, design decisions, and development history for the Rally Pace Notes Generator project.

## 📁 Directory Structure

### `/design/` - Design Documents & Proposals

High-level design decisions and architectural proposals that shaped the application:

- **[ALGORITHM_IMPROVEMENTS.md](design/ALGORITHM_IMPROVEMENTS.md)** - Evolution of the corner detection algorithm, including multi-window analysis, instant turn detection, and severity-aware thresholds
- **[NOTE_MERGING_PROPOSAL.md](design/NOTE_MERGING_PROPOSAL.md)** - Design proposal for intelligent chicane merging (e.g., "4 LEFT into 6 RIGHT")

### `/archive/` - Development History & Implementation Notes

Historical documentation from the development process:

- **[ALGORITHM_FIX.md](archive/ALGORITHM_FIX.md)** - Documentation of major algorithm fixes and refinements
- **[BUGFIXES.md](archive/BUGFIXES.md)** - Comprehensive list of bugs fixed during development
- **[IMPLEMENTATION_SUMMARY.md](archive/IMPLEMENTATION_SUMMARY.md)** - Technical implementation details and decisions
- **[NOTE_MERGING_IMPLEMENTATION.md](archive/NOTE_MERGING_IMPLEMENTATION.md)** - Implementation details for the chicane merging feature
- **[TEST_ROUTE_PROCESSOR.md](archive/TEST_ROUTE_PROCESSOR.md)** - Testing methodology and route processor validation

## 🎯 Key Design Decisions

### Multi-Window Curvature Analysis
The corner detection algorithm uses multiple window sizes (5m, 10m, 15m, 20m) simultaneously to accurately detect both gradual curves and sharp corners. This approach prevents missing tight apexes while maintaining awareness of the broader corner context.

### McRae 1-6 Severity System
Corner severity is based on actual measured radius, not guesswork:
- **1 (Hairpin)**: <20m radius
- **2 (Sharp)**: 20-40m
- **3 (Medium)**: 40-70m
- **4 (Open)**: 70-120m
- **5 (Slight)**: 120-200m
- **6 (Near-straight)**: 200-500m

### Intelligent Chicane Merging
Two corners within 40m of each other can be merged if:
- Neither is severity 1 (hairpins never merge)
- Severity difference ≤ 3
- Both have direction information
- Creates natural rally callout: "4 LEFT into 6 RIGHT"

### Severity-Aware Length Modifiers
"Long" and "Short" modifiers use different angle thresholds based on corner severity, because:
- A "long" hairpin (110°) is physically short (~38m at 20m radius)
- A "long" severity 6 (110°) would be impossibly long (~577m at 300m radius)

This prevents nonsensical callouts and maintains natural rally rhythm.

## 📝 For Contributors

When adding new features or making significant changes:

1. **Major design changes** → Add proposal to `/design/`
2. **Implementation details** → Document in `/archive/`
3. **User-facing changes** → Update main `README.md` and `CHANGELOG.md`

## 🔗 Related Resources

- **[Main README](../README.md)** - User documentation and getting started guide
- **[CHANGELOG](../CHANGELOG.md)** - Version history and release notes
- **[Source Code](../src/)** - Implementation (`routeProcessor.ts` contains core algorithm)

---

**Built for Rally Enthusiasts, By Rally Enthusiasts** 🏁

