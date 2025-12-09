
import { PavementData, CalculationResults, CalculationStep, LayerResult } from '../types';

export function calculatePavement(data: PavementData): CalculationResults {
  const steps: CalculationStep[] = [];

  // Step 1: Calculate Design N (with growth factor)
  const growthFactor = calculateGrowthFactor(data.trafficData.growthRate, data.trafficData.designPeriod);
  const designN = data.trafficData.n8_2t * growthFactor;
  
  steps.push({
    title: 'Cálculo do Número N de Projeto',
    formula: 'N_proj = N_inicial × FCA',
    variables: [
      { name: 'N_inicial', value: data.trafficData.n8_2t.toExponential(2), unit: 'solicitações' },
      { name: 'FCA (Fator de Crescimento Acumulado)', value: growthFactor.toFixed(2), unit: '' },
      { name: 'Taxa de crescimento', value: data.trafficData.growthRate.toString(), unit: '%' },
      { name: 'Período de projeto', value: data.trafficData.designPeriod.toString(), unit: 'anos' }
    ],
    result: `N_proj = ${designN.toExponential(2)} solicitações`,
    explanation: 'O número N de projeto é calculado considerando o tráfego inicial e a taxa de crescimento ao longo do período de projeto, utilizando o fator de crescimento acumulado.'
  });

  // Step 2: Calculate Subgrade Resilient Modulus
  const subgradeModulus = calculateSubgradeModulus(data.soilData.cbrSubgrade);
  
  steps.push({
    title: 'Cálculo do Módulo de Resiliência do Subleito',
    formula: 'MR = 1500 × CBR (para CBR ≤ 10%)',
    variables: [
      { name: 'CBR', value: data.soilData.cbrSubgrade.toString(), unit: '%' }
    ],
    result: `MR = ${subgradeModulus.toFixed(0)} psi`,
    explanation: 'O módulo de resiliência é uma medida da rigidez do solo e é calculado a partir do CBR do subleito, conforme correlação empírica estabelecida.'
  });

  // Step 3: Determine Reliability Factor
  const reliabilityFactor = getReliabilityFactor(data.trafficData.trafficClass);
  const zr = getZR(reliabilityFactor);
  
  steps.push({
    title: 'Determinação do Fator de Confiabilidade',
    formula: 'R = f(classe de tráfego)',
    variables: [
      { name: 'Classe de tráfego', value: getTrafficClassName(data.trafficData.trafficClass), unit: '' },
      { name: 'R', value: (reliabilityFactor * 100).toFixed(0), unit: '%' },
      { name: 'ZR (desvio padrão normal)', value: zr.toFixed(3), unit: '' }
    ],
    result: `Confiabilidade = ${(reliabilityFactor * 100).toFixed(0)}%`,
    explanation: 'A confiabilidade indica a probabilidade de que o pavimento atinja o final do período de projeto com serventia adequada. Valores maiores são usados para vias mais importantes.'
  });

  // Step 4: Calculate Serviceability Loss
  const po = 4.2; // Initial serviceability
  const pt = getTerminalServiceability(data.trafficData.trafficClass);
  const deltaP = po - pt;
  
  steps.push({
    title: 'Cálculo da Perda de Serventia',
    formula: 'ΔPSI = p₀ - p_t',
    variables: [
      { name: 'p₀ (serventia inicial)', value: po.toString(), unit: '' },
      { name: 'p_t (serventia terminal)', value: pt.toString(), unit: '' }
    ],
    result: `ΔPSI = ${deltaP.toFixed(1)}`,
    explanation: 'A perda de serventia representa a degradação admissível do pavimento durante sua vida útil. A serventia inicial típica é 4,2 e a terminal varia conforme a importância da via.'
  });

  // Step 5: Calculate Drainage Coefficient
  const drainageCoefficient = getDrainageCoefficient(data.climateData.drainageCondition, data.climateData.rainfall);
  
  steps.push({
    title: 'Determinação do Coeficiente de Drenagem',
    formula: 'm = f(condição de drenagem, clima)',
    variables: [
      { name: 'Condição de drenagem', value: getDrainageConditionName(data.climateData.drainageCondition), unit: '' },
      { name: 'Regime pluviométrico', value: getRainfallName(data.climateData.rainfall), unit: '' }
    ],
    result: `m = ${drainageCoefficient.toFixed(2)}`,
    explanation: 'O coeficiente de drenagem considera o tempo que a estrutura fica saturada e a qualidade da drenagem. Valores menores que 1,0 indicam condições desfavoráveis.'
  });

  // Step 6: Calculate Structural Number
  const so = 0.45; // Standard deviation
  const structuralNumber = calculateSN(designN, subgradeModulus, zr, so, deltaP);
  
  steps.push({
    title: 'Cálculo do Número Estrutural (SN)',
    formula: 'log₁₀(W₁₈) = ZR×S₀ + 9,36×log₁₀(SN+1) - 0,20 + log₁₀(ΔPSI/(4,2-1,5))/(0,40 + 1094/(SN+1)^5,19) + 2,32×log₁₀(MR) - 8,07',
    variables: [
      { name: 'W₁₈ (N de projeto)', value: designN.toExponential(2), unit: 'solicitações' },
      { name: 'ZR', value: zr.toFixed(3), unit: '' },
      { name: 'S₀', value: so.toString(), unit: '' },
      { name: 'ΔPSI', value: deltaP.toFixed(1), unit: '' },
      { name: 'MR', value: subgradeModulus.toFixed(0), unit: 'psi' }
    ],
    result: `SN = ${structuralNumber.toFixed(2)}`,
    explanation: 'O número estrutural é calculado pela equação AASHTO 1993, que relaciona o tráfego de projeto com a capacidade estrutural necessária do pavimento.'
  });

  // Step 7: Design Layer Thicknesses
  const layers = designLayers(structuralNumber, data.soilData, drainageCoefficient);
  const totalThickness = layers.reduce((sum, layer) => sum + layer.thickness, 0);
  
  steps.push({
    title: 'Dimensionamento das Camadas',
    formula: 'SN = a₁×D₁ + a₂×m×D₂ + a₃×m×D₃',
    variables: [
      { name: 'a₁ (coef. revestimento)', value: layers[0].coefficient.toString(), unit: '' },
      { name: 'a₂ (coef. base)', value: layers[1].coefficient.toString(), unit: '' },
      { name: 'a₃ (coef. sub-base)', value: layers[2].coefficient.toString(), unit: '' },
      { name: 'm (coef. drenagem)', value: drainageCoefficient.toFixed(2), unit: '' }
    ],
    result: `Espessuras: Revestimento = ${layers[0].thickness.toFixed(1)} cm, Base = ${layers[1].thickness.toFixed(1)} cm, Sub-base = ${layers[2].thickness.toFixed(1)} cm`,
    explanation: 'As espessuras das camadas são determinadas de forma a satisfazer o número estrutural calculado, considerando os coeficientes estruturais de cada material e o coeficiente de drenagem.'
  });

  return {
    designN,
    structuralNumber,
    layers,
    totalThickness,
    subgradeModulus,
    reliabilityFactor,
    serviceabilityLoss: deltaP,
    drainageCoefficient,
    calculationSteps: steps
  };
}

