# 🏁 Rally Pace Notes Generator

**Professional rally-style pace notes generated from any GPS route in seconds.**

A modern React web application that transforms real-world routes into rally pace notes using advanced GPS analysis and the McRae 1-6 severity system. Built for rally enthusiasts, co-drivers, and anyone who wants to experience the thrill of stage navigation.

![Rally-themed UI](https://img.shields.io/badge/UI-Rally_Themed-red?style=for-the-badge) ![Real-time Processing](https://img.shields.io/badge/Processing-Client_Side-blue?style=for-the-badge) ![Export Ready](https://img.shields.io/badge/Export-PDF%20%7C%20Text-green?style=for-the-badge)

<img width="1449" height="1217" alt="image" src="https://github.com/user-attachments/assets/c2ab5a12-93d0-4731-893f-85f2186ca158" />


---

## 🚀 Unique Selling Points

### 🎯 **Advanced Corner Detection Algorithm**
Sophisticated multi-window radius analysis doesn't just detect corners—it understands them:
- **Multi-window curvature analysis**: Evaluates corners using 5m, 10m, 15m, and 20m windows simultaneously
- **Instant turn detection**: Catches sharp 90° street corners that traditional algorithms miss
- **Smart turn positioning**: Places markers at the actual turn-in point, not the geometric center
- **Direction consistency checks**: Prevents false corner detection when GPS track zigzags

### 🔗 **Intelligent Chicane Merging**
Automatically detects and merges close sequential corners into rally-standard chicane calls:
- **Automatic detection**: Merges corners <40m apart with compatible severity
- **Professional format**: Generates "4 LEFT into 6 RIGHT" callouts
- **Visual linking**: Yellow dashed lines connect merged corners on the map
- **Chain indicators**: Linked markers show 🔗 badge for instant recognition

### 🗺️ **Interactive Visual Experience**
A map interface designed for rally enthusiasts:
- **Sequential marker animation**: Markers appear progressively every 0.1s along the route
- **Severity-based color coding**: Instant visual identification of corner difficulty
  - Red (Severity 1-2): Hairpins and sharp turns
  - Orange/Yellow (3-4): Medium corners
  - Blue/Green (5-6): Fast sweepers
- **Hazard warnings**: Pulsing markers with ⚠️ badges for crests, jumps, and dips
- **Click-to-highlight**: Click any marker to center and highlight the corresponding pace note
- **Chequered flag finish**: 🏁 emoji marks the end of your stage

### 📍 **Location Search Integration**
No more copying coordinates from Google Maps:
- **GraphHopper geocoding**: Search for locations by name
- **Intelligent suggestions**: Real-time location search as you type
- **One-click selection**: Fly to location and set start/end points instantly

### 📊 **McRae 1-6 Severity System**
Based on actual corner radius measurements, not guesswork:
- **1 - Hairpin**: <20m radius (U-turns, tight switchbacks)
- **2 - Sharp**: 20-40m radius (Tight corners)
- **3 - Medium**: 40-70m radius (Standard corners)
- **4 - Open**: 70-120m radius (Fast corners)
- **5 - Slight**: 120-200m radius (Gentle bends)
- **6 - Near-straight**: 200-500m radius (Very slight curves)

### 🎨 **Smart Modifiers & Hazards**
Context-aware callout enhancements:
- **Length modifiers**: Severity-aware thresholds (a "long" hairpin ≠ "long" sweeper)
- **Radius changes**: "tightens to 2" or "widens to 5" when radius shifts >20%
- **Elevation hazards**: 
  - `Crest` - Blind peak (>5m/100m climb)
  - `Dip` - Compression (>5m/100m descent)  
  - `Jump` - Airborne potential (>10m change in 50m)
- **Advisory notes**: "Caution", "Blind", "Heavy Braking" based on corner analysis

### 📤 **Professional Export**
Competition-ready output formats:
- **PDF Export**: Formatted document ready for printing or digital display
- **Text Export**: Plain text for custom workflows or integration
- **Live Preview**: Real-time pace notes panel with distance counters

### 🎭 **Rally-Authentic UI**
Every pixel designed for the rally experience:
- **Red & yellow theme**: Classic rally service park aesthetics
- **Monospace typography**: Clear, co-driver-friendly font rendering
- **Progressive notes panel**: Scrollable list with distance-to-next indicators
- **Mobile-optimized**: Works on tablets and phones for in-car use (for educational purposes!)

---

## 🔬 Algorithm Deep Dive (For Enthusiasts)

### Route Interpolation & Preparation
```
Raw GPS Points (variable spacing)
    ↓ 
Interpolated to 3m Resolution (~333 points/km)
    ↓
Distance Calculation (cumulative along route)
    ↓
Ready for Analysis
```

**Why 3m?** Optimal balance between accuracy and performance. Fine enough to catch radius changes in tight corners, fast enough for real-time processing.

### Corner Detection Pipeline

#### 1. **Multi-Window Curvature Analysis**
For each point along the route:
```typescript
windowSizes = [5m, 10m, 15m, 20m]
for each window:
    calculate radius using 3-point circumradius
    
finalRadius = min(all radii)  // Tightest curve wins
```

This multi-window approach catches both:
- **Gentle approaches**: Detected by larger windows
- **Sharp apexes**: Detected by smaller windows

#### 2. **Sustained Corner Identification**
```
if radius < 500m:  // Curved threshold
    → Start corner tracking
    
while radius < 500m AND direction consistent:
    → Continue corner
    
if straight section ≥ 4-6 points (adaptive):
    → End corner
```

**Adaptive straight detection**: Tighter corners require more straight points to end (prevents split detection at apex).

#### 3. **Instant Turn Detection**
Traditional methods miss sharp GPS corners. We check for:
```
bearing change > 60° over 6 points (~18m)
AND
local radius < 100m
```

This catches 90° street intersections, tight chicanes, and hairpins with sparse GPS data.

#### 4. **Smart Turn Positioning**
Corners aren't called at their geometric center—they're called at turn-in:

For tight corners (severity 1-2):
```
Find first point where radius ≤ 130% of minimum radius
```

This places the callout where the driver actually turns the wheel.

#### 5. **Direction Consistency Checks**
Critical safety feature:
```
if corner direction changes mid-segment:
    → Split into TWO corners
    → Prevent false "tightens" detection
```

Example: A left-right chicane will NEVER be reported as a single corner that "tightens".

### Severity Determination

**Special Turn Types** (only if geometrically appropriate):
- **Hairpin**: 150-180° angle AND severity 1-2 (prevents loose hairpins)
- **Square**: 75-105° angle AND severity 1-3 (actual 90° corners)
- **Acute**: <60° angle AND severity 1-3 (V-junctions)

**Standard Numeric Severity**: Based on radius thresholds (see McRae system above)

### Radius Change Detection

Analyzes corner in thirds:
```
firstThird = average radius of first 1/3
lastThird = average radius of last 1/3

if (lastThird - firstThird) / firstThird < -20%:
    → "tightens to X"
    
if (lastThird - firstThird) / firstThird > +20%:
    → "widens to Y"
```

Only reports if direction stays consistent throughout.

### Chicane Merging Logic

Two corners merge if:
1. Distance between them < 40m
2. Neither is severity 1 (hairpins never merge)
3. Severity difference ≤ 3
4. Both have defined direction
5. Creates: `"4 LEFT into 6 RIGHT"`

### Length Modifier Calculation

**Severity-aware thresholds** based on arc length physics:
```
Arc Length = Radius × Angle (in radians)

Severity 1-2 (tight):
    Long: >110°  (~38m at 20m radius)
    Short: <35°  (quick flick)
    
Severity 5-6 (fast):
    Long: >45°   (~189m at 200m radius)
    Short: <20°  (gentle kink)
```

Prevents nonsensical "long severity 6" calls (would be 577m!).

---

## 🔧 Setup & Installation

### Prerequisites

- **Node.js 16+** and npm
- **GraphHopper API key** ([free tier](https://www.graphhopper.com/) includes 500 requests/day)

### Quick Start

1. **Clone and install**:
   ```bash
   git clone <repository-url>
   cd pacenotes
   npm install
   ```

2. **Configure API key**:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env`:
   ```
   REACT_APP_GRAPHHOPPER_API_KEY=your_actual_api_key_here
   ```

3. **Launch**:
   ```bash
   npm start
   ```
   
   Open [http://localhost:3000](http://localhost:3000)

### Getting a GraphHopper API Key

1. Visit [graphhopper.com](https://www.graphhopper.com/)
2. Sign up for free account
3. Create API key in dashboard
4. **Important**: Enable elevation data for your key

---

## 🎮 Usage Guide

### Method 1: Click on Map
1. Click "Start Point" on map to set rally start
2. Click "End Point" to set rally finish
3. Route generates automatically

### Method 2: Location Search
1. Click search icon 🔍 in map panel
2. Type location name (e.g., "Pikes Peak Highway")
3. Select from suggestions
4. Repeat for end point

### Understanding the Results

**Pace Notes Format**:
```
0.18km: 4 LEFT, long into 6 RIGHT
        ↓       ↓           ↓
     Distance  Callout    Merged corner
```

**Map Markers**:
- **Numbers (1-6)**: Standard severity
- **Letters (H/S/A)**: Hairpin/Square/Acute
- **Arrows (←/→)**: Direction
- **⚠️ Badge**: Elevation hazard
- **🔗 Badge**: Part of merged chicane
- **Yellow dashed line**: Connects chicane markers

**Clicking Markers**: Auto-scrolls to pace note and highlights it

### Export Your Notes

- **PDF**: Click "Export to PDF" → Opens formatted document
- **Text**: Click "Export to Text" → Downloads .txt file

---

## 🏗️ Technical Architecture

```
┌─────────────────┐
│   User Input    │
│  (Map/Search)   │
└────────┬────────┘
         ↓
┌─────────────────┐
│  GraphHopper    │
│   Routing API   │ ← Returns polyline + elevation
└────────┬────────┘
         ↓
┌─────────────────┐
│ RouteProcessor  │
│  • Interpolate  │ ← 3m resolution
│  • Curvature    │ ← Multi-window analysis
│  • Corners      │ ← Sustained + instant detection
│  • Merge        │ ← Chicane logic
└────────┬────────┘
         ↓
┌─────────────────┐
│  Map Markers    │ ← Sequential animation
│  Pace Notes     │ ← Progressive panel
│  PDF/Text       │ ← Export
└─────────────────┘
```

### Core Technologies

- **React 18** - UI framework with hooks
- **TypeScript** - Type safety throughout
- **Tailwind CSS** - Utility-first styling
- **Leaflet.js** - Interactive maps
- **Turf.js** - Geospatial math (distance, bearing, etc.)
- **pdf-lib** - Client-side PDF generation

### Key Components

| Component | Purpose |
|-----------|---------|
| `InteractiveMapViewer` | Map display, markers, click handling, animations |
| `ProgressiveNotesPanel` | Scrollable pace notes list with highlighting |
| `LocationSearch` | GraphHopper geocoding integration |
| `RouteProcessor` | Core algorithm (1195 lines of corner detection logic) |
| `GraphHopperService` | API integration with error handling |
| `ExportUtils` | PDF and text generation |

---

## 📁 Project Structure

```
pacenotes/
├── src/
│   ├── components/
│   │   ├── InteractiveMapViewer.tsx    # Map + markers + animations
│   │   ├── ProgressiveNotesPanel.tsx   # Pace notes display
│   │   └── LocationSearch.tsx          # Search integration
│   ├── services/
│   │   ├── graphHopperService.ts       # Routing API
│   │   └── geocodingService.ts         # Location search API
│   ├── utils/
│   │   ├── routeProcessor.ts           # 🧠 Core algorithm (read this!)
│   │   └── exportUtils.ts              # PDF/text generation
│   ├── types/
│   │   └── index.ts                    # TypeScript definitions
│   └── App.tsx                         # Main app component
├── public/
├── .env.example                        # API key template
└── package.json
```

---

## 📝 Example Output

### Pace Notes
```
Rally Stage - Mountain Pass (12.3km)
Generated: 2024-10-02

START

0.18km: 4 LEFT, long into 6 RIGHT
0.52km: 2 RIGHT, caution, over crest
0.89km: HAIRPIN LEFT, heavy braking
1.24km: 5 RIGHT, widens to 6
1.67km: SQUARE LEFT into 3 RIGHT

... 23 more notes ...

12.30km: FINISH 🏁
```

### Map Display
- Red hairpin marker at 0.89km with ⚠️ hazard badge
- Linked yellow markers at 0.18km (4L and 6R connected by dashed line)
- All markers appeared sequentially in ~2 seconds
- Click any marker → flies to location and highlights note

---

## 📄 License

**MIT License** - Free for personal and commercial use. See `LICENSE` file for details.

---

## 🙏 Acknowledgments

### Data & Services
- **GraphHopper** - Routing and elevation data
- **OpenStreetMap** - Map data and road network
- **Leaflet.js** - Beautiful map rendering

### Inspiration
- **Rally Community** - Pace note standards and terminology
- **DiRT Rally Series** - Pace note format reference
- **WRC Co-drivers** - Real-world validation

### About
Built with ❤️ by [@local-optimum](https://github.com/local-optimum)

Blog: [blog.local-optimum.net](https://blog.local-optimum.net)

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests if applicable
5. Commit with descriptive messages
6. Push to your fork
7. Open a Pull Request

### Areas for Contribution
- Additional pace note format styles
- Algorithm improvements and tuning
- UI/UX enhancements
- Documentation and examples
- Test coverage
- Performance optimization

---

## ⚠️ Disclaimer

**For Educational and Recreational Use Only**

This application generates pace notes for educational purposes and rally simulation games. **Never use this application while driving on public roads.** Rally driving should only be conducted on closed courses with proper safety equipment and officials.

Always drive safely and obey all traffic laws. The authors assume no liability for misuse of this software.

---

<div align="center">

**🏁 Built for Rally Enthusiasts, By Rally Enthusiasts 🏁**

[Report Bug](https://github.com/local-optimum/pacenotes/issues) • [Request Feature](https://github.com/local-optimum/pacenotes/issues) • [Documentation](https://github.com/local-optimum/pacenotes/wiki)

</div>
