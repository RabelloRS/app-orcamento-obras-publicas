
import React from 'react';
import { PavementData } from '../../types';

interface ClimateInputProps {
  data: PavementData;
  onChange: (data: Partial<PavementData>) => void;
}

function ClimateInput({ data, onChange }: ClimateInputProps) {
  const handleChange = (field: string, value: string) => {
    onChange({
      climateData: {
        ...data.climateData,
        [field]: value
      }
    });
  };

  return (
    <div className="form-grid">
      <div className="form-group">
        <label className="form-label">Regime Pluviométrico</label>
        <select
          className="form-select"
          value={data.climateData.rainfall}
          onChange={(e) => handleChange('rainfall', e.target.value)}
        >
          <option value="low">Baixo (&lt; 1000 mm/ano)</option>
          <option value="medium">Médio (1000 - 1800 mm/ano)</option>
          <option value="high">Alto (&gt; 1800 mm/ano)</option>
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Temperatura Média</label>
        <select
          className="form-select"
          value={data.climateData.temperature}
          onChange={(e) => handleChange('temperature', e.target.value)}
        >
          <option value="cold">Fria (&lt; 15°C)</option>
          <option value="moderate">Moderada (15 - 25°C)</option>
          <option value="hot">Quente (&gt; 25°C)</option>
        </select>
      </div>

      <div className="form-group full-width">
        <label className="form-label">Condição de Drenagem</label>
        <select
          className="form-select"
          value={data.climateData.drainageCondition}
          onChange={(e) => handleChange('drainageCondition', e.target.value)}
        >
          <option value="excellent">Excelente - Água removida em 2 horas</option>
          <option value="good">Boa - Água removida em 1 dia</option>
          <option value="fair">Regular - Água removida em 1 semana</option>
          <option value="poor">Ruim - Água não é removida</option>
        </select>
      </div>

      <div className="info-card full-width">
        <h4>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          Importância da Drenagem
        </h4>
        <p>
          A drenagem adequada é essencial para a durabilidade do pavimento. A presença de água nas 
          camadas estruturais pode reduzir significativamente a capacidade de suporte e acelerar 
          a deterioração. O coeficiente de drenagem (m) varia de 0.4 (ruim) a 1.4 (excelente).
        </p>
      </div>
    </div>
  );
}

export default ClimateInput;
