'use client';

import React, { useState } from 'react';

// Mock data
const mockDataSources = [
  {
    id: 1,
    name: 'Product Documentation',
    type: 'GitHub',
    instance: 'Public Docs',
    lastSynced: '2h ago',
    status: 'Synced',
    documentsCount: 156,
    nextSync: '22h remaining',
  },
  {
    id: 2,
    name: 'Engineering Wiki',
    type: 'Confluence',
    instance: 'Internal KB',
    lastSynced: '1h ago',
    status: 'Syncing',
    documentsCount: 342,
    nextSync: '23h remaining',
  },
  {
    id: 3,
    name: 'Support Tickets',
    type: 'Zendesk',
    instance: 'Public Docs',
    lastSynced: '30m ago',
    status: 'Failed',
    documentsCount: 1205,
    nextSync: 'Retry needed',
  },
];

const dataSourceTypes = [
  { id: 'github', name: 'GitHub', description: 'Connect your GitHub repositories' },
  { id: 'confluence', name: 'Confluence', description: 'Import Confluence spaces and pages' },
  { id: 'notion', name: 'Notion', description: 'Sync Notion workspaces and databases' },
  { id: 'slack', name: 'Slack', description: 'Index Slack channels and threads' },
  { id: 'zendesk', name: 'Zendesk', description: 'Import Zendesk tickets and articles' },
];

function DataSourceCard({ source }: { source: typeof mockDataSources[0] }) {
  return (
    <div className="bg-dark-lighter rounded-lg border border-dark-border p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold">{source.name}</h3>
          <p className="text-gray-400 text-sm mt-1">Connected to {source.instance}</p>
        </div>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          source.status === 'Synced' ? 'bg-green-100 text-green-800' :
          source.status === 'Syncing' ? 'bg-blue-100 text-blue-800' :
          'bg-red-100 text-red-800'
        }`}>
          {source.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
        <div>
          <p className="text-gray-400">Type</p>
          <p className="font-medium">{source.type}</p>
        </div>
        <div>
          <p className="text-gray-400">Documents</p>
          <p className="font-medium">{source.documentsCount}</p>
        </div>
        <div>
          <p className="text-gray-400">Last Synced</p>
          <p className="font-medium">{source.lastSynced}</p>
        </div>
        <div>
          <p className="text-gray-400">Next Sync</p>
          <p className="font-medium">{source.nextSync}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <button className="text-brand-blue hover:text-blue-400 transition-colors text-sm">
          View Details
        </button>
        <span className="text-gray-600">•</span>
        <button className="text-brand-blue hover:text-blue-400 transition-colors text-sm">
          Sync Now
        </button>
        <span className="text-gray-600">•</span>
        <button className="text-red-500 hover:text-red-400 transition-colors text-sm">
          Remove
        </button>
      </div>
    </div>
  );
}

export default function DataSourcesPage() {
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Data Sources</h1>
          <p className="text-gray-400 mt-1">Manage your connected knowledge sources</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-brand-blue hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors"
        >
          Add Data Source
        </button>
      </div>

      {/* Data Sources Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {mockDataSources.map((source) => (
          <DataSourceCard key={source.id} source={source} />
        ))}
      </div>

      {/* Available Data Sources */}
      <div className="bg-dark-lighter rounded-lg border border-dark-border">
        <div className="p-4 border-b border-dark-border">
          <h2 className="text-lg font-semibold">Available Data Sources</h2>
          <p className="text-gray-400 text-sm mt-1">Connect more knowledge sources to enhance your instances</p>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dataSourceTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setShowAddModal(true)}
              className="flex items-start p-4 rounded-md border border-dark-border hover:border-gray-600 transition-colors text-left"
            >
              <div>
                <h3 className="font-medium">{type.name}</h3>
                <p className="text-gray-400 text-sm mt-1">{type.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Add Data Source Modal would go here */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-dark-lighter rounded-lg border border-dark-border p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Add Data Source</h2>
            {/* Modal content would go here */}
            <button 
              onClick={() => setShowAddModal(false)}
              className="mt-4 bg-brand-blue hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 