function calculateGrowthFactor(rate: number, years: number): number {
  if (rate === 0) return years;
  const r = rate / 100;
  return ((Math.pow(1 + r, years) - 1) / r);
}

function calculateSubgradeModulus(cbr: number): number {
  // Correlation: MR (psi) = 1500 × CBR for CBR ≤ 10%
  // For higher CBR: MR = 1500 × CBR^0.65
  if (cbr <= 10) {
    return 1500 * cbr;
  }
  return 1500 * Math.pow(cbr, 0.65);
}

function getReliabilityFactor(trafficClass: string): number {
  const factors: { [key: string]: number } = {
    'light': 0.80,
    'medium': 0.90,
    'heavy': 0.95,
    'veryHeavy': 0.99
  };
  return factors[trafficClass] || 0.90;
}

function getZR(reliability: number): number {
  // Standard normal deviate for reliability
  const zrValues: { [key: number]: number } = {
    0.80: -0.841,
    0.90: -1.282,
    0.95: -1.645,
    0.99: -2.327
  };
  return zrValues[reliability] || -1.282;
}

function getTerminalServiceability(trafficClass: string): number {
  const pt: { [key: string]: number } = {
    'light': 2.0,
    'medium': 2.5,
    'heavy': 2.5,
    'veryHeavy': 3.0
  };
  return pt[trafficClass] || 2.5;
}

