
import React from 'react';
import './Sidebar.css';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: 'input' | 'results' | 'drawing' | 'report') => void;
  isCalculated: boolean;
}

function Sidebar({ activeTab, setActiveTab, isCalculated }: SidebarProps) {
  const tabs = [
    { id: 'input', label: 'Dados de Entrada', icon: 'edit', always: true },
    { id: 'results', label: 'Resultados', icon: 'chart', always: false },
    { id: 'drawing', label: 'Desenho Técnico', icon: 'layers', always: false },
    { id: 'report', label: 'Relatório', icon: 'document', always: false }
  ];

  const getIcon = (icon: string) => {
    switch (icon) {
      case 'edit':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        );
      case 'chart':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 20V10M12 20V4M6 20v-6" />
          </svg>
        );
      case 'layers':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        );
      case 'document':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`sidebar-item ${activeTab === tab.id ? 'active' : ''} ${!tab.always && !isCalculated ? 'disabled' : ''}`}
            onClick={() => (tab.always || isCalculated) && setActiveTab(tab.id as any)}
            disabled={!tab.always && !isCalculated}
          >
            <span className="sidebar-icon">{getIcon(tab.icon)}</span>
            <span className="sidebar-label">{tab.label}</span>
            {!tab.always && !isCalculated && (
              <span className="sidebar-lock">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              </span>
            )}
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-help">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" />
          </svg>
          <span>Ajuda</span>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
