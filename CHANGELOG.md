# Changelog

All notable changes to the Rally Pace Notes Generator project will be documented in this file.

## [v1.1.0] - 2024-09-24

### 🎯 Major UI/UX Improvements

#### ✨ Interactive Map-Based Route Selection
- **ADDED**: Click-to-select start and end points directly on map
- **ADDED**: Visual feedback with colored markers (green start, red finish)
- **ADDED**: Smart mode switching (start → end → route view)
- **ADDED**: Crosshair cursor during point selection
- **ADDED**: Custom styled markers with proper positioning
- **ADDED**: Auto-fitting map bounds when points/routes are selected
- **ADDED**: Reset functionality for changing route points

#### 📊 Progressive Pace Notes Panel
- **ADDED**: Real-time progressive note generation with smooth animations
- **ADDED**: Notes appear every 150ms with staggered animation delays
- **ADDED**: Color-coded turn severity badges (red=hairpin → gray=straight)
- **ADDED**: Elevation indicators with directional arrows (↗ Crest, ↘ Dip)
- **ADDED**: Progress bar showing generation status
- **ADDED**: Traditional rally directions in light grey under each pace note
- **ADDED**: Professional rally terminology with proper descriptions

#### 🔧 Fixed Height & Scrolling System
- **FIXED**: Pace notes panel now maintains fixed height matching map
- **FIXED**: Only the notes list scrolls, not the entire panel
- **FIXED**: Export buttons and legend always remain visible
- **FIXED**: Smooth auto-scroll to latest notes during generation
- **FIXED**: Proper container constraints prevent expansion
- **FIXED**: Consistent height between map and notes panels

#### 🎨 Layout & Design Overhaul
- **REDESIGNED**: Split-screen layout (map left, notes right)
- **REDESIGNED**: Clean header with route information and controls
- **REDESIGNED**: Compact footer with feature highlights
- **IMPROVED**: Mobile-first responsive design
- **IMPROVED**: Professional color scheme and typography
- **IMPROVED**: Consistent spacing and visual hierarchy

### 🔧 Technical Improvements

#### 🎯 Tailwind CSS Configuration
- **FIXED**: Tailwind v3 configuration and compilation
- **FIXED**: PostCSS setup for proper CSS processing
- **ADDED**: Custom animations for slideIn effects
- **ADDED**: Proper utility class generation

#### 🗺️ Enhanced Map Integration
- **IMPROVED**: Leaflet map initialization and event handling
- **ADDED**: Proper click event management with cleanup
- **ADDED**: Custom marker icons using inline styles
- **FIXED**: Map container height and responsiveness
- **ADDED**: Interactive status indicators and instructions

#### 📋 Component Architecture
- **CREATED**: `InteractiveMapViewer` - Map with point selection
- **CREATED**: `ProgressiveNotesPanel` - Animated notes display
- **ENHANCED**: `ExportButton` - Compact, always-visible design
- **REFACTORED**: Main App component for better state management

#### 🚀 Performance & UX
- **ADDED**: Auto-scroll to new notes with smooth behavior
- **ADDED**: Loading states and progress indicators
- **IMPROVED**: Component re-render optimization
- **ADDED**: Proper cleanup of map event listeners
- **FIXED**: Memory leaks in progressive note generation

### 📝 Pace Notes Format

#### Traditional + Technical Notation
Each pace note now includes dual notation:
- **Technical**: `150m: 3 Right Crest, asphalt`
- **Traditional**: `At 150 meters: MEDIUM right over crest on tarmac`

#### Turn Severity System
- **1**: Hairpin (<30°) - Very Sharp
- **2**: Sharp (30-60°) - Sharp  
- **3**: Medium (60-90°) - Medium
- **4**: Open (90-120°) - Open
- **5**: Slight (120-150°) - Slight
- **6**: Near Straight (>150°) - Straight

### 🔄 Workflow Improvements

#### Streamlined User Experience
1. **Select Start Point**: Click anywhere on map (green marker)
2. **Select End Point**: Click second location (red marker)  
3. **Auto-Generate Route**: Route and pace notes generate automatically
4. **Progressive Display**: Notes appear smoothly with auto-scroll
5. **Export Ready**: Download PDF/text when complete

#### Always-Visible Controls
- **Header**: Route info, distance, reset button
- **Legend**: Turn severity reference 
- **Export**: PDF and text download options
- **Footer**: Feature highlights and instructions

### 🐛 Bug Fixes

#### Layout & Scrolling
- **FIXED**: Pace notes panel expanding beyond available height
- **FIXED**: Inconsistent heights between map and notes panels
- **FIXED**: Missing scroll bars when content overflows
- **FIXED**: Jerky scroll animations during progressive generation
- **FIXED**: Export buttons disappearing when many notes present

#### Map Functionality  
- **FIXED**: Click events not registering on map
- **FIXED**: Markers not appearing after point selection
- **FIXED**: Map bounds not updating with route
- **FIXED**: Memory leaks from event listeners

#### Styling & Appearance
- **FIXED**: Tailwind CSS not compiling properly
- **FIXED**: Inconsistent spacing and typography
- **FIXED**: Missing hover states and transitions
- **FIXED**: Poor mobile responsiveness

### 🚀 Development Experience

#### Build & Testing
- **IMPROVED**: Development server startup time
- **ADDED**: Fast refresh for better iteration
- **FIXED**: Hot reloading issues with layout changes
- **CLEANED**: Removed debug console logs
- **TESTED**: Production build verification

#### Code Quality
- **ADDED**: Comprehensive TypeScript types
- **IMPROVED**: Component separation and reusability  
- **ADDED**: Proper error handling and user feedback
- **STANDARDIZED**: Consistent code formatting and structure

---

## [v1.0.0] - 2024-09-24

### 🎉 Initial Release

#### Core Features
- **CREATED**: React + TypeScript foundation
- **IMPLEMENTED**: GraphHopper API integration
- **ADDED**: Route processing with Turf.js geospatial analysis
- **CREATED**: Rally pace notes generation algorithm
- **ADDED**: PDF and text export functionality
- **IMPLEMENTED**: Basic map display with Leaflet.js
- **CONFIGURED**: Tailwind CSS for styling
- **SETUP**: Complete development environment

#### Route Processing Algorithm
- **IMPLEMENTED**: 50-meter route segmentation
- **ADDED**: Turn angle calculation using bearing analysis
- **CREATED**: Elevation change detection (crest/dip)
- **ESTABLISHED**: Rally-standard turn severity classification
- **ASSUMED**: Asphalt surface (future: OSM surface detection)

#### Export Capabilities
- **ADDED**: Professional PDF generation with pdf-lib
- **CREATED**: Text file export for digital use
- **IMPLEMENTED**: Downloadable file handling
- **DESIGNED**: Clean, printable pace note format

---

## Future Roadmap

### Phase 2: Enhanced Features
- **Geocoding**: Address input support
- **Surface Detection**: Real OSM surface data integration
- **Audio Export**: Text-to-speech for co-driver playback
- **Route Validation**: Distance and complexity checks

### Phase 3: Advanced Rally Tools
- **Stage Management**: Multiple rally stages support
- **Timing Integration**: Pace calculation and timing data
- **Team Collaboration**: Share and collaborate on pace notes
- **Competition Integration**: Connect with rally timing systems

### Phase 4: Mobile & Cloud
- **PWA Conversion**: Offline-capable mobile app
- **Cloud Deployment**: Hosted version with user accounts
- **Real-time Updates**: Live pace note sharing during events
- **Hardware Integration**: Connect with rally computers