function getDrainageCoefficient(condition: string, rainfall: string): number {
  const baseCoefficients: { [key: string]: number } = {
    'excellent': 1.25,
    'good': 1.10,
    'fair': 0.90,
    'poor': 0.70
  };
  
  const rainfallFactors: { [key: string]: number } = {
    'low': 1.10,
    'medium': 1.00,
    'high': 0.90
  };
  
  const base = baseCoefficients[condition] || 1.0;
  const factor = rainfallFactors[rainfall] || 1.0;
  
  return Math.min(Math.max(base * factor, 0.4), 1.4);
}

function calculateSN(N: number, MR: number, ZR: number, So: number, deltaP: number): number {
  // Iterative solution of AASHTO equation
  let sn = 1.0;
  const logN = Math.log10(N);
  
  for (let i = 0; i < 100; i++) {
    const term1 = ZR * So;
    const term2 = 9.36 * Math.log10(sn + 1);
    const term3 = -0.20;
    const term4 = Math.log10(deltaP / (4.2 - 1.5)) / (0.40 + 1094 / Math.pow(sn + 1, 5.19));
    const term5 = 2.32 * Math.log10(MR);
    const term6 = -8.07;
    
    const calculatedLogN = term1 + term2 + term3 + term4 + term5 + term6;
    
    if (Math.abs(calculatedLogN - logN) < 0.01) {
      break;
    }
    
    // Adjust SN based on difference
    if (calculatedLogN < logN) {
      sn += 0.1;
    } else {
      sn -= 0.05;
    }
    
    sn = Math.max(sn, 0.5);
  }
  
  return sn;
}

function designLayers(sn: number, soilData: any, m: number): LayerResult[] {
  // Structural coefficients (per inch)
  const a1 = 0.44; // Asphalt concrete
  const a2 = 0.14; // Crushed gravel base
  const a3 = 0.11; // Gravel sub-base
  
  // Minimum thicknesses (cm)
  const minAsphalt = 5.0;
  const minBase = 15.0;
  const minSubbase = 15.0;
  
  // Convert SN to cm (from inches)
  const snCm = sn * 2.54;
  
  // Calculate thicknesses
  // SN = a1*D1 + a2*m*D2 + a3*m*D3
  
  // Start with minimum asphalt
  let d1 = Math.max(minAsphalt, snCm * 0.25 / a1);
  
  // Remaining SN after asphalt
  const sn1 = a1 * d1 / 2.54;
  const snRemaining1 = sn - sn1;
  
  // Base thickness
  let d2 = Math.max(minBase, (snRemaining1 * 2.54 * 0.5) / (a2 * m));
  
  // Remaining SN after base
  const sn2 = a2 * m * d2 / 2.54;
  const snRemaining2 = snRemaining1 - sn2;
  
  // Sub-base thickness
  let d3 = Math.max(minSubbase, (snRemaining2 * 2.54) / (a3 * m));
  
  // Round up to practical values (multiples of 2.5 cm)
  d1 = Math.ceil(d1 / 2.5) * 2.5;
  d2 = Math.ceil(d2 / 2.5) * 2.5;
  d3 = Math.ceil(d3 / 2.5) * 2.5;
  
  return [
    {
      name: 'Revestimento',
      thickness: d1,
      material: 'CBUQ (Concreto Betuminoso Usinado a Quente)',
      cbr: 100,
      coefficient: a1
    },
    {
      name: 'Base',
      thickness: d2,
      material: 'BGS (Brita Graduada Simples)',
      cbr: soilData.cbrBase,
      coefficient: a2
    },
    {
      name: 'Sub-base',
      thickness: d3,
      material: 'Material Granular Estabilizado',
      cbr: soilData.cbrSubbase,
      coefficient: a3
    }
  ];
}

function getTrafficClassName(trafficClass: string): string {
  const names: { [key: string]: string } = {
    'light': 'Leve',
    'medium': 'Médio',
    'heavy': 'Pesado',
    'veryHeavy': 'Muito Pesado'
  };
  return names[trafficClass] || 'Médio';
}

function getDrainageConditionName(condition: string): string {
  const names: { [key: string]: string } = {
    'excellent': 'Excelente',
    'good': 'Boa',
    'fair': 'Regular',
    'poor': 'Ruim'
  };
  return names[condition] || 'Boa';
}

function getRainfallName(rainfall: string): string {
  const names: { [key: string]: string } = {
    'low': 'Baixo',
    'medium': 'Médio',
    'high': 'Alto'
  };
  return names[rainfall] || 'Médio';
}
