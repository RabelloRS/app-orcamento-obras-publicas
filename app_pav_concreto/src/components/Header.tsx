
import React from 'react';
import './Header.css';

interface HeaderProps {
  projectName: string;
}

function Header({ projectName }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-brand">
        <div className="header-logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 21h18M3 7v14M21 7v14M6 7V4a1 1 0 011-1h10a1 1 0 011 1v3M6 7h12M9 11h6M9 15h6" />
          </svg>
        </div>
        <div className="header-title">
          <h1>PaveDim Pro</h1>
          <span className="header-subtitle">Dimensionamento de Pavimentos</span>
        </div>
      </div>
      <div className="header-project">
        <span className="project-label">Projeto:</span>
        <span className="project-name">{projectName}</span>
      </div>
      <div className="header-actions">
        <button className="header-btn" title="Novo Projeto">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
        <button className="header-btn" title="Salvar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
            <path d="M17 21v-8H7v8M7 3v5h8" />
          </svg>
        </button>
      </div>
    </header>
  );
}

export default Header;
