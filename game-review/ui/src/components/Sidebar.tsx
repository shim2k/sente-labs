import React from 'react';
import { useIdentity } from '../context/IdentityContext';

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onPageChange }) => {
  const { identityStatus } = useIdentity();
  
  const menuItems = [
    {
      id: 'games',
      label: 'Games',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2L2 7v10c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-10-5z"/>
        </svg>
      )
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 15.5A3.5 3.5 0 018.5 12A3.5 3.5 0 0112 8.5a3.5 3.5 0 013.5 3.5 3.5 3.5 0 01-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97s-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0014 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.66-.07 1s.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z"/>
        </svg>
      )
    }
  ];

  return (
    <div className="w-64 bg-gray-900 border-r border-gray-800 h-full flex flex-col">
      {/* Sidebar Header */}
      <div className="p-6 border-b border-gray-800">
        <h2 className="text-lg font-semibold text-gray-200">Navigation</h2>
        <p className="text-sm text-gray-400 mt-1">Manage your AOE4 matches</p>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onPageChange(item.id)}
            className={`w-full flex items-center px-4 py-3 rounded-lg text-left transition-all duration-200 ${
              currentPage === item.id
                ? 'bg-gradient-to-r from-orange-600/20 to-red-600/20 border border-orange-500/30 text-orange-300 shadow-lg shadow-orange-500/10'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800 border border-transparent'
            }`}
          >
            <div className={`transition-colors duration-200 mr-3 ${
              currentPage === item.id ? 'text-orange-400' : 'text-gray-500'
            }`}>
              {item.icon}
            </div>
            <span className="font-medium">{item.label}</span>
            
            {/* Steam linked indicator */}
            {item.id === 'settings' && !identityStatus.loading && identityStatus.steamLinked && (
              <div className="ml-auto flex items-center" title="Steam account linked">
                <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center space-x-2 text-xs text-gray-500">
          <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
          <span>AOE4 Game Review v1.0</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;