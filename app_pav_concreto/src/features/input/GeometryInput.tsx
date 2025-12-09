
import React from 'react';
import { PavementData } from '../../types';

interface GeometryInputProps {
  data: PavementData;
  onChange: (data: Partial<PavementData>) => void;
}

function GeometryInput({ data, onChange }: GeometryInputProps) {
  const handleChange = (field: string, value: number) => {
    onChange({
      geometryData: {
        ...data.geometryData,
        [field]: value
      }
    });
  };

  const totalWidth = data.geometryData.laneWidth * data.geometryData.numberOfLanes + 
                     data.geometryData.shoulderWidth * 2;

  return (
    <div className="form-grid">
      <div className="form-group">
        <label className="form-label">Largura da Faixa</label>
        <div className="input-with-unit">
          <input
            type="number"
            className="form-input"
            value={data.geometryData.laneWidth}
            onChange={(e) => handleChange('laneWidth', parseFloat(e.target.value) || 0)}
            min="2.5"
            max="4.5"
            step="0.1"
          />
          <span className="input-unit">m</span>
        </div>
        <span className="form-hint">Típico: 3.5m (rodovias)</span>
      </div>

      <div className="form-group">
        <label className="form-label">Número de Faixas</label>
        <select
          className="form-select"
          value={data.geometryData.numberOfLanes}
          onChange={(e) => handleChange('numberOfLanes', parseInt(e.target.value))}
        >
          <option value={1}>1 faixa</option>
          <option value={2}>2 faixas</option>
          <option value={3}>3 faixas</option>
          <option value={4}>4 faixas</option>
          <option value={6}>6 faixas</option>
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Largura do Acostamento</label>
        <div className="input-with-unit">
          <input
            type="number"
            className="form-input"
            value={data.geometryData.shoulderWidth}
            onChange={(e) => handleChange('shoulderWidth', parseFloat(e.target.value) || 0)}
            min="0"
            max="4"
            step="0.25"
          />
          <span className="input-unit">m</span>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Extensão Total</label>
        <div className="input-with-unit">
          <input
            type="number"
            className="form-input"
            value={data.geometryData.totalLength}
            onChange={(e) => handleChange('totalLength', parseFloat(e.target.value) || 0)}
            min="100"
            step="100"
          />
          <span className="input-unit">m</span>
        </div>
      </div>

      <div className="info-card full-width">
        <h4>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
          </svg>
          Resumo Geométrico
        </h4>
        <p>
          <strong>Largura total da plataforma:</strong> {totalWidth.toFixed(2)} m<br />
          <strong>Área pavimentada:</strong> {(totalWidth * data.geometryData.totalLength).toLocaleString()} m²<br />
          <strong>Volume estimado de pavimento:</strong> será calculado após dimensionamento
        </p>
      </div>
    </div>
  );
}

export default GeometryInput;
