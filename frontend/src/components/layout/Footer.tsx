import React from 'react';

export function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 h-8 bg-[#1f1f1f] border-t border-gray-800 flex items-center justify-center text-sm text-gray-400">
      <p>© {new Date().getFullYear()} Veritas. All rights reserved.</p>
    </footer>
  );
}

export default Footer; 