
export interface TrafficData {
  n8_2t: number;
  growthRate: number;
  designPeriod: number;
  trafficClass: 'light' | 'medium' | 'heavy' | 'veryHeavy';
}

export interface SoilData {
  cbrSubgrade: number;
  cbrSubbase: number;
  cbrBase: number;
  soilType: 'sand' | 'silt' | 'clay' | 'gravel';
}

export interface ClimateData {
  rainfall: 'low' | 'medium' | 'high';
  temperature: 'cold' | 'moderate' | 'hot';
  drainageCondition: 'poor' | 'fair' | 'good' | 'excellent';
}

export interface GeometryData {
  laneWidth: number;
  numberOfLanes: number;
  shoulderWidth: number;
  totalLength: number;
}

export interface PavementData {
  projectName: string;
  projectLocation: string;
  engineer: string;
  date: string;
  trafficData: TrafficData;
  soilData: SoilData;
  climateData: ClimateData;
  geometryData: GeometryData;
}

export interface LayerResult {
  name: string;
  thickness: number;
  material: string;
  cbr: number;
  coefficient: number;
}

export interface CalculationResults {
  designN: number;
  structuralNumber: number;
  layers: LayerResult[];
  totalThickness: number;
  subgradeModulus: number;
  reliabilityFactor: number;
  serviceabilityLoss: number;
  drainageCoefficient: number;
  calculationSteps: CalculationStep[];
}

export interface CalculationStep {
  title: string;
  formula: string;
  variables: { name: string; value: string; unit: string }[];
  result: string;
  explanation: string;
}
