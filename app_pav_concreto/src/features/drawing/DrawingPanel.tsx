
import React, { useRef } from 'react';
import './DrawingPanel.css';
import { CalculationResults, PavementData } from '../../types';

interface DrawingPanelProps {
  results: CalculationResults;
  data: PavementData;
}

function DrawingPanel({ results, data }: DrawingPanelProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const totalWidth = data.geometryData.laneWidth * data.geometryData.numberOfLanes + 
                     data.geometryData.shoulderWidth * 2;

  // Scale factors for drawing
  const scale = 30; // pixels per meter (horizontal)
  const verticalScale = 3; // pixels per cm (vertical)
  const svgWidth = 800;
  const svgHeight = 500;
  const margin = { top: 60, right: 100, bottom: 60, left: 100 };
  
  const drawingWidth = svgWidth - margin.left - margin.right;
  const roadWidthPx = Math.min(totalWidth * scale, drawingWidth);
  const roadStartX = margin.left + (drawingWidth - roadWidthPx) / 2;
  
  // Calculate layer positions
  const baselineY = margin.top + 50;
  let currentY = baselineY;
  
  const layerColors: { [key: string]: { fill: string; pattern: string } } = {
    'Revestimento': { fill: '#1f2937', pattern: 'asphalt' },
    'Base': { fill: '#78350f', pattern: 'gravel' },
    'Sub-base': { fill: '#a16207', pattern: 'sand' }
  };

  const layers = results.layers.map((layer, index) => {
    const y = currentY;
    const height = layer.thickness * verticalScale;
    currentY += height;
    return {
      ...layer,
      y,
      height,
      color: layerColors[layer.name] || { fill: '#6b7280', pattern: 'default' }
    };
  });

  // Subleito
  const subleitoY = currentY;
  const subleitoHeight = 80;

  const handleExport = () => {
    if (!svgRef.current) return;
    
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `secao_transversal_${data.projectName.replace(/\s/g, '_')}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="drawing-panel">
      <div className="drawing-header">
        <div className="drawing-title">
          <h2>Desenho Técnico</h2>
          <p>Seção transversal típica do pavimento</p>
        </div>
        <button className="btn btn-primary" onClick={handleExport}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
          Exportar SVG
        </button>
      </div>

      <div className="drawing-container">
        <svg 
          ref={svgRef}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="technical-drawing"
        >
          <defs>
            {/* Asphalt pattern */}
            <pattern id="asphalt" patternUnits="userSpaceOnUse" width="8" height="8">
              <rect width="8" height="8" fill="#1f2937" />
              <circle cx="2" cy="2" r="1" fill="#374151" />
              <circle cx="6" cy="6" r="1" fill="#374151" />
            </pattern>
            
            {/* Gravel pattern */}
            <pattern id="gravel" patternUnits="userSpaceOnUse" width="12" height="12">
              <rect width="12" height="12" fill="#78350f" />
              <circle cx="3" cy="3" r="2" fill="#92400e" />
              <circle cx="9" cy="9" r="2" fill="#92400e" />
              <circle cx="9" cy="3" r="1.5" fill="#a16207" />
            </pattern>
            
            {/* Sand pattern */}
            <pattern id="sand" patternUnits="userSpaceOnUse" width="6" height="6">
              <rect width="6" height="6" fill="#a16207" />
              <circle cx="1" cy="1" r="0.5" fill="#ca8a04" />
              <circle cx="4" cy="4" r="0.5" fill="#ca8a04" />
              <circle cx="3" cy="1" r="0.3" fill="#eab308" />
            </pattern>
            
            {/* Soil pattern */}
            <pattern id="soil" patternUnits="userSpaceOnUse" width="20" height="20">
              <rect width="20" height="20" fill="#65a30d" />
              <path d="M0,10 Q5,8 10,10 T20,10" stroke="#84cc16" strokeWidth="1" fill="none" />
              <path d="M0,15 Q5,13 10,15 T20,15" stroke="#84cc16" strokeWidth="1" fill="none" />
            </pattern>
          </defs>

          {/* Title block */}
          <text x={svgWidth / 2} y="25" textAnchor="middle" className="drawing-main-title">
            SEÇÃO TRANSVERSAL TÍPICA
          </text>
          <text x={svgWidth / 2} y="45" textAnchor="middle" className="drawing-subtitle">
            {data.projectName}
          </text>

          {/* Draw layers */}
          {layers.map((layer, index) => (
            <g key={index}>
              <rect
                x={roadStartX}
                y={layer.y}
                width={roadWidthPx}
                height={layer.height}
                fill={`url(#${layer.color.pattern})`}
                stroke="#000"
                strokeWidth="1"
              />
              {/* Layer label */}
              <text 
                x={roadStartX + roadWidthPx + 15} 
                y={layer.y + layer.height / 2 + 4}
                className="layer-label"
              >
                {layer.name}
              </text>
              {/* Dimension line */}
              <line
                x1={roadStartX + roadWidthPx + 60}
                y1={layer.y}
                x2={roadStartX + roadWidthPx + 60}
                y2={layer.y + layer.height}
                stroke="#666"
                strokeWidth="1"
              />
              <line
                x1={roadStartX + roadWidthPx + 55}
                y1={layer.y}
                x2={roadStartX + roadWidthPx + 65}
                y2={layer.y}
                stroke="#666"
                strokeWidth="1"
              />
              <line
                x1={roadStartX + roadWidthPx + 55}
                y1={layer.y + layer.height}
                x2={roadStartX + roadWidthPx + 65}
                y2={layer.y + layer.height}
                stroke="#666"
                strokeWidth="1"
              />
              <text
                x={roadStartX + roadWidthPx + 75}
                y={layer.y + layer.height / 2 + 4}
                className="dimension-text"
              >
                {layer.thickness.toFixed(1)} cm
              </text>
            </g>
          ))}

          {/* Subleito */}
          <rect
            x={roadStartX - 30}
            y={subleitoY}
            width={roadWidthPx + 60}
            height={subleitoHeight}
            fill="url(#soil)"
            stroke="#000"
            strokeWidth="1"
          />
          <text 
            x={roadStartX + roadWidthPx + 15} 
            y={subleitoY + subleitoHeight / 2}
            className="layer-label"
          >
            Subleito (CBR {data.soilData.cbrSubgrade}%)
          </text>

          {/* Road markings */}
          <line
            x1={roadStartX + roadWidthPx / 2}
            y1={baselineY - 5}
            x2={roadStartX + roadWidthPx / 2}
            y2={baselineY + 2}
            stroke="#fff"
            strokeWidth="3"
            strokeDasharray="10,5"
          />

          {/* Width dimension */}
          <g>
            <line
              x1={roadStartX}
              y1={baselineY - 30}
              x2={roadStartX + roadWidthPx}
              y2={baselineY - 30}
              stroke="#333"
              strokeWidth="1"
            />
            <line
              x1={roadStartX}
              y1={baselineY - 35}
              x2={roadStartX}
              y2={baselineY - 25}
              stroke="#333"
              strokeWidth="1"
            />
            <line
              x1={roadStartX + roadWidthPx}
              y1={baselineY - 35}
              x2={roadStartX + roadWidthPx}
              y2={baselineY - 25}
              stroke="#333"
              strokeWidth="1"
            />
            <text
              x={roadStartX + roadWidthPx / 2}
              y={baselineY - 38}
              textAnchor="middle"
              className="dimension-text-large"
            >
              {totalWidth.toFixed(2)} m
            </text>
          </g>

          {/* Lane markings */}
          {data.geometryData.shoulderWidth > 0 && (
            <>
              {/* Left shoulder */}
              <line
                x1={roadStartX + data.geometryData.shoulderWidth * (roadWidthPx / totalWidth)}
                y1={baselineY - 15}
                x2={roadStartX + data.geometryData.shoulderWidth * (roadWidthPx / totalWidth)}
                y2={baselineY}
                stroke="#666"
                strokeWidth="1"
                strokeDasharray="4,2"
              />
              {/* Right shoulder */}
              <line
                x1={roadStartX + roadWidthPx - data.geometryData.shoulderWidth * (roadWidthPx / totalWidth)}
                y1={baselineY - 15}
                x2={roadStartX + roadWidthPx - data.geometryData.shoulderWidth * (roadWidthPx / totalWidth)}
                y2={baselineY}
                stroke="#666"
                strokeWidth="1"
                strokeDasharray="4,2"
              />
            </>
          )}

          {/* Scale bar */}
          <g transform={`translate(${margin.left}, ${svgHeight - 30})`}>
            <text x="0" y="-5" className="scale-label">Escala:</text>
            <rect x="50" y="-15" width="60" height="10" fill="#333" />
            <rect x="110" y="-15" width="60" height="10" fill="#fff" stroke="#333" />
            <text x="50" y="5" className="scale-text">0</text>
            <text x="110" y="5" className="scale-text">1m</text>
            <text x="170" y="5" className="scale-text">2m</text>
          </g>

          {/* Legend */}
          <g transform={`translate(${svgWidth - margin.right - 120}, ${svgHeight - 100})`}>
            <text x="0" y="-10" className="legend-title">LEGENDA</text>
            <rect x="0" y="5" width="20" height="12" fill="url(#asphalt)" stroke="#000" />
            <text x="28" y="15" className="legend-text">CBUQ</text>
            <rect x="0" y="25" width="20" height="12" fill="url(#gravel)" stroke="#000" />
            <text x="28" y="35" className="legend-text">BGS</text>
            <rect x="0" y="45" width="20" height="12" fill="url(#sand)" stroke="#000" />
            <text x="28" y="55" className="legend-text">Sub-base</text>
            <rect x="0" y="65" width="20" height="12" fill="url(#soil)" stroke="#000" />
            <text x="28" y="75" className="legend-text">Subleito</text>
          </g>
        </svg>
      </div>

      <div className="drawing-notes">
        <h4>Notas:</h4>
        <ol>
          <li>Dimensões em centímetros, exceto quando indicado.</li>
          <li>Cotas de nível referenciadas ao eixo da via.</li>
          <li>Executar compactação de acordo com as especificações DNIT.</li>
          <li>CBR do subleito: {data.soilData.cbrSubgrade}%</li>
          <li>N de projeto: {results.designN.toExponential(2)}</li>
        </ol>
      </div>
    </div>
  );
}

export default DrawingPanel;
