import React from 'react';

// Temporary mock data
const mockKPIs = [
  { title: 'Active Instances', value: '5', change: '+1 this week' },
  { title: 'Total Queries', value: '1,245', change: '+23% vs last week' },
  { title: 'Avg Response Time', value: '1.2s', change: '-0.3s vs last week' },
  { title: 'Data Sources', value: '12', change: '2 pending sync' },
];

const mockInstances = [
  { id: 1, name: 'Public Docs', type: 'External', dataSources: 3, lastSynced: '2h ago', status: 'Active' },
  { id: 2, name: 'Internal KB', type: 'Internal', dataSources: 5, lastSynced: '1h ago', status: 'Active' },
];

function KPICard({ title, value, change }: { title: string; value: string; change: string }) {
  return (
    <div className="bg-dark-lighter p-6 rounded-lg border border-dark-border">
      <h3 className="text-gray-400 text-sm font-medium">{title}</h3>
      <p className="text-2xl font-bold mt-2 text-white">{value}</p>
      <p className="text-sm text-gray-400 mt-1">{change}</p>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <button className="bg-brand-blue hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors">
          Add Instance
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {mockKPIs.map((kpi, index) => (
          <KPICard key={index} {...kpi} />
        ))}
      </div>

      {/* Analytics Preview */}
      <div className="bg-dark-lighter p-6 rounded-lg border border-dark-border mb-8">
        <h2 className="text-lg font-semibold mb-4">Query Activity</h2>
        <div className="h-64 flex items-center justify-center text-gray-400">
          [Analytics Chart Placeholder]
        </div>
      </div>

      {/* Instances Table */}
      <div className="bg-dark-lighter rounded-lg border border-dark-border">
        <div className="p-4 border-b border-dark-border">
          <h2 className="text-lg font-semibold">Your Instances</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#1e1e1e]">
              <tr>
                <th className="text-left p-4 text-gray-400 font-medium">Name</th>
                <th className="text-left p-4 text-gray-400 font-medium">Type</th>
                <th className="text-left p-4 text-gray-400 font-medium">Data Sources</th>
                <th className="text-left p-4 text-gray-400 font-medium">Last Synced</th>
                <th className="text-left p-4 text-gray-400 font-medium">Status</th>
                <th className="text-left p-4 text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {mockInstances.map((instance) => (
                <tr key={instance.id} className="border-t border-dark-border hover:bg-[#2f2f2f] transition-colors">
                  <td className="p-4">{instance.name}</td>
                  <td className="p-4">{instance.type}</td>
                  <td className="p-4">{instance.dataSources}</td>
                  <td className="p-4">{instance.lastSynced}</td>
                  <td className="p-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {instance.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <button className="text-brand-blue hover:text-blue-400 transition-colors">
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 