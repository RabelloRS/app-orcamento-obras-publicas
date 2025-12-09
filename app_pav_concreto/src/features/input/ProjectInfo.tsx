
import React from 'react';
import { PavementData } from '../../types';

interface ProjectInfoProps {
  data: PavementData;
  onChange: (data: Partial<PavementData>) => void;
}

function ProjectInfo({ data, onChange }: ProjectInfoProps) {
  return (
    <div className="form-grid">
      <div className="form-group full-width">
        <label className="form-label">Nome do Projeto *</label>
        <input
          type="text"
          className="form-input"
          value={data.projectName}
          onChange={(e) => onChange({ projectName: e.target.value })}
          placeholder="Ex: Rodovia Municipal XYZ - Trecho A"
        />
      </div>

      <div className="form-group full-width">
        <label className="form-label">Localização</label>
        <input
          type="text"
          className="form-input"
          value={data.projectLocation}
          onChange={(e) => onChange({ projectLocation: e.target.value })}
          placeholder="Ex: Município de São Paulo - SP"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Engenheiro Responsável</label>
        <input
          type="text"
          className="form-input"
          value={data.engineer}
          onChange={(e) => onChange({ engineer: e.target.value })}
          placeholder="Nome do engenheiro"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Data</label>
        <input
          type="date"
          className="form-input"
          value={data.date}
          onChange={(e) => onChange({ date: e.target.value })}
        />
      </div>

      <div className="info-card full-width">
        <h4>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          Informação
        </h4>
        <p>
          Este sistema utiliza o método do DNER (atual DNIT) para dimensionamento de pavimentos 
          flexíveis, baseado no número estrutural (SN) e nas características do tráfego e do solo.
        </p>
      </div>
    </div>
  );
}

export default ProjectInfo;
