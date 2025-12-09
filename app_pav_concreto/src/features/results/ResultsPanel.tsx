
import React from 'react';
import './ResultsPanel.css';
import { CalculationResults, PavementData } from '../../types';

interface ResultsPanelProps {
  results: CalculationResults;
  data: PavementData;
}

function ResultsPanel({ results, data }: ResultsPanelProps) {
  const formatNumber = (num: number, decimals: number = 2): string => {
    return num.toLocaleString('pt-BR', { 
      minimumFractionDigits: decimals, 
      maximumFractionDigits: decimals 
    });
  };

  const formatScientific = (num: number): string => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)} × 10⁹`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)} × 10⁶`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)} × 10³`;
    return num.toFixed(2);
  };

  const totalWidth = data.geometryData.laneWidth * data.geometryData.numberOfLanes + 
                     data.geometryData.shoulderWidth * 2;
  const totalVolume = (results.totalThickness / 100) * totalWidth * data.geometryData.totalLength;

  return (
    <div className="results-panel">
      <div className="results-header">
        <h2>Resultados do Dimensionamento</h2>
        <p>Projeto: {data.projectName}</p>
      </div>

      <div className="results-summary">
        <div className="summary-card highlight">
          <div className="summary-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div className="summary-content">
            <span className="summary-label">Espessura Total</span>
            <span className="summary-value">{formatNumber(results.totalThickness, 1)} cm</span>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
          <div className="summary-content">
            <span className="summary-label">N de Projeto</span>
            <span className="summary-value">{formatScientific(results.designN)}</span>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
            </svg>
          </div>
          <div className="summary-content">
            <span className="summary-label">Número Estrutural</span>
            <span className="summary-value">{formatNumber(results.structuralNumber, 2)}</span>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
            </svg>
          </div>
          <div className="summary-content">
            <span className="summary-label">Volume Total</span>
            <span className="summary-value">{formatNumber(totalVolume, 0)} m³</span>
          </div>
        </div>
      </div>

      <div className="results-layers">
        <h3>Estrutura do Pavimento</h3>
        <div className="layers-visualization">
          {results.layers.map((layer, index) => (
            <div 
              key={index} 
              className={`layer-item layer-${layer.name.toLowerCase().replace(/\s/g, '-')}`}
              style={{ 
                height: `${Math.max(layer.thickness * 3, 40)}px`,
              }}
            >
              <div className="layer-info">
                <span className="layer-name">{layer.name}</span>
                <span className="layer-material">{layer.material}</span>
              </div>
              <div className="layer-details">
                <span className="layer-thickness">{formatNumber(layer.thickness, 1)} cm</span>
                <span className="layer-cbr">CBR: {layer.cbr}%</span>
              </div>
            </div>
          ))}
          <div className="layer-item layer-subleito">
            <div className="layer-info">
              <span className="layer-name">Subleito</span>
              <span className="layer-material">Solo Natural</span>
            </div>
            <div className="layer-details">
              <span className="layer-thickness">∞</span>
              <span className="layer-cbr">CBR: {data.soilData.cbrSubgrade}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="results-parameters">
        <h3>Parâmetros de Cálculo</h3>
        <div className="params-grid">
          <div className="param-item">
            <span className="param-label">Módulo de Resiliência (MR)</span>
            <span className="param-value">{formatNumber(results.subgradeModulus, 0)} psi</span>
          </div>
          <div className="param-item">
            <span className="param-label">Fator de Confiabilidade (R)</span>
            <span className="param-value">{(results.reliabilityFactor * 100).toFixed(0)}%</span>
          </div>
          <div className="param-item">
            <span className="param-label">Perda de Serventia (ΔPSI)</span>
            <span className="param-value">{formatNumber(results.serviceabilityLoss, 1)}</span>
          </div>
          <div className="param-item">
            <span className="param-label">Coef. de Drenagem (m)</span>
            <span className="param-value">{formatNumber(results.drainageCoefficient, 2)}</span>
          </div>
        </div>
      </div>

      <div className="results-materials">
        <h3>Quantitativo de Materiais</h3>
        <table className="materials-table">
          <thead>
            <tr>
              <th>Camada</th>
              <th>Material</th>
              <th>Espessura (cm)</th>
              <th>Volume (m³)</th>
              <th>Coeficiente</th>
            </tr>
          </thead>
          <tbody>
            {results.layers.map((layer, index) => {
              const layerVolume = (layer.thickness / 100) * totalWidth * data.geometryData.totalLength;
              return (
                <tr key={index}>
                  <td>{layer.name}</td>
                  <td>{layer.material}</td>
                  <td>{formatNumber(layer.thickness, 1)}</td>
                  <td>{formatNumber(layerVolume, 1)}</td>
                  <td>{formatNumber(layer.coefficient, 3)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2}><strong>Total</strong></td>
              <td><strong>{formatNumber(results.totalThickness, 1)}</strong></td>
              <td><strong>{formatNumber(totalVolume, 1)}</strong></td>
              <td>-</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default ResultsPanel;
