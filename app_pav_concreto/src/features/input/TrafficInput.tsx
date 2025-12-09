
import React from 'react';
import { PavementData } from '../../types';

interface TrafficInputProps {
  data: PavementData;
  onChange: (data: Partial<PavementData>) => void;
}

function TrafficInput({ data, onChange }: TrafficInputProps) {
  const handleChange = (field: string, value: number | string) => {
    onChange({
      trafficData: {
        ...data.trafficData,
        [field]: value
      }
    });
  };

  const formatScientific = (num: number): string => {
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)} × 10⁶`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)} × 10³`;
    return num.toString();
  };

  return (
    <div className="form-grid">
      <div className="form-group">
        <label className="form-label">Número N (eixo padrão 8,2t) *</label>
        <div className="input-with-unit">
          <input
            type="number"
            className="form-input"
            value={data.trafficData.n8_2t}
            onChange={(e) => handleChange('n8_2t', parseFloat(e.target.value) || 0)}
            min="0"
            step="100000"
          />
          <span className="input-unit">solicit.</span>
        </div>
        <span className="form-hint">Atual: {formatScientific(data.trafficData.n8_2t)}</span>
      </div>

      <div className="form-group">
        <label className="form-label">Taxa de Crescimento Anual</label>
        <div className="input-with-unit">
          <input
            type="number"
            className="form-input"
            value={data.trafficData.growthRate}
            onChange={(e) => handleChange('growthRate', parseFloat(e.target.value) || 0)}
            min="0"
            max="15"
            step="0.5"
          />
          <span className="input-unit">%</span>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Período de Projeto</label>
        <div className="input-with-unit">
          <input
            type="number"
            className="form-input"
            value={data.trafficData.designPeriod}
            onChange={(e) => handleChange('designPeriod', parseInt(e.target.value) || 0)}
            min="5"
            max="30"
          />
          <span className="input-unit">anos</span>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Classe de Tráfego</label>
        <select
          className="form-select"
          value={data.trafficData.trafficClass}
          onChange={(e) => handleChange('trafficClass', e.target.value)}
        >
          <option value="light">Leve (N &lt; 10⁶)</option>
          <option value="medium">Médio (10⁶ ≤ N &lt; 5×10⁶)</option>
          <option value="heavy">Pesado (5×10⁶ ≤ N &lt; 10⁷)</option>
          <option value="veryHeavy">Muito Pesado (N ≥ 10⁷)</option>
        </select>
      </div>

      <div className="info-card full-width">
        <h4>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          Sobre o Número N
        </h4>
        <p>
          O número N representa a quantidade equivalente de solicitações do eixo padrão (8,2 toneladas) 
          durante o período de projeto. É calculado considerando o volume de tráfego, composição da frota 
          e fatores de equivalência de carga.
        </p>
      </div>
    </div>
  );
}

export default TrafficInput;
