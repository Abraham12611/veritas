'use client';

import React, { useState } from 'react';

const deploymentTypes = [
  {
    id: 'widget',
    name: 'Website Widget',
    description: 'Embed an AI-powered chat widget on your documentation or product pages.',
    status: 'Active',
    instance: 'Public Docs',
    stats: {
      queries: '1.2k',
      avgResponseTime: '1.1s',
    },
  },
  {
    id: 'slack',
    name: 'Slack Bot',
    description: 'Add Veritas to your Slack workspace for instant documentation search.',
    status: 'Not Connected',
    instance: null,
    stats: null,
  },
  {
    id: 'discord',
    name: 'Discord Bot',
    description: 'Deploy Veritas in your Discord server to help community members.',
    status: 'Not Connected',
    instance: null,
    stats: null,
  },
  {
    id: 'zendesk',
    name: 'Zendesk App',
    description: 'Empower support agents with AI-powered answers from your knowledge base.',
    status: 'Active',
    instance: 'Internal KB',
    stats: {
      queries: '450',
      avgResponseTime: '0.9s',
    },
  },
  {
    id: 'api',
    name: 'API Integration',
    description: 'Access Veritas programmatically through our REST API.',
    status: 'Active',
    instance: 'Public Docs',
    stats: {
      queries: '5.6k',
      avgResponseTime: '0.8s',
    },
  },
];

function DeploymentCard({ deployment }: { deployment: typeof deploymentTypes[0] }) {
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  return (
    <div className="bg-dark-lighter rounded-lg border border-dark-border">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold">{deployment.name}</h3>
            <p className="text-gray-400 text-sm mt-1">{deployment.description}</p>
          </div>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            deployment.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
            {deployment.status}
          </span>
        </div>

        {deployment.stats && (
          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div>
              <p className="text-gray-400">Queries (30d)</p>
              <p className="font-medium">{deployment.stats.queries}</p>
            </div>
            <div>
              <p className="text-gray-400">Avg Response Time</p>
              <p className="font-medium">{deployment.stats.avgResponseTime}</p>
            </div>
          </div>
        )}

        {deployment.instance && (
          <div className="text-sm text-gray-400 mb-4">
            Connected to <span className="text-white">{deployment.instance}</span>
          </div>
        )}
      </div>

      <div className="px-6 py-4 bg-[#1e1e1e] border-t border-dark-border rounded-b-lg">
        <button
          onClick={() => setIsConfigOpen(true)}
          className="text-brand-blue hover:text-blue-400 transition-colors text-sm font-medium"
        >
          {deployment.status === 'Active' ? 'Configure' : 'Set Up Now'}
        </button>
      </div>

      {/* Configuration Modal */}
      {isConfigOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-dark-lighter rounded-lg border border-dark-border p-6 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">{deployment.name} Configuration</h2>
              <button
                onClick={() => setIsConfigOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {deployment.id === 'widget' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Instance
                  </label>
                  <select className="w-full bg-[#1e1e1e] border border-dark-border rounded-md px-3 py-2">
                    <option>Public Docs</option>
                    <option>Internal KB</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Widget Title
                  </label>
                  <input
                    type="text"
                    placeholder="Ask about our product"
                    className="w-full bg-[#1e1e1e] border border-dark-border rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Embed Code
                  </label>
                  <pre className="bg-[#1e1e1e] p-3 rounded-md text-sm text-gray-300 font-mono">
                    {`<script src="https://veritas.ai/widget.js"></script>
<script>
  Veritas.init({
    instanceId: "xxx",
    theme: "dark"
  });
</script>`}
                  </pre>
                  <button className="mt-2 text-brand-blue hover:text-blue-400 transition-colors text-sm">
                    Copy Code
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsConfigOpen(false)}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button className="bg-brand-blue hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DeploymentsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Deployments</h1>
        <p className="text-gray-400 mt-1">Configure how users interact with your Veritas instances</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {deploymentTypes.map((deployment) => (
          <DeploymentCard key={deployment.id} deployment={deployment} />
        ))}
      </div>
    </div>
  );
} 