# 🏁 Rally Pace Notes Generator

A modern React application that converts GraphHopper routes into professional rally-style pace notes with elevation data. Perfect for rally drivers and co-drivers who need accurate navigation instructions.

## ✨ Features

- **Route Processing**: Converts GPS routes into rally pace notes using numerical turn severity system
- **Elevation Analysis**: Detects crests and dips based on elevation changes
- **Interactive Map**: Visual route display with Leaflet.js
- **Export Options**: Download pace notes as PDF or text files
- **Mobile-First Design**: Responsive interface optimized for co-drivers
- **Real-Time Processing**: Client-side route analysis for privacy

## 🎯 McRae Rally System (Updated)

### Turn Severity Based on Corner Radius
- **1**: Hairpin (<20m radius) - Tightest corners
- **2**: Sharp (20-40m radius) - Sharp turns  
- **3**: Medium (40-70m radius) - Medium corners
- **4**: Open (70-120m radius) - Open turns
- **5**: Slight (120-200m radius) - Slight bends
- **6**: Near-straight (>200m radius) - Very slight

### Enhanced Modifiers
- **Length**: `Long` (>90° total turn), `Short` (<45° total turn)
- **Radius Change**: `tightens to X` or `widens to Y` (when radius changes >20% mid-corner)
- **Elevation**: `crest` (>5m/100m up), `dip` (>5m/100m down), `jump` (>10m up+down in 50m)

## 🔧 Setup

### Prerequisites

- Node.js 16+ and npm
- GraphHopper API key (free tier available)

### Installation

1. **Clone and install dependencies**:
   ```bash
   git clone <repository-url>
   cd pacenotes
   npm install
   ```

2. **Configure GraphHopper API**:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your GraphHopper API key:
   ```
   REACT_APP_GRAPHHOPPER_API_KEY=your_actual_api_key_here
   ```

3. **Start development server**:
   ```bash
   npm start
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

### Getting a GraphHopper API Key

1. Visit [GraphHopper](https://www.graphhopper.com/)
2. Sign up for a free account
3. Create an API key in your dashboard
4. Ensure elevation data is enabled for your key

## 🚗 Usage

1. **Enter Route Points**: Input start and end coordinates in lat,lng format
   - Example: `40.748817,-73.985428` and `40.758896,-73.985130`

2. **Generate Notes**: Click "Generate Pace Notes" to process the route

3. **Review Results**: 
   - View the route on the interactive map
   - Check the generated pace notes with turn numbers and elevation changes
   - Format: `[Distance]m: [Turn Number] [Direction] [Elevation], asphalt`

4. **Export**: Download as PDF for printing or text for digital use

## 🏗️ Technical Architecture

```
[User Input] → [GraphHopper API] → [Route Parser] → [Segment Analyzer] → [Note Formatter] → [UI/PDF Export]
                      ↓                   ↓
                 Polyline           Turf.js Analysis
```

### Core Components

- **RouteInput**: Form for start/end coordinates
- **MapViewer**: Leaflet map with route visualization
- **NotesList**: Scrollable pace notes display
- **ExportButton**: PDF and text download functionality

### Key Services

- **GraphHopperService**: API integration with error handling
- **RouteProcessor**: Turn angle calculation and segmentation
- **ExportUtils**: PDF and text generation utilities

## 📁 Project Structure

```
src/
├── components/           # React components
│   ├── RouteInput.tsx   # Route input form
│   ├── MapViewer.tsx    # Leaflet map component
│   ├── NotesList.tsx    # Pace notes display
│   └── ExportButton.tsx # Export functionality
├── services/            # External API services
│   └── graphHopperService.ts
├── utils/               # Utility functions
│   ├── routeProcessor.ts # Route analysis logic
│   └── exportUtils.ts   # PDF/text export
├── types/               # TypeScript type definitions
│   └── index.ts
└── App.tsx             # Main application component
```

## 🔍 Algorithm Details

### Route Segmentation

- Routes are interpolated to 5-meter resolution for accuracy
- Corner segments are identified using bearing change thresholds (>15° over 20m)
- Elevation changes are normalized per segment length

### Turn Detection

- Uses 3-point circumradius calculation for accurate corner radius measurement  
- Maps radius to McRae 1-6 system based on actual corner geometry
- Detects radius changes mid-corner for tightens/widens modifiers

### Elevation Analysis

- Detects "Crest": point higher than surrounding points by >5m
- Detects "Dip": point lower than surrounding points by >5m
- Uses three-point comparison for accurate detection

## 🛠️ Development

### Available Scripts

- `npm start`: Development server
- `npm test`: Run test suite
- `npm run build`: Production build
- `npm run eject`: Eject from Create React App

### Dependencies

- **React 18**: UI framework
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling
- **Leaflet**: Interactive maps
- **Turf.js**: Geospatial analysis
- **pdf-lib**: PDF generation

## 📝 Example Output

```
Rally Pace Notes
Route: Rally Route (8.5km)
Generated: 2024-01-15

1. 0m: Start, asphalt
2. 180m: Long 4 Right tightens to 3 crest, asphalt
3. 420m: Short 2 Left dip, asphalt
4. 650m: 5 Right widens to 6, asphalt
5. 890m: 3 Left jump, asphalt
```

## 🔮 Future Enhancements

- **Surface Detection**: Integrate OSM Overpass API for real surface data
- **Audio Export**: Generate audio files for co-driver playback
- **Route Validation**: Add distance/complexity checks
- **Geocoding**: Support address input instead of coordinates only
- **Advanced Elevation**: More sophisticated elevation change detection
- **Multiple Formats**: Support for different pace note styles

## 🐛 Troubleshooting

### Common Issues

1. **API Key Errors**: Ensure your GraphHopper API key is valid and has elevation access
2. **Route Not Found**: Check coordinate format (lat,lng) and ensure points are accessible by car
3. **Map Not Loading**: Verify Leaflet CSS is properly imported
4. **Export Failures**: Check browser permissions for file downloads

### Error Messages

- `"Invalid coordinates format"`: Use decimal degrees in lat,lng format
- `"No route found"`: Try different coordinates or check for valid road connections
- `"GraphHopper API error"`: Verify API key and check service status

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 🙏 Acknowledgments

- GraphHopper for routing and elevation data
- OpenStreetMap contributors for map data
- Rally community for pace note standards