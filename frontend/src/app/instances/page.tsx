import React from 'react';
import Link from 'next/link';

// Mock data
const mockInstances = [
  {
    id: 1,
    name: 'Public Docs',
    type: 'External',
    dataSources: 3,
    lastSynced: '2h ago',
    status: 'Active',
    description: 'Customer-facing documentation and API references',
  },
  {
    id: 2,
    name: 'Internal KB',
    type: 'Internal',
    dataSources: 5,
    lastSynced: '1h ago',
    status: 'Active',
    description: 'Internal knowledge base for team documentation',
  },
];

export default function InstancesPage() {
  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Instances</h1>
          <p className="text-gray-400 mt-1">Manage your Veritas instances and their configurations</p>
        </div>
        <button className="bg-brand-blue hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors">
          Create Instance
        </button>
      </div>

      {/* Instances Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockInstances.map((instance) => (
          <Link 
            key={instance.id}
            href={`/instances/${instance.id}`}
            className="block bg-dark-lighter rounded-lg border border-dark-border hover:border-gray-600 transition-colors"
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{instance.name}</h3>
                  <p className="text-gray-400 text-sm mt-1">{instance.description}</p>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {instance.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Type</p>
                  <p className="font-medium">{instance.type}</p>
                </div>
                <div>
                  <p className="text-gray-400">Data Sources</p>
                  <p className="font-medium">{instance.dataSources}</p>
                </div>
                <div>
                  <p className="text-gray-400">Last Synced</p>
                  <p className="font-medium">{instance.lastSynced}</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-[#1e1e1e] border-t border-dark-border rounded-b-lg">
              <div className="flex items-center text-brand-blue">
                <span>View Details</span>
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
} 