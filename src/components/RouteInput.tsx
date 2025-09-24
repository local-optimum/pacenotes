import React, { useState } from 'react';
import { RouteInputData } from '../types';

interface RouteInputProps {
  onSubmit: (data: RouteInputData) => void;
  loading: boolean;
}

const RouteInput: React.FC<RouteInputProps> = ({ onSubmit, loading }) => {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (start.trim() && end.trim()) {
      onSubmit({ start: start.trim(), end: end.trim() });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Rally Route Input</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="start" className="block text-sm font-medium text-gray-700 mb-2">
            Start Point
          </label>
          <input
            type="text"
            id="start"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            placeholder="Enter coordinates (lat,lng) or address"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          />
          <p className="text-xs text-gray-500 mt-1">
            Example: "40.748817,-73.985428" or "Empire State Building, NY"
          </p>
        </div>
        
        <div>
          <label htmlFor="end" className="block text-sm font-medium text-gray-700 mb-2">
            End Point
          </label>
          <input
            type="text"
            id="end"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            placeholder="Enter coordinates (lat,lng) or address"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          />
          <p className="text-xs text-gray-500 mt-1">
            Example: "40.758896,-73.985130" or "Times Square, NY"
          </p>
        </div>
        
        <button
          type="submit"
          disabled={loading || !start.trim() || !end.trim()}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Generating Route...' : 'Generate Pace Notes'}
        </button>
      </form>
    </div>
  );
};

export default RouteInput;
