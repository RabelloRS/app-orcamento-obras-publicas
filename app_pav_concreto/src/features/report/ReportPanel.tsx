
import React from 'react';
import './ReportPanel.css';
import { CalculationResults, PavementData } from '../../types';

interface ReportPanelProps {
  results: CalculationResults;
  data: PavementData;
}

function ReportPanel({ results, data }: ReportPanelProps) {
  const formatNumber = (num: number, decimals: number = 2): string => {
    return num.toLocaleString('pt-BR', { 
      minimumFractionDigits: decimals, 
      maximumFractionDigits: decimals 
    });
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const totalWidth = data.geometryData.laneWidth * data.geometryData.numberOfLanes + 
                     data.geometryData.shoulderWidth * 2;
  const totalVolume = (results.totalThickness / 100) * totalWidth * data.geometryData.totalLength;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="report-panel">
      <div className="report-actions no-print">
        <h2>Relatório Técnico</h2>
        <button className="btn btn-primary" onClick={handlePrint}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
          Imprimir Relatório
        </button>
      </div>

      <div className="report-content">
        {/* Header */}
        <div className="report-header">
          <div className="report-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 21h18M3 7v14M21 7v14M6 7V4a1 1 0 011-1h10a1 1 0 011 1v3M6 7h12M9 11h6M9 15h6" />
            </svg>
          </div>
          <div className="report-title-block">
            <h1>MEMORIAL DE CÁLCULO</h1>
            <h2>Dimensionamento de Pavimento Flexível</h2>
            <p>Método DNER/DNIT</p>
          </div>
        </div>

        {/* Project Info */}
        <section className="report-section">
          <h3>1. INFORMAÇÕES DO PROJETO</h3>
          <table className="report-table info-table">
            <tbody>
              <tr>
                <td><strong>Projeto:</strong></td>
                <td>{data.projectName}</td>
              </tr>
              <tr>
                <td><strong>Localização:</strong></td>
                <td>{data.projectLocation || 'Não especificada'}</td>
              </tr>
              <tr>
                <td><strong>Engenheiro Responsável:</strong></td>
                <td>{data.engineer || 'Não especificado'}</td>
              </tr>
              <tr>
                <td><strong>Data:</strong></td>
                <td>{formatDate(data.date)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Input Data */}
        <section className="report-section">
          <h3>2. DADOS DE ENTRADA</h3>
          
          <h4>2.1 Dados de Tráfego</h4>
          <table className="report-table">
            <tbody>
              <tr>
                <td>Número N (eixo padrão 8,2t):</td>
                <td>{results.designN.toExponential(2)} solicitações</td>
              </tr>
              <tr>
                <td>Taxa de crescimento anual:</td>
                <td>{data.trafficData.growthRate}%</td>
              </tr>
              <tr>
                <td>Período de projeto:</td>
                <td>{data.trafficData.designPeriod} anos</td>
              </tr>
            </tbody>
          </table>

          <h4>2.2 Dados do Solo</h4>
          <table className="report-table">
            <tbody>
              <tr>
                <td>CBR do subleito:</td>
                <td>{data.soilData.cbrSubgrade}%</td>
              </tr>
              <tr>
                <td>Tipo de solo:</td>
                <td>{data.soilData.soilType === 'clay' ? 'Argila' : 
                    data.soilData.soilType === 'sand' ? 'Areia' :
                    data.soilData.soilType === 'silt' ? 'Silte' : 'Pedregulho'}</td>
              </tr>
              <tr>
                <td>CBR da sub-base:</td>
                <td>{data.soilData.cbrSubbase}%</td>
              </tr>
              <tr>
                <td>CBR da base:</td>
                <td>{data.soilData.cbrBase}%</td>
              </tr>
            </tbody>
          </table>

          <h4>2.3 Geometria da Via</h4>
          <table className="report-table">
            <tbody>
              <tr>
                <td>Largura da faixa:</td>
                <td>{data.geometryData.laneWidth} m</td>
              </tr>
              <tr>
                <td>Número de faixas:</td>
                <td>{data.geometryData.numberOfLanes}</td>
              </tr>
              <tr>
                <td>Largura do acostamento:</td>
                <td>{data.geometryData.shoulderWidth} m</td>
              </tr>
              <tr>
                <td>Largura total:</td>
                <td>{formatNumber(totalWidth, 2)} m</td>
              </tr>
              <tr>
                <td>Extensão:</td>
                <td>{formatNumber(data.geometryData.totalLength, 0)} m</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Calculation Memory */}
        <section className="report-section">
          <h3>3. MEMÓRIA DE CÁLCULO</h3>
          
          {results.calculationSteps.map((step, index) => (
            <div key={index} className="calc-step">
              <h4>3.{index + 1} {step.title}</h4>
              <p className="step-explanation">{step.explanation}</p>
              
              <div className="formula-box">
                <div className="formula">{step.formula}</div>
              </div>
              
              {step.variables.length > 0 && (
                <div className="variables">
                  <p><strong>Onde:</strong></p>
                  <ul>
                    {step.variables.map((v, i) => (
                      <li key={i}>{v.name} = {v.value} {v.unit}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="result-box">
                <strong>Resultado:</strong> {step.result}
              </div>
            </div>
          ))}
        </section>

        {/* Results */}
        <section className="report-section">
          <h3>4. RESULTADOS DO DIMENSIONAMENTO</h3>
          
          <h4>4.1 Parâmetros Calculados</h4>
          <table className="report-table">
            <tbody>
              <tr>
                <td>Módulo de Resiliência do Subleito:</td>
                <td>{formatNumber(results.subgradeModulus, 0)} psi</td>
              </tr>
              <tr>
                <td>Número Estrutural (SN):</td>
                <td>{formatNumber(results.structuralNumber, 2)}</td>
              </tr>
              <tr>
                <td>Confiabilidade:</td>
                <td>{(results.reliabilityFactor * 100).toFixed(0)}%</td>
              </tr>
              <tr>
                <td>Perda de Serventia (ΔPSI):</td>
                <td>{formatNumber(results.serviceabilityLoss, 1)}</td>
              </tr>
              <tr>
                <td>Coeficiente de Drenagem:</td>
                <td>{formatNumber(results.drainageCoefficient, 2)}</td>
              </tr>
            </tbody>
          </table>

          <h4>4.2 Estrutura do Pavimento</h4>
          <table className="report-table layers-table">
            <thead>
              <tr>
                <th>Camada</th>
                <th>Material</th>
                <th>Espessura (cm)</th>
                <th>CBR (%)</th>
                <th>Coeficiente</th>
              </tr>
            </thead>
            <tbody>
              {results.layers.map((layer, index) => (
                <tr key={index}>
                  <td>{layer.name}</td>
                  <td>{layer.material}</td>
                  <td>{formatNumber(layer.thickness, 1)}</td>
                  <td>{layer.cbr}</td>
                  <td>{formatNumber(layer.coefficient, 3)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}><strong>TOTAL</strong></td>
                <td><strong>{formatNumber(results.totalThickness, 1)}</strong></td>
                <td colSpan={2}>-</td>
              </tr>
            </tfoot>
          </table>
        </section>

        {/* Quantities */}
        <section className="report-section">
          <h3>5. QUANTITATIVOS</h3>
          <table className="report-table">
            <thead>
              <tr>
                <th>Camada</th>
                <th>Espessura (cm)</th>
                <th>Área (m²)</th>
                <th>Volume (m³)</th>
              </tr>
            </thead>
            <tbody>
              {results.layers.map((layer, index) => {
                const area = totalWidth * data.geometryData.totalLength;
                const volume = (layer.thickness / 100) * area;
                return (
                  <tr key={index}>
                    <td>{layer.name}</td>
                    <td>{formatNumber(layer.thickness, 1)}</td>
                    <td>{formatNumber(area, 0)}</td>
                    <td>{formatNumber(volume, 1)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td><strong>TOTAL</strong></td>
                <td><strong>{formatNumber(results.totalThickness, 1)}</strong></td>
                <td><strong>{formatNumber(totalWidth * data.geometryData.totalLength, 0)}</strong></td>
                <td><strong>{formatNumber(totalVolume, 1)}</strong></td>
              </tr>
            </tfoot>
          </table>
        </section>

        {/* Conclusions */}
        <section className="report-section">
          <h3>6. CONCLUSÕES E RECOMENDAÇÕES</h3>
          <div className="conclusions">
            <p>
              Com base nos dados de entrada fornecidos e nos cálculos realizados segundo o método 
              DNER/DNIT para dimensionamento de pavimentos flexíveis, conclui-se que a estrutura 
              proposta atende aos requisitos de desempenho para o período de projeto de{' '}
              {data.trafficData.designPeriod} anos.
            </p>
            <p><strong>Recomendações:</strong></p>
            <ol>
              <li>
                Executar a compactação das camadas de acordo com as especificações DNIT, 
                garantindo grau de compactação mínimo de 100% do Proctor Normal para o 
                subleito e 100% do Proctor Modificado para base e sub-base.
              </li>
              <li>
                Realizar controle tecnológico durante a execução, incluindo ensaios de 
                densidade in situ e controle de espessuras.
              </li>
              <li>
                Garantir sistema de drenagem adequado conforme projeto específico.
              </li>
              <li>
                Considerar variações locais das condições do subleito e ajustar as 
                espessuras conforme necessário durante a execução.
              </li>
            </ol>
          </div>
        </section>

        {/* Footer */}
        <div className="report-footer">
          <div className="signature-block">
            <div className="signature-line"></div>
            <p>{data.engineer || 'Engenheiro Responsável'}</p>
            <p>CREA: _________________</p>
          </div>
          <div className="report-date">
            <p>Relatório gerado em: {new Date().toLocaleDateString('pt-BR')}</p>
            <p className="software-credit">PaveDim Pro - Sistema de Dimensionamento de Pavimentos</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReportPanel;
