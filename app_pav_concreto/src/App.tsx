
import React, { useState } from 'react';
import './App.css';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import InputPanel from './features/input/InputPanel';
import ResultsPanel from './features/results/ResultsPanel';
import DrawingPanel from './features/drawing/DrawingPanel';
import ReportPanel from './features/report/ReportPanel';
import { PavementData, CalculationResults } from './types';
import { calculatePavement } from './utils/calculations';

function App() {
  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'drawing' | 'report'>('input');
  const [pavementData, setPavementData] = useState<PavementData>({
    projectName: '',
    projectLocation: '',
    engineer: '',
    date: new Date().toISOString().split('T')[0],
    trafficData: {
      n8_2t: 1e6,
      growthRate: 3,
      designPeriod: 10,
      trafficClass: 'medium'
    },
    soilData: {
      cbrSubgrade: 5,
      cbrSubbase: 20,
      cbrBase: 80,
      soilType: 'clay'
    },
    climateData: {
      rainfall: 'medium',
      temperature: 'moderate',
      drainageCondition: 'good'
    },
    geometryData: {
      laneWidth: 3.5,
      numberOfLanes: 2,
      shoulderWidth: 2.5,
      totalLength: 1000
    }
  });
  const [results, setResults] = useState<CalculationResults | null>(null);
  const [isCalculated, setIsCalculated] = useState(false);

  const handleCalculate = () => {
    const calculationResults = calculatePavement(pavementData);
    setResults(calculationResults);
    setIsCalculated(true);
    setActiveTab('results');
  };

  const handleDataChange = (newData: Partial<PavementData>) => {
    setPavementData(prev => ({ ...prev, ...newData }));
    setIsCalculated(false);
  };

  return (
    <div className="app">
      <Header projectName={pavementData.projectName || 'Novo Projeto'} />
      <div className="app-content">
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab}
          isCalculated={isCalculated}
        />
        <main className="main-panel">
          {activeTab === 'input' && (
            <InputPanel 
              data={pavementData} 
              onChange={handleDataChange}
              onCalculate={handleCalculate}
            />
          )}
          {activeTab === 'results' && results && (
            <ResultsPanel results={results} data={pavementData} />
          )}
          {activeTab === 'drawing' && results && (
            <DrawingPanel results={results} data={pavementData} />
          )}
          {activeTab === 'report' && results && (
            <ReportPanel results={results} data={pavementData} />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
