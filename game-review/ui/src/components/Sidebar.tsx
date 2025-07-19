import React from 'react';
import { useIdentity } from '../context/IdentityContext';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

interface ExtendedSidebarProps extends SidebarProps {
  onClose?: () => void;
}

const Sidebar: React.FC<ExtendedSidebarProps> = ({ currentPage, onPageChange, onClose }) => {
  const { identityStatus } = useIdentity();
  const { apiClient } = useAuth();
  const [isAdmin, setIsAdmin] = React.useState(false);

  // Check if user is admin by calling the backend
  React.useEffect(() => {
    const checkAdminStatus = async () => {
      if (!apiClient) return;

      try {
        await apiClient.get('/api/v1/admin/check');
        setIsAdmin(true);
      } catch (error) {
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [apiClient]);

  const menuItems = [
    {
      id: 'games',
      label: 'Games',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2L2 7v10c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-10-5z" />
        </svg>
      )
    },
    {
      id: 'reviews',
      label: 'Community Reviews',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 15.5A3.5 3.5 0 018.5 12A3.5 3.5 0 0112 8.5a3.5 3.5 0 013.5 3.5 3.5 3.5 0 01-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97s-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0014 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.66-.07 1s.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z" />
        </svg>
      )
    },
    {
      id: 'pricing',
      label: 'Pricing',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z" />
        </svg>
      )
    },
    {
      id: 'discord',
      label: 'Join Discord',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.211.375-.445.865-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
        </svg>
      ),
      isExternal: true,
      href: 'https://discord.gg/esEk55VS'
    },
  ];

  return (
    <div className="w-64 bg-gray-900 border-r border-gray-800 h-full flex flex-col">
      {/* Sidebar Header */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-200">Navigation</h2>
            <p className="text-sm text-gray-400 mt-1">Manage your AOE4 matches</p>
          </div>
          {/* Close button for mobile */}
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-2 text-gray-400 hover:text-white transition-all duration-200 hover:scale-110 active:scale-95 rounded-lg hover:bg-gray-800"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          // Handle external links differently
          if (item.isExternal) {
            return (
              <a
                key={item.id}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center px-4 py-3 rounded-lg text-left transition-all duration-200 text-gray-400 hover:text-purple-300 hover:bg-gradient-to-r hover:from-purple-600/10 hover:to-purple-700/10 border border-transparent hover:border-purple-500/20"
              >
                <div className="transition-colors duration-200 mr-3 text-purple-400">
                  {item.icon}
                </div>
                <span className="font-medium">{item.label}</span>
                <svg className="w-3 h-3 ml-auto text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </a>
            );
          }

          // Regular menu items
          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={`w-full flex items-center px-4 py-3 rounded-lg text-left transition-all duration-200 ${currentPage === item.id
                ? 'bg-gradient-to-r from-blue-600/20 to-blue-700/20 border border-blue-500/30 text-blue-300 shadow-lg shadow-blue-500/10'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800 border border-transparent'
                }`}
            >
              <div className={`transition-colors duration-200 mr-3 ${currentPage === item.id ? 'text-blue-400' : 'text-gray-500'
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
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center space-x-2 text-xs text-gray-500">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
          <span>AOE4 Game Review v1.0</span>
        </div>
        <button
          onClick={() => onPageChange('terms')}
          className="text-xs text-gray-500 hover:text-blue-400 transition-colors duration-200 underline mt-2"
        >
          Terms of Service
        </button>
      </div>
    </div>
  );
};

export default Sidebar;