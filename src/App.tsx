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
    <div className="h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-gradient-to-r from-red-600 via-red-700 to-red-800 shadow-2xl border-b-4 border-yellow-400 flex-shrink-0">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-white p-3 rounded-xl shadow-xl transform rotate-3">
                <svg className="w-10 h-10 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2M12 8.5L11.37 10.63L9.5 11L11.37 11.37L12 13.5L12.63 11.37L14.5 11L12.63 10.63L12 8.5Z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-4xl font-black text-white tracking-tight uppercase">
                  RALLY
                </h1>
                <div className="text-yellow-300 text-base font-bold tracking-wider uppercase">
                  Pace Notes Generator
                </div>
                <p className="text-red-200 text-sm mt-1 font-medium">
                  Professional Stage Navigation System
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {state.startPoint && state.endPoint && (
                <button
                  onClick={resetRoute}
                  className="px-6 py-3 text-sm font-bold bg-yellow-400 text-black rounded-lg hover:bg-yellow-300 transition-all transform hover:scale-105 shadow-lg uppercase tracking-wide"
                >
                  🔄 New Stage
                </button>
              )}
              
              {state.route && (
                <div className="bg-black/40 backdrop-blur-sm border-2 border-yellow-400/50 text-yellow-300 font-bold px-4 py-3 rounded-lg shadow-xl">
                  <div className="text-xs uppercase tracking-wide text-yellow-200">Stage Distance</div>
                  <div className="text-xl font-black">{(state.route.totalDistance / 1000).toFixed(1)} KM</div>
                </div>
              )}
              
              <div className="bg-yellow-400 text-black px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider shadow-lg">
                🏁 STAGE BUILDER
              </div>
            </div>
          </div>

          {/* Error Display */}
          {state.error && (
            <div className="mt-4 bg-red-900/80 backdrop-blur-sm border-2 border-red-400 text-red-100 px-4 py-3 rounded-lg shadow-xl">
              <div className="flex">
                <svg className="w-5 h-5 mr-2 mt-0.5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div>
                  <h3 className="font-bold text-red-300 uppercase tracking-wide">Navigation Error</h3>
                  <p className="text-red-100">{state.error}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex">
          {/* Left Panel - Map */}
          <div className="flex-1 p-6">
            <div className="h-full bg-gray-800/50 backdrop-blur-sm rounded-2xl border-2 border-gray-600/50 shadow-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-gray-700 to-gray-800 px-4 py-3 border-b border-gray-600">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-gray-300 text-sm font-medium ml-4 uppercase tracking-wide">Stage Map</span>
                  </div>
                  <div className="bg-yellow-400/20 text-yellow-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                    {state.mapMode === 'select-start' ? '📍 Select Start' : 
                     state.mapMode === 'select-end' ? '🏁 Select Finish' : 
                     '🗺️ Route View'}
                  </div>
                </div>
              </div>
              <div className="h-full">
                <InteractiveMapViewer
                  route={state.route}
                  startPoint={state.startPoint}
                  endPoint={state.endPoint}
                  mapMode={state.mapMode}
                  onPointSelect={handlePointSelect}
                  onModeChange={handleModeChange}
                />
              </div>
            </div>
          </div>

          {/* Right Panel - Pace Notes */}
          <div className="w-[560px] p-6 pl-0">
            <div className="h-full">
              <ProgressiveNotesPanel
                paceNotes={state.paceNotes}
                isGenerating={state.loading}
                routeName={getRouteName()}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-gray-800 to-gray-900 border-t-4 border-yellow-400/50 p-4 flex-shrink-0">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-gray-300">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="font-bold text-green-300 uppercase tracking-wide">Stage Builder Active</span>
            </div>
            <div className="text-yellow-400">•</div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="font-medium text-red-300 uppercase">Turn System: U→1→6</span>
            </div>
            <div className="text-yellow-400">•</div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span className="font-medium text-blue-300 uppercase">Elevation Detection</span>
            </div>
            <div className="text-yellow-400">•</div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
              <span className="font-medium text-yellow-300 uppercase">PDF Export Ready</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
