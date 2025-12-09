
import React, { useState } from 'react';
import './InputPanel.css';
import { PavementData } from '../../types';
import ProjectInfo from './ProjectInfo';
import TrafficInput from './TrafficInput';
import SoilInput from './SoilInput';
import ClimateInput from './ClimateInput';
import GeometryInput from './GeometryInput';

interface InputPanelProps {
  data: PavementData;
  onChange: (data: Partial<PavementData>) => void;
  onCalculate: () => void;
}

function InputPanel({ data, onChange, onCalculate }: InputPanelProps) {
  const [activeSection, setActiveSection] = useState(0);

  const sections = [
    { id: 0, title: 'Informações do Projeto', component: ProjectInfo },
    { id: 1, title: 'Dados de Tráfego', component: TrafficInput },
    { id: 2, title: 'Dados do Solo', component: SoilInput },
    { id: 3, title: 'Clima e Drenagem', component: ClimateInput },
    { id: 4, title: 'Geometria da Via', component: GeometryInput }
  ];

  const isFormValid = () => {
    return (
      data.projectName.trim() !== '' &&
      data.trafficData.n8_2t > 0 &&
      data.soilData.cbrSubgrade > 0
    );
  };

  const handleNext = () => {
    if (activeSection < sections.length - 1) {
      setActiveSection(activeSection + 1);
    }
  };

  const handlePrev = () => {
    if (activeSection > 0) {
      setActiveSection(activeSection - 1);
    }
  };

  const ActiveComponent = sections[activeSection].component;

  return (
    <div className="input-panel">
      <div className="input-header">
        <h2>Dados de Entrada</h2>
        <p>Preencha as informações necessárias para o dimensionamento do pavimento</p>
      </div>

      <div className="input-progress">
        {sections.map((section, index) => (
          <div
            key={section.id}
            className={`progress-step ${index === activeSection ? 'active' : ''} ${index < activeSection ? 'completed' : ''}`}
            onClick={() => setActiveSection(index)}
          >
            <div className="step-number">{index + 1}</div>
            <span className="step-title">{section.title}</span>
          </div>
        ))}
      </div>

      <div className="input-content">
        <div className="section-card">
          <h3 className="section-title">{sections[activeSection].title}</h3>
          <ActiveComponent data={data} onChange={onChange} />
        </div>
      </div>

      <div className="input-actions">
        <button 
          className="btn btn-secondary" 
          onClick={handlePrev}
          disabled={activeSection === 0}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Anterior
        </button>

        <div className="action-center">
          {activeSection === sections.length - 1 && (
            <button 
              className="btn btn-primary btn-lg"
              onClick={onCalculate}
              disabled={!isFormValid()}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4" />
                <circle cx="12" cy="12" r="10" />
              </svg>
              Calcular Pavimento
            </button>
          )}
        </div>

        <button 
          className="btn btn-secondary" 
          onClick={handleNext}
          disabled={activeSection === sections.length - 1}
        >
          Próximo
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default InputPanel;
