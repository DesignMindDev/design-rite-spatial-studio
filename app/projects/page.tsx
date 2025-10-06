'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('spatial_projects')
        .select('*, site_annotations(count)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = projects.filter(p =>
    p.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.customer_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
              Spatial Studio Projects
            </h1>
            <p className="text-gray-400">Manage your 3D floor plan projects</p>
          </div>
          <Link
            href="/spatial-studio"
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-semibold
              hover:from-purple-700 hover:to-pink-700 transition-colors"
          >
            + New Project
          </Link>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="🔍 Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white
              focus:outline-none focus:border-purple-600 transition-colors"
          />
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="bg-gray-900 rounded-lg p-12 text-center border border-gray-700">
            <div className="text-6xl mb-4">📁</div>
            <h3 className="text-xl font-semibold mb-2">No projects yet</h3>
            <p className="text-gray-400 mb-6">
              {searchTerm ? 'No projects match your search' : 'Create your first 3D floor plan project'}
            </p>
            <Link
              href="/spatial-studio"
              className="inline-block px-6 py-3 bg-purple-600 rounded-lg font-semibold
                hover:bg-purple-700 transition-colors"
            >
              Create First Project
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}

        {/* Stats Footer */}
        {!loading && projects.length > 0 && (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
              <div className="text-2xl font-bold text-purple-400">{projects.length}</div>
              <div className="text-sm text-gray-400">Total Projects</div>
            </div>
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
              <div className="text-2xl font-bold text-green-400">
                {projects.filter(p => p.site_annotations?.length > 0).length}
              </div>
              <div className="text-sm text-gray-400">With Annotations</div>
            </div>
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
              <div className="text-2xl font-bold text-blue-400">
                {projects.filter(p => new Date(p.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length}
              </div>
              <div className="text-sm text-gray-400">Created This Week</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectCard({ project }: { project: any }) {
  const createdDate = new Date(project.created_at).toLocaleDateString();
  const wallCount = project.threejs_model?.walls?.length || 0;
  const doorCount = project.threejs_model?.doors?.length || 0;

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 hover:border-purple-600 transition-all overflow-hidden group">
      {/* Project Image/Preview */}
      <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 h-40 flex items-center justify-center">
        <div className="text-6xl opacity-50 group-hover:opacity-100 transition-opacity">
          🏗️
        </div>
      </div>

      {/* Project Info */}
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-2 truncate">{project.project_name}</h3>

        <div className="text-xs text-gray-400 space-y-1 mb-3">
          <div>📅 Created: {createdDate}</div>
          {project.customer_id && <div>👤 Customer: {project.customer_id}</div>}
          <div className="flex gap-3">
            <span>🧱 {wallCount} walls</span>
            <span>🚪 {doorCount} doors</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Link
            href={`/spatial-studio?project=${project.id}`}
            className="flex-1 px-3 py-2 bg-purple-600 rounded text-sm font-semibold text-center
              hover:bg-purple-700 transition-colors"
          >
            View 3D
          </Link>
          <button
            className="px-3 py-2 bg-gray-800 rounded text-sm font-semibold
              hover:bg-gray-700 transition-colors"
            title="More options"
          >
            ⋯
          </button>
        </div>
      </div>
    </div>
  );
}
