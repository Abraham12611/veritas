'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';

// Mock data for a single instance
const mockInstance = {
  id: 1,
  name: 'Public Docs',
  type: 'External',
  dataSources: 3,
  lastSynced: '2h ago',
  status: 'Active',
  description: 'Customer-facing documentation and API references',
  stats: {
    totalQueries: '2.3k',
    avgResponseTime: '1.2s',
    successRate: '98%',
  },
};

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'data-sources', label: 'Data Sources' },
  { id: 'deployment', label: 'Deployment' },
  { id: 'settings', label: 'Settings' },
];

export default function InstanceDetailsPage() {
  const params = useParams();
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold">{mockInstance.name}</h1>
          <p className="text-gray-400 mt-1">{mockInstance.description}</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            {mockInstance.status}
          </span>
          <button className="text-red-500 hover:text-red-400 transition-colors">
            Delete Instance
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-dark-lighter p-4 rounded-lg border border-dark-border">
          <p className="text-gray-400 text-sm">Total Queries</p>
          <p className="text-2xl font-bold mt-1">{mockInstance.stats.totalQueries}</p>
        </div>
        <div className="bg-dark-lighter p-4 rounded-lg border border-dark-border">
          <p className="text-gray-400 text-sm">Avg Response Time</p>
          <p className="text-2xl font-bold mt-1">{mockInstance.stats.avgResponseTime}</p>
        </div>
        <div className="bg-dark-lighter p-4 rounded-lg border border-dark-border">
          <p className="text-gray-400 text-sm">Success Rate</p>
          <p className="text-2xl font-bold mt-1">{mockInstance.stats.successRate}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-dark-border mb-6">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-4 px-2 text-sm font-medium transition-colors relative ${
                activeTab === tab.id
                  ? 'text-brand-blue'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-blue" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-dark-lighter rounded-lg border border-dark-border p-6">
        {activeTab === 'overview' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Overview Content</h2>
            <p className="text-gray-400">
              Display charts and metrics about this instance's usage and performance.
            </p>
          </div>
        )}

        {activeTab === 'data-sources' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Connected Data Sources</h2>
              <button className="bg-brand-blue hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors">
                Add Data Source
              </button>
            </div>
            <p className="text-gray-400">List of data sources will appear here.</p>
          </div>
        )}

        {activeTab === 'deployment' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Deployment Options</h2>
            <p className="text-gray-400">
              Configure how this instance is deployed (Website Widget, Slack Bot, etc.).
            </p>
          </div>
        )}

        {activeTab === 'settings' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Instance Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Instance Name
                </label>
                <input
                  type="text"
                  value={mockInstance.name}
                  className="w-full bg-[#1e1e1e] border border-dark-border rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Environment Type
                </label>
                <select className="w-full bg-[#1e1e1e] border border-dark-border rounded-md px-3 py-2">
                  <option>External</option>
                  <option>Internal</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 