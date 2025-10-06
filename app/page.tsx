'use client';

import { useState } from 'react';
import FloorPlanViewer3DWrapper from '@/components/FloorPlanViewer3DWrapper';

export default function SpatialStudioPage() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [floorPlanData, setFloorPlanData] = useState<any>(null);
  const [projectId, setProjectId] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [showCameras, setShowCameras] = useState(false);

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadedFile) return;

    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('floorplan', uploadedFile);
    formData.append('projectName', `Floor Plan - ${new Date().toLocaleDateString()}`);
    formData.append('customerId', 'demo-customer');

    try {
      console.log('Uploading floor plan:', uploadedFile.name);

      const response = await fetch('/api/spatial-studio/upload-floorplan', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        console.log('Upload successful:', data);
        setProjectId(data.projectId);

        // Start polling for analysis completion
        pollForAnalysis(data.projectId);
      } else {
        console.error('Upload failed:', data);
        setError(data.error || 'Upload failed');
        alert('Upload failed: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError(error instanceof Error ? error.message : 'Upload failed');
      alert('Upload failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // Poll for analysis completion
  const pollForAnalysis = async (id: string) => {
    const maxAttempts = 30; // 30 seconds max
    let attempts = 0;

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setError('Analysis timeout - please refresh to check status');
        return;
      }

      try {
        const response = await fetch(`/api/spatial-studio/upload-floorplan?projectId=${id}`);
        const data = await response.json();

        console.log('Poll status:', data.status);

        if (data.status === 'completed') {
          console.log('Analysis complete!', data);
          console.log('3D Model data:', data.model);
          if (data.model) {
            setFloorPlanData(data.model);
          } else {
            console.warn('No model data in response');
          }
          return;
        }

        if (data.status === 'failed') {
          setError(data.error || 'Analysis failed');
          return;
        }

        // Still processing, poll again
        attempts++;
        setTimeout(poll, 1000);
      } catch (error) {
        console.error('Polling error:', error);
        setError('Failed to check analysis status');
      }
    };

    poll();
  };

  const handleAnalyzeSite = async () => {
    if (!projectId) return;

    setAnalyzing(true);
    setError('');

    try {
      console.log('Analyzing site for project:', projectId);

      const response = await fetch('/api/spatial-studio/analyze-site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('Analysis complete:', data);
        setAnalysis(data.analysis);

        // Add cameras to floor plan data
        if (data.analysis.cameras) {
          setFloorPlanData({
            ...floorPlanData,
            cameras: data.analysis.cameras
          });
          setShowCameras(true);
        }
      } else {
        console.error('Analysis failed:', data);
        setError(data.error || 'Analysis failed');
        alert('Analysis failed: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setError(error instanceof Error ? error.message : 'Analysis failed');
      alert('Analysis failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
            Spatial Studio
          </h1>
          <p className="text-gray-400 text-sm sm:text-base">
            AI Creative Studio with 3D Site Intelligence
          </p>
          <p className="text-gray-500 text-xs sm:text-sm mt-2">
            Upload floor plan → AI generates 3D model → Plan security design
          </p>
        </div>

        {/* Upload Section */}
        <div className="bg-gray-900 rounded-lg p-4 sm:p-6 mb-8 border border-purple-600/20">
          <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center">
            <span className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3 text-sm">
              1
            </span>
            Upload Floor Plan
          </h2>

          <form onSubmit={handleFileUpload} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select floor plan file
              </label>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => {
                  setUploadedFile(e.target.files?.[0] || null);
                  setError('');
                }}
                className="block w-full text-sm text-gray-400
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-purple-600 file:text-white
                  hover:file:bg-purple-700 cursor-pointer"
              />
              <p className="text-xs text-gray-500 mt-2">
                Supported formats: PDF, PNG, JPG (max 10MB)
              </p>
              {uploadedFile && (
                <p className="text-xs text-green-500 mt-2">
                  ✓ {uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            {error && (
              <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-3">
                <p className="text-red-400 text-sm">⚠️ {error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={!uploadedFile || loading}
              className="px-6 py-3 bg-purple-600 rounded-lg font-semibold
                hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors w-full sm:w-auto"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing with AI...
                </span>
              ) : (
                '🚀 Generate 3D Model'
              )}
            </button>
          </form>
        </div>

        {/* 3D Viewer Section */}
        {floorPlanData && (
          <div className="bg-gray-900 rounded-lg p-4 sm:p-6 border border-purple-600/20">
            <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center">
              <span className="bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3 text-sm">
                2
              </span>
              View 3D Floor Plan
            </h2>

            <div className="bg-gray-800 rounded-lg p-3 mb-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <span className="text-gray-400">Project ID:</span>
                  <span className="ml-2 text-purple-400 font-mono">{projectId.substring(0, 8)}...</span>
                </div>
                <div>
                  <span className="text-gray-400">Walls Detected:</span>
                  <span className="ml-2 text-green-400">{floorPlanData.walls?.length || 0}</span>
                </div>
                <div>
                  <span className="text-gray-400">Doors:</span>
                  <span className="ml-2 text-blue-400">{floorPlanData.doors?.length || 0}</span>
                </div>
                <div>
                  <span className="text-gray-400">Windows:</span>
                  <span className="ml-2 text-cyan-400">{floorPlanData.windows?.length || 0}</span>
                </div>
              </div>
            </div>

            {/* AI Analysis Button */}
            {!analysis && (
              <div className="mb-4">
                <button
                  onClick={handleAnalyzeSite}
                  disabled={analyzing}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-semibold
                    hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed
                    transition-colors w-full sm:w-auto"
                >
                  {analyzing ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      AI Analyzing Site...
                    </span>
                  ) : (
                    '🤖 AI-Powered Site Analysis'
                  )}
                </button>
              </div>
            )}

            {/* Camera toggle if analysis complete */}
            {analysis && (
              <div className="mb-4 flex items-center gap-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showCameras}
                    onChange={(e) => setShowCameras(e.target.checked)}
                    className="mr-2 w-5 h-5"
                  />
                  <span className="text-sm">📹 Show Camera Placements ({analysis.cameras?.length || 0})</span>
                </label>
                <div className="text-xs text-gray-400">
                  Coverage: {analysis.coverage_analysis?.coverage_percentage?.toFixed(1)}%
                </div>
              </div>
            )}

            <FloorPlanViewer3DWrapper floorPlanData={floorPlanData} showCameras={showCameras} />

            <div className="mt-4 bg-gray-800 rounded-lg p-4">
              <p className="text-sm font-semibold text-gray-300 mb-2">💡 3D Viewer Controls:</p>
              <ul className="text-xs sm:text-sm text-gray-400 space-y-1">
                <li>🖱️ <strong>Left Click + Drag:</strong> Rotate view</li>
                <li>🔍 <strong>Scroll Wheel:</strong> Zoom in/out</li>
                <li>👆 <strong>Right Click + Drag:</strong> Pan around</li>
                <li>📐 <strong>Grid:</strong> Each square = 1 foot</li>
              </ul>
            </div>

            {/* Analysis Results Dashboard */}
            {analysis && (
              <div className="mt-6 border-t border-gray-700 pt-6">
                <h3 className="text-base sm:text-lg font-semibold mb-4 flex items-center">
                  <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3 text-sm">
                    3
                  </span>
                  AI Analysis Results
                </h3>

                {/* Coverage Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
                  <div className="bg-gray-800 rounded-lg p-3 border border-green-600/30">
                    <div className="text-xs text-gray-400">Coverage</div>
                    <div className="text-2xl font-bold text-green-400">
                      {analysis.coverage_analysis?.coverage_percentage?.toFixed(0)}%
                    </div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3 border border-red-600/30">
                    <div className="text-xs text-gray-400">Cameras</div>
                    <div className="text-2xl font-bold text-red-400">
                      {analysis.cameras?.length || 0}
                    </div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3 border border-blue-600/30">
                    <div className="text-xs text-gray-400">Access Points</div>
                    <div className="text-2xl font-bold text-blue-400">
                      {analysis.access_points?.length || 0}
                    </div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3 border border-yellow-600/30">
                    <div className="text-xs text-gray-400">Est. Cost</div>
                    <div className="text-xl font-bold text-yellow-400">
                      ${(analysis.estimated_cost?.total || 0).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Equipment List */}
                {analysis.equipment_list && (
                  <div className="bg-gray-800 rounded-lg p-4 mb-4">
                    <h4 className="font-semibold mb-2">📦 Equipment List</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      {Object.entries(analysis.equipment_list).map(([category, items]: [string, any]) => (
                        <div key={category} className="border-l-2 border-purple-600 pl-3">
                          <div className="font-semibold text-purple-400 capitalize">{category}</div>
                          {Object.entries(items).map(([item, qty]: [string, any]) => (
                            <div key={item} className="text-gray-400 text-xs">
                              • {item}: <span className="text-white">{qty}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Blind Spots Warning */}
                {analysis.blind_spots && analysis.blind_spots.length > 0 && (
                  <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4 mb-4">
                    <h4 className="font-semibold text-yellow-400 mb-2">⚠️ Blind Spots Detected</h4>
                    <div className="space-y-2 text-sm">
                      {analysis.blind_spots.map((spot: any, idx: number) => (
                        <div key={idx} className="text-gray-300">
                          <span className="font-semibold">{spot.area}:</span> {spot.recommendation}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Next Steps Preview */}
            <div className="mt-6 border-t border-gray-700 pt-6">
              <h3 className="text-base sm:text-lg font-semibold mb-3 text-gray-300">
                🚀 Coming Next (Phase 2):
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="bg-gray-800 rounded-lg p-3 border border-purple-600/20">
                  <div className="text-2xl mb-2">📱</div>
                  <div className="font-semibold text-purple-400">Mobile Capture</div>
                  <div className="text-xs text-gray-500 mt-1">Site walks with GPS + voice annotations</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-3 border border-pink-600/20">
                  <div className="text-2xl mb-2">🤖</div>
                  <div className="font-semibold text-pink-400">AI Suggestions</div>
                  <div className="text-xs text-gray-500 mt-1">Optimal camera & sensor placements</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-3 border border-blue-600/20">
                  <div className="text-2xl mb-2">🕶️</div>
                  <div className="font-semibold text-blue-400">AR Glasses</div>
                  <div className="text-xs text-gray-500 mt-1">Meta Ray-Ban Smart Glasses integration</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Info Cards */}
        {!floorPlanData && !loading && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
              <div className="text-3xl mb-2">📐</div>
              <h3 className="font-semibold mb-1">AI Floor Plan Analysis</h3>
              <p className="text-xs text-gray-400">GPT-4 Vision detects walls, doors, windows automatically</p>
            </div>
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
              <div className="text-3xl mb-2">🎨</div>
              <h3 className="font-semibold mb-1">Interactive 3D View</h3>
              <p className="text-xs text-gray-400">Rotate, zoom, and explore your floor plan in real-time</p>
            </div>
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
              <div className="text-3xl mb-2">⚡</div>
              <h3 className="font-semibold mb-1">Instant Results</h3>
              <p className="text-xs text-gray-400">From upload to 3D model in seconds</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
