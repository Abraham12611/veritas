'use client';

import { useState } from 'react';
import Link from 'next/link';

export function Navbar() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <nav className="h-14 flex items-center justify-between bg-[#1f1f1f] border-b border-gray-800 px-4 fixed top-0 left-0 right-0 z-50">
      {/* Left: Logo */}
      <div className="flex items-center">
        <Link href="/dashboard" className="font-bold text-xl text-white hover:text-gray-300 transition-colors">
          Veritas
        </Link>
      </div>

      {/* Right: Profile & Notifications */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="text-gray-300 hover:text-white transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>

        {/* Profile Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
              <span className="text-sm">U</span>
            </div>
          </button>

          {/* Dropdown Menu */}
          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-[#2a2a2a] rounded-md shadow-lg py-1 border border-gray-700">
              <Link href="/settings" className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">
                Settings
              </Link>
              <button className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar; 