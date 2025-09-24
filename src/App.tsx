import React, { useState, useCallback } from 'react';
import InteractiveMapViewer from './components/InteractiveMapViewer';
import ProgressiveNotesPanel from './components/ProgressiveNotesPanel';
import { GraphHopperService } from './services/graphHopperService';
import { RouteProcessor } from './utils/routeProcessor';
import { AppState, Coordinates } from './types';

function App() {
  const [state, setState] = useState<AppState>({
    route: null,
    paceNotes: [],
    loading: false,
    error: null,
    startPoint: null,
    endPoint: null,
    mapMode: 'select-start'
  });

  const handlePointSelect = useCallback((point: Coordinates, type: 'start' | 'end') => {
    setState(prev => ({
      ...prev,
      [type === 'start' ? 'startPoint' : 'endPoint']: point,
      error: null
    }));
  }, []);

  const handleModeChange = useCallback((mode: 'select-start' | 'select-end' | 'view-route') => {
    setState(prev => ({
      ...prev,
      mapMode: mode
    }));
  }, []);

  const generateRoute = useCallback(async () => {
    if (!state.startPoint || !state.endPoint) return;

    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      route: null,
      paceNotes: []
    }));

    try {
      // Convert coordinates to string format for GraphHopper
      const startString = `${state.startPoint.lat},${state.startPoint.lng}`;
      const endString = `${state.endPoint.lat},${state.endPoint.lng}`;

      // Get route from GraphHopper
      const route = await GraphHopperService.getRoute(startString, endString);
      
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
  }, [state.startPoint, state.endPoint]);

  // Auto-generate route when both points are selected
  React.useEffect(() => {
    if (state.startPoint && state.endPoint && state.mapMode === 'view-route' && !state.route && !state.loading) {
      generateRoute();
    }
  }, [state.startPoint, state.endPoint, state.mapMode, state.route, state.loading, generateRoute]);

  const getRouteName = (): string => {
    if (!state.route) return 'Rally Route';
    return `Rally Route (${(state.route.totalDistance / 1000).toFixed(1)}km)`;
  };

  const resetRoute = () => {
    setState(prev => ({
      ...prev,
      startPoint: null,
      endPoint: null,
      route: null,
      paceNotes: [],
      mapMode: 'select-start',
      error: null
    }));
  };


  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b flex-shrink-0">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                🏁 Rally Pace Notes Generator
              </h1>
              <p className="text-gray-600 text-sm mt-1">
                Click on map to select route points • Professional rally navigation
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              {state.startPoint && state.endPoint && (
                <button
                  onClick={resetRoute}
                  className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  New Route
                </button>
              )}
              
              {state.route && (
                <div className="text-sm text-gray-600 bg-gray-100 px-3 py-2 rounded-lg">
                  {(state.route.totalDistance / 1000).toFixed(1)}km route
                </div>
              )}
            </div>
          </div>

          {/* Error Display */}
          {state.error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
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
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex min-h-0 overflow-hidden">
        <div className="flex-1 flex h-full">
          {/* Left Panel - Map */}
          <div className="flex-1 p-4 h-full">
            <InteractiveMapViewer
              route={state.route}
              startPoint={state.startPoint}
              endPoint={state.endPoint}
              mapMode={state.mapMode}
              onPointSelect={handlePointSelect}
              onModeChange={handleModeChange}
            />
          </div>

          {/* Right Panel - Pace Notes */}
          <div className="w-96 p-4 pl-0 h-full flex flex-col">
            <ProgressiveNotesPanel
              paceNotes={state.paceNotes}
              isGenerating={state.loading}
              routeName={getRouteName()}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t p-4 flex-shrink-0">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-gray-500">
            <span>🔄 Interactive map-based route selection</span>
            <span>📊 Real-time pace note generation</span>
            <span>📋 Turn severity: 1=Hairpin → 6=Straight</span>
            <span>⛰️ Elevation: Crest/Dip detection</span>
            <span>📄 PDF & text export</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
