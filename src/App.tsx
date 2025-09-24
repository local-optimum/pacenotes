import React, { useState } from 'react';
import RouteInput from './components/RouteInput';
import MapViewer from './components/MapViewer';
import NotesList from './components/NotesList';
import ExportButton from './components/ExportButton';
import { GraphHopperService } from './services/graphHopperService';
import { RouteProcessor } from './utils/routeProcessor';
import { AppState, RouteInputData } from './types';

function App() {
  const [state, setState] = useState<AppState>({
    route: null,
    paceNotes: [],
    loading: false,
    error: null
  });

  const handleRouteSubmit = async (data: RouteInputData) => {
    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      route: null,
      paceNotes: []
    }));

    try {
      // Get route from GraphHopper
      const route = await GraphHopperService.getRoute(data.start, data.end);
      
      // Process route to generate pace notes
      const paceNotes = RouteProcessor.processRoute(route);

      setState(prev => ({
        ...prev,
        route,
        paceNotes,
        loading: false
      }));

    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      }));
    }
  };

  const getRouteName = (): string => {
    if (!state.route) return 'Rally Route';
    return `Rally Route (${(state.route.totalDistance / 1000).toFixed(1)}km)`;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-3xl font-bold text-gray-900">
            🏁 Rally Pace Notes Generator
          </h1>
          <p className="text-gray-600 mt-1">
            Convert routes into professional rally pace notes with elevation data
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Display */}
        {state.error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
            <div className="flex">
              <svg className="w-5 h-5 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="font-medium">Error</h3>
                <p>{state.error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            <RouteInput onSubmit={handleRouteSubmit} loading={state.loading} />
            
            {state.paceNotes.length > 0 && (
              <ExportButton paceNotes={state.paceNotes} routeName={getRouteName()} />
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <MapViewer route={state.route} />
          </div>
        </div>

        {/* Full Width Pace Notes */}
        <div className="mt-8">
          <NotesList paceNotes={state.paceNotes} />
        </div>

        {/* Info Footer */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-2">How it works:</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Enter start and end coordinates (lat,lng format)</li>
            <li>• Route is fetched from GraphHopper with elevation data</li>
            <li>• Route is segmented every 50m and analyzed for turns</li>
            <li>• Turn severity: 1=Hairpin, 2=Sharp, 3=Medium, 4=Open, 5=Slight, 6=Straight</li>
            <li>• Elevation changes: Crest (&gt;5m rise), Dip (&gt;5m drop)</li>
            <li>• Surface assumed as asphalt (future: OSM surface detection)</li>
          </ul>
        </div>
      </main>
    </div>
  );
}

export default App;
