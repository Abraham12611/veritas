'use client';

import React, { useState } from 'react';

const tabs = [
  { id: 'account', label: 'Account' },
  { id: 'security', label: 'Security' },
  { id: 'team', label: 'Team' },
  { id: 'billing', label: 'Billing' },
];

// Mock data
const mockUser = {
  name: 'John Doe',
  email: 'john@example.com',
  company: 'Acme Inc',
  role: 'Admin',
  plan: 'Enterprise',
};

const mockTeamMembers = [
  { id: 1, name: 'Sarah Wilson', email: 'sarah@example.com', role: 'Admin', status: 'Active' },
  { id: 2, name: 'Mike Johnson', email: 'mike@example.com', role: 'Editor', status: 'Active' },
  { id: 3, name: 'Emily Brown', email: 'emily@example.com', role: 'Viewer', status: 'Pending' },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('account');

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-gray-400 mt-1">Manage your account, security, and team preferences</p>
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
      <div className="max-w-4xl">
        {activeTab === 'account' && (
          <div className="space-y-6">
            <div className="bg-dark-lighter rounded-lg border border-dark-border p-6">
              <h2 className="text-lg font-semibold mb-4">Account Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    defaultValue={mockUser.name}
                    className="w-full bg-[#1e1e1e] border border-dark-border rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    defaultValue={mockUser.email}
                    className="w-full bg-[#1e1e1e] border border-dark-border rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    defaultValue={mockUser.company}
                    className="w-full bg-[#1e1e1e] border border-dark-border rounded-md px-3 py-2"
                  />
                </div>
              </div>
              <div className="mt-4">
                <button className="bg-brand-blue hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors">
                  Save Changes
                </button>
              </div>
            </div>

            <div className="bg-dark-lighter rounded-lg border border-dark-border p-6">
              <h2 className="text-lg font-semibold mb-4">Delete Account</h2>
              <p className="text-gray-400 mb-4">
                Once you delete your account, there is no going back. Please be certain.
              </p>
              <button className="text-red-500 hover:text-red-400 transition-colors">
                Delete Account
              </button>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            <div className="bg-dark-lighter rounded-lg border border-dark-border p-6">
              <h2 className="text-lg font-semibold mb-4">Change Password</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    className="w-full bg-[#1e1e1e] border border-dark-border rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    className="w-full bg-[#1e1e1e] border border-dark-border rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    className="w-full bg-[#1e1e1e] border border-dark-border rounded-md px-3 py-2"
                  />
                </div>
              </div>
              <div className="mt-4">
                <button className="bg-brand-blue hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors">
                  Update Password
                </button>
              </div>
            </div>

            <div className="bg-dark-lighter rounded-lg border border-dark-border p-6">
              <h2 className="text-lg font-semibold mb-4">Two-Factor Authentication</h2>
              <p className="text-gray-400 mb-4">
                Add an extra layer of security to your account by enabling two-factor authentication.
              </p>
              <button className="bg-brand-blue hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors">
                Enable 2FA
              </button>
            </div>
          </div>
        )}

        {activeTab === 'team' && (
          <div className="bg-dark-lighter rounded-lg border border-dark-border">
            <div className="p-4 border-b border-dark-border flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold">Team Members</h2>
                <p className="text-gray-400 text-sm mt-1">Manage your team's access and roles</p>
              </div>
              <button className="bg-brand-blue hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors">
                Invite Member
              </button>
            </div>
            <div className="p-4">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-400">
                    <th className="pb-2 font-medium">Name</th>
                    <th className="pb-2 font-medium">Email</th>
                    <th className="pb-2 font-medium">Role</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mockTeamMembers.map((member) => (
                    <tr key={member.id} className="border-t border-dark-border">
                      <td className="py-3">{member.name}</td>
                      <td className="py-3 text-gray-400">{member.email}</td>
                      <td className="py-3">
                        <select className="bg-[#1e1e1e] border border-dark-border rounded-md px-2 py-1 text-sm">
                          <option>Admin</option>
                          <option>Editor</option>
                          <option>Viewer</option>
                        </select>
                      </td>
                      <td className="py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          member.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {member.status}
                        </span>
                      </td>
                      <td className="py-3">
                        <button className="text-red-500 hover:text-red-400 transition-colors text-sm">
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="space-y-6">
            <div className="bg-dark-lighter rounded-lg border border-dark-border p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-lg font-semibold">Current Plan</h2>
                  <p className="text-gray-400 mt-1">You are currently on the {mockUser.plan} plan</p>
                </div>
                <button className="bg-brand-blue hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors">
                  Upgrade Plan
                </button>
              </div>
              <div className="mt-4 p-4 bg-[#1e1e1e] rounded-md">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400">Next billing date</span>
                  <span>March 1, 2024</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Monthly amount</span>
                  <span>$199.00</span>
                </div>
              </div>
            </div>

            <div className="bg-dark-lighter rounded-lg border border-dark-border p-6">
              <h2 className="text-lg font-semibold mb-4">Payment Method</h2>
              <div className="flex items-center justify-between p-4 bg-[#1e1e1e] rounded-md">
                <div className="flex items-center">
                  <div className="text-gray-400">Visa ending in 4242</div>
                </div>
                <button className="text-brand-blue hover:text-blue-400 transition-colors">
                  Update
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 