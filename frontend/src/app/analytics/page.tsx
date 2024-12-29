'use client';

import React, { useState } from 'react';

// Mock data
const mockStats = {
  totalQueries: '15.2k',
  avgResponseTime: '1.1s',
  successRate: '98.5%',
  activeUsers: '342',
};

const mockInstanceStats = [
  { name: 'Public Docs', queries: 8234, responseTime: 1.2 },
  { name: 'Internal KB', queries: 4521, responseTime: 0.9 },
  { name: 'Support Bot', queries: 2445, responseTime: 1.1 },
];

const mockTopQuestions = [
  { question: 'How do I reset my password?', count: 145, instance: 'Public Docs' },
  { question: 'What are the system requirements?', count: 98, instance: 'Public Docs' },
  { question: 'How do I configure SSO?', count: 76, instance: 'Internal KB' },
  { question: 'Where can I find API documentation?', count: 67, instance: 'Public Docs' },
  { question: 'How do I update my billing information?', count: 54, instance: 'Support Bot' },
];

const mockDataSourceStats = [
  { name: 'GitHub Docs', documentsCount: 256, queriesCount: 3421 },
  { name: 'Confluence Wiki', documentsCount: 189, queriesCount: 2876 },
  { name: 'Zendesk Tickets', documentsCount: 1205, queriesCount: 1543 },
];

function StatCard({ title, value, change }: { title: string; value: string; change?: string }) {
  return (
    <div className="bg-dark-lighter p-6 rounded-lg border border-dark-border">
      <h3 className="text-gray-400 text-sm font-medium">{title}</h3>
      <p className="text-2xl font-bold mt-2 text-white">{value}</p>
      {change && <p className="text-sm text-gray-400 mt-1">{change}</p>}
    </div>
  );
}

function TimeRangeSelector() {
  return (
    <div className="flex items-center gap-2">
      <button className="px-3 py-1.5 text-sm bg-brand-blue text-white rounded-md">Last 7 Days</button>
      <button className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors">Last 30 Days</button>
      <button className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors">Last 90 Days</button>
      <button className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors">Custom</button>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-gray-400 mt-1">Monitor usage and performance across your instances</p>
        </div>
        <TimeRangeSelector />
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Queries" value={mockStats.totalQueries} change="+12.3% vs last period" />
        <StatCard title="Avg Response Time" value={mockStats.avgResponseTime} change="-0.2s vs last period" />
        <StatCard title="Success Rate" value={mockStats.successRate} />
        <StatCard title="Active Users" value={mockStats.activeUsers} change="+24 vs last period" />
      </div>

      {/* Instance Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-dark-lighter rounded-lg border border-dark-border p-6">
          <h2 className="text-lg font-semibold mb-4">Instance Performance</h2>
          <div className="space-y-4">
            {mockInstanceStats.map((instance) => (
              <div key={instance.name} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{instance.name}</p>
                  <p className="text-sm text-gray-400">{instance.queries.toLocaleString()} queries</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{instance.responseTime}s</p>
                  <p className="text-sm text-gray-400">avg response time</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-dark-lighter rounded-lg border border-dark-border p-6">
          <h2 className="text-lg font-semibold mb-4">Data Source Usage</h2>
          <div className="space-y-4">
            {mockDataSourceStats.map((source) => (
              <div key={source.name} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{source.name}</p>
                  <p className="text-sm text-gray-400">{source.documentsCount} documents</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{source.queriesCount.toLocaleString()}</p>
                  <p className="text-sm text-gray-400">queries</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Questions */}
      <div className="bg-dark-lighter rounded-lg border border-dark-border">
        <div className="p-4 border-b border-dark-border">
          <h2 className="text-lg font-semibold">Top Questions</h2>
          <p className="text-gray-400 text-sm mt-1">Most frequently asked questions across all instances</p>
        </div>
        <div className="p-4">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-400">
                <th className="pb-2 font-medium">Question</th>
                <th className="pb-2 font-medium">Instance</th>
                <th className="pb-2 font-medium text-right">Count</th>
              </tr>
            </thead>
            <tbody>
              {mockTopQuestions.map((item, index) => (
                <tr key={index} className="border-t border-dark-border">
                  <td className="py-3">{item.question}</td>
                  <td className="py-3 text-gray-400">{item.instance}</td>
                  <td className="py-3 text-right">{item.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 