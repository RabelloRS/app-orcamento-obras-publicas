
import React from 'react';
import { PavementData } from '../../types';

interface SoilInputProps {
  data: PavementData;
  onChange: (data: Partial<PavementData>) => void;
}

function SoilInput({ data, onChange }: SoilInputProps) {
  const handleChange = (field: string, value: number | string) => {
    onChange({
      soilData: {
        ...data.soilData,
        [field]: value
      }
    });
  };

  const getCBRClassification = (cbr: number): { label: string; color: string } => {
    if (cbr < 2) return { label: 'Muito Ruim', color: '#ef4444' };
    if (cbr < 5) return { label: 'Ruim', color: '#f97316' };
    if (cbr < 10) return { label: 'Regular', color: '#eab308' };
    if (cbr < 20) return { label: 'Bom', color: '#22c55e' };
    return { label: 'Excelente', color: '#10b981' };
  };

  const subgradeClass = getCBRClassification(data.soilData.cbrSubgrade);

  return (
    <div className="form-grid">
      <div className="form-group">
        <label className="form-label">CBR do Subleito *</label>
        <div className="input-with-unit">
          <input
            type="number"
            className="form-input"
            value={data.soilData.cbrSubgrade}
            onChange={(e) => handleChange('cbrSubgrade', parseFloat(e.target.value) || 0)}
            min="1"
            max="100"
            step="0.5"
          />
          <span className="input-unit">%</span>
        </div>
        <span className="form-hint" style={{ color: subgradeClass.color }}>
          Classificação: {subgradeClass.label}
        </span>
      </div>

      <div className="form-group">
        <label className="form-label">Tipo de Solo</label>
        <select
          className="form-select"
          value={data.soilData.soilType}
          onChange={(e) => handleChange('soilType', e.target.value)}
        >
          <option value="gravel">Pedregulho / Cascalho</option>
          <option value="sand">Areia</option>
          <option value="silt">Silte</option>
          <option value="clay">Argila</option>
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">CBR da Sub-base</label>
        <div className="input-with-unit">
          <input
            type="number"
            className="form-input"
            value={data.soilData.cbrSubbase}
            onChange={(e) => handleChange('cbrSubbase', parseFloat(e.target.value) || 0)}
            min="10"
            max="100"
            step="1"
          />
          <span className="input-unit">%</span>
        </div>
        <span className="form-hint">Mínimo recomendado: 20%</span>
      </div>

      <div className="form-group">
        <label className="form-label">CBR da Base</label>
        <div className="input-with-unit">
          <input
            type="number"
            className="form-input"
            value={data.soilData.cbrBase}
            onChange={(e) => handleChange('cbrBase', parseFloat(e.target.value) || 0)}
            min="50"
            max="100"
            step="1"
          />
          <span className="input-unit">%</span>
        </div>
        <span className="form-hint">Mínimo recomendado: 80%</span>
      </div>

      <div className="info-card full-width">
        <h4>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          Sobre o CBR
        </h4>
        <p>
          O CBR (California Bearing Ratio) é um índice que expressa a capacidade de suporte do solo, 
          comparado a uma brita padrão. Valores típicos: argilas moles (2-4%), argilas rijas (5-8%), 
          areias (10-25%), pedregulhos (25-80%).
        </p>
      </div>
    </div>
  );
}

export default SoilInput;
