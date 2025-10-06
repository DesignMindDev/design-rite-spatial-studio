'use client';

import { Component, ReactNode } from 'react';
import dynamic from 'next/dynamic';

// Error boundary for Three.js crashes
class ThreeJSErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Three.js Error Boundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-[600px] bg-gray-900 rounded-lg overflow-hidden border border-red-600/30 flex items-center justify-center p-8">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h3 className="text-xl font-bold text-red-400 mb-2">3D Viewer Error</h3>
            <p className="text-gray-400 mb-4">
              There was an issue initializing the 3D viewer.
            </p>
            <details className="text-left bg-gray-800 rounded p-4 text-xs text-gray-500">
              <summary className="cursor-pointer mb-2 font-semibold">Error Details</summary>
              <pre className="whitespace-pre-wrap overflow-auto max-h-40">
                {this.state.error?.toString()}
              </pre>
            </details>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-white"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Dynamic import with SSR disabled
const FloorPlanViewer3D = dynamic(
  () => import('./FloorPlanViewer3D'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[600px] bg-gray-900 rounded-lg overflow-hidden border border-purple-600/30 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading 3D Viewer...</p>
        </div>
      </div>
    ),
  }
);

interface FloorPlanData {
  walls: Array<{ start: [number, number]; end: [number, number] }>;
  doors: Array<{ position: [number, number]; type: string }>;
  windows: Array<{ position: [number, number] }>;
  rooms?: Array<{ name: string; center: [number, number] }>;
  height: number;
  cameras?: Array<{
    type: string;
    position: [number, number, number];
    coverage_radius?: number;
  }>;
}

export default function FloorPlanViewer3DWrapper({
  floorPlanData,
  showCameras = false
}: {
  floorPlanData: FloorPlanData;
  showCameras?: boolean;
}) {
  // Validate data before attempting render
  if (!floorPlanData || typeof floorPlanData !== 'object') {
    return (
      <div className="w-full h-[600px] bg-gray-900 rounded-lg overflow-hidden border border-yellow-600/30 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="text-yellow-500 text-6xl mb-4">⚠️</div>
          <p className="text-gray-400">No floor plan data available</p>
          <p className="text-gray-500 text-sm mt-2">Please upload a floor plan to generate the 3D model</p>
        </div>
      </div>
    );
  }

  return (
    <ThreeJSErrorBoundary>
      <FloorPlanViewer3D floorPlanData={floorPlanData} showCameras={showCameras} />
    </ThreeJSErrorBoundary>
  );
}
