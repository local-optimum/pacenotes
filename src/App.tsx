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
  const [selectedNoteIndex, setSelectedNoteIndex] = useState<number | null>(null);

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
    setSelectedNoteIndex(null);
  };

  const handleNoteClick = useCallback((index: number) => {
    setSelectedNoteIndex(index);
  }, []);


  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-gradient-to-r from-red-600 via-red-700 to-red-800 shadow-2xl border-b-4 border-yellow-400 flex-shrink-0">
        <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="bg-white p-2 sm:p-3 rounded-xl shadow-xl transform rotate-3 flex-shrink-0">
                <svg className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2M12 8.5L11.37 10.63L9.5 11L11.37 11.37L12 13.5L12.63 11.37L14.5 11L12.63 10.63L12 8.5Z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight uppercase">
                  RALLY
                </h1>
                <div className="text-yellow-300 text-xs sm:text-sm lg:text-base font-bold tracking-wider uppercase">
                  Pace Notes Generator
                </div>
                <p className="text-orange-200 text-xs sm:text-sm mt-0.5 sm:mt-1 font-semibold hidden sm:block">
                  For Fun & Education - Always Drive Safely!
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 w-full sm:w-auto">
              {state.startPoint && state.endPoint && (
                <button
                  onClick={resetRoute}
                  className="px-3 py-2 sm:px-4 sm:py-2 lg:px-6 lg:py-3 text-xs sm:text-sm font-bold bg-yellow-400 text-black rounded-lg hover:bg-yellow-300 transition-all transform hover:scale-105 shadow-lg uppercase tracking-wide flex-shrink-0"
                >
                  <span className="hidden sm:inline">🔄 New Stage</span>
                  <span className="sm:hidden">🔄 New</span>
                </button>
              )}
              
              {state.route && (
                <div className="bg-black/40 backdrop-blur-sm border-2 border-yellow-400/50 text-yellow-300 font-bold px-3 py-2 sm:px-4 sm:py-2 lg:px-6 lg:py-3 rounded-lg shadow-xl mr-3 sm:mr-4 lg:mr-6">
                  <div className="text-xs uppercase tracking-wide text-yellow-200">Stage</div>
                  <div className="text-base sm:text-lg lg:text-xl font-black">{(state.route.totalDistance / 1000).toFixed(1)} KM</div>
                </div>
              )}
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
      <main className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
        {/* Map Panel - Large on mobile (scroll down for notes), side-by-side on desktop */}
        <div className="w-full lg:flex-1 p-3 sm:p-4 lg:p-6 flex-shrink-0 min-h-[85vh] lg:min-h-0 lg:h-auto">
          <div className="h-full">
            <InteractiveMapViewer
                route={state.route}
                startPoint={state.startPoint}
                endPoint={state.endPoint}
                mapMode={state.mapMode}
                onPointSelect={handlePointSelect}
                onModeChange={handleModeChange}
                onResetRoute={resetRoute}
                paceNotes={state.paceNotes}
                selectedNoteIndex={selectedNoteIndex}
                onNoteClick={handleNoteClick}
              />
          </div>
        </div>

        {/* Pace Notes Panel - Below map on mobile (scroll down to see), beside on desktop */}
        <div className="w-full lg:w-[480px] xl:w-[560px] 2xl:w-[640px] p-3 sm:p-4 lg:p-6 lg:pl-0 flex-shrink-0 min-h-[600px] lg:min-h-0 lg:h-auto">
          <div className="h-full min-h-[600px] lg:min-h-0">
            <ProgressiveNotesPanel
              paceNotes={state.paceNotes}
              isGenerating={state.loading}
              routeName={getRouteName()}
              onNoteClick={handleNoteClick}
              selectedNoteIndex={selectedNoteIndex}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-gray-800 to-gray-900 border-t-4 border-yellow-400/50 p-2 sm:p-3 lg:p-4 flex-shrink-0">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-y-3">
            {/* Features List - Left Aligned */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 lg:gap-6 text-xs text-gray-300">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                <span className="font-bold text-blue-300 uppercase tracking-wide hidden sm:inline">GPS Corner Analysis</span>
                <span className="font-bold text-blue-300 uppercase tracking-wide sm:hidden">GPS</span>
              </div>
              <div className="text-yellow-400 hidden sm:inline">•</div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="font-medium text-red-300 uppercase hidden sm:inline">McRae 1-6 System</span>
                <span className="font-medium text-red-300 uppercase sm:hidden">McRae</span>
              </div>
              <div className="text-yellow-400 hidden lg:inline">•</div>
              <div className="flex items-center space-x-1 hidden lg:flex">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="font-medium text-green-300 uppercase">Auto-Merge Chicanes</span>
              </div>
              <div className="text-yellow-400 hidden lg:inline">•</div>
              <div className="flex items-center space-x-1 hidden lg:flex">
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                <span className="font-medium text-yellow-300 uppercase">Live Map Markers</span>
              </div>
            </div>
            
            {/* Creator Credit - Right Aligned */}
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="hidden sm:inline">Created by</span>
              <a 
                href="https://github.com/local-optimum" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center gap-1.5 text-gray-300 hover:text-yellow-300 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.268 2.75 1.026A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.026 2.747-1.026.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                </svg>
                <span className="font-medium">local-optimum</span>
              </a>
              <span className="text-gray-600">|</span>
              <a 
                href="https://blog.local-optimum.net/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center gap-1.5 text-gray-300 hover:text-yellow-300 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7.5 5.25a3 3 0 013-3h3a3 3 0 013 3v.205c.933.085 1.857.197 2.774.334 1.454.218 2.476 1.483 2.476 2.917v3.033c0 1.211-.734 2.352-1.936 2.752A24.726 24.726 0 0112 15.75c-2.73 0-5.357-.442-7.814-1.259-1.202-.4-1.936-1.541-1.936-2.752V8.706c0-1.434 1.022-2.7 2.476-2.917A48.814 48.814 0 017.5 5.455V5.25zm7.5 0v.09a49.488 49.488 0 00-6 0v-.09a1.5 1.5 0 011.5-1.5h3a1.5 1.5 0 011.5 1.5zm-3 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" />
                  <path fillRule="evenodd" d="M3 18.4v-2.796a4.3 4.3 0 00.713.31A26.226 26.226 0 0012 17.25c2.892 0 5.68-.468 8.287-1.335.252-.084.49-.189.713-.311V18.4c0 1.452-1.047 2.728-2.523 2.923-2.12.282-4.282.427-6.477.427a49.19 49.19 0 01-6.477-.427C4.047 21.128 3 19.852 3 18.4z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">Blog</span>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
