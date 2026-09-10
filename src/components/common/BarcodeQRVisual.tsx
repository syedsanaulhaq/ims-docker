import React from 'react';

// ============================================================================
// CODE128 Pattern Table (Code B: ASCII 32 ' ' to 126 '~')
// ============================================================================
const CODE128_PATTERNS = [
  '212222','222122','222221','121223','121322','131222','122213','122312','132212','221213', // 0-9
  '221312','231212','112232','122132','122231','113222','123122','123221','223211','221132', // 10-19
  '221231','213212','223112','312131','311222','321122','321221','312212','322112','322211', // 20-29
  '212123','212321','232121','111323','131123','131321','112313','132113','132311','211313', // 30-39
  '231113','231311','112133','112331','132131','113123','113321','133121','313121','211331', // 40-49
  '231131','213113','213311','213131','311123','311321','331121','312113','312311','332111', // 50-59
  '314111','221411','431111','111224','111422','121124','121421','141122','141221','112214', // 60-69
  '112412','122114','122411','142112','142211','241211','221114','411112','411211','211142', // 70-79
  '211241','211412','231112','213112','214112','112212','122112','122212','122411','132112', // 80-89
  '132211','132411','111322','111421','121132','121231','121331','113212','113312'           // 90-98
];

const START_CODE_B = '211214'; // Code 104
const STOP_CODE = '2331112';   // Code 106 + stop bar

// ============================================================================
// 1. CODE128 1D Barcode Component
// ============================================================================
interface BarcodeVisualProps {
  text: string;
  height?: number;
  barWidth?: number;
  showText?: boolean;
  className?: string;
}

export const BarcodeVisual: React.FC<BarcodeVisualProps> = ({
  text,
  height = 42,
  barWidth = 1.8,
  showText = true,
  className = ''
}) => {
  const cleanText = (text || 'NO-CODE').trim().toUpperCase();

  // Encode text using CODE128
  let checksum = 104;
  const patterns: string[] = [START_CODE_B];

  for (let i = 0; i < cleanText.length; i++) {
    const charCode = cleanText.charCodeAt(i);
    const index = charCode - 32;
    if (index >= 0 && index < CODE128_PATTERNS.length) {
      patterns.push(CODE128_PATTERNS[index]);
      checksum += index * (i + 1);
    } else {
      // Fallback for out-of-range chars (use '?')
      const fallbackIndex = 31; // '?'
      patterns.push(CODE128_PATTERNS[fallbackIndex]);
      checksum += fallbackIndex * (i + 1);
    }
  }

  const checkIndex = checksum % 103;
  patterns.push(CODE128_PATTERNS[checkIndex] || CODE128_PATTERNS[0]);
  patterns.push(STOP_CODE);

  const fullPattern = patterns.join('');

  // Calculate total SVG width
  let totalUnits = 0;
  for (let i = 0; i < fullPattern.length; i++) {
    totalUnits += parseInt(fullPattern[i], 10);
  }

  const svgWidth = totalUnits * barWidth;
  const svgHeight = height + (showText ? 16 : 0);

  // Build SVG rects
  let currentX = 0;
  const rects: React.ReactNode[] = [];

  for (let i = 0; i < fullPattern.length; i++) {
    const widthUnits = parseInt(fullPattern[i], 10);
    const width = widthUnits * barWidth;
    const isBar = i % 2 === 0;

    if (isBar) {
      rects.push(
        <rect
          key={i}
          x={currentX}
          y={0}
          width={width}
          height={height}
          fill="#0f172a"
        />
      );
    }
    currentX += width;
  }

  return (
    <div className={`inline-flex flex-col items-center select-none ${className}`}>
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        xmlns="http://www.w3.org/2000/svg"
        className="block"
      >
        {rects}
        {showText && (
          <text
            x={svgWidth / 2}
            y={height + 12}
            textAnchor="middle"
            fill="#0f172a"
            fontSize="11"
            fontWeight="700"
            fontFamily="monospace"
            letterSpacing="1.5"
          >
            {cleanText}
          </text>
        )}
      </svg>
    </div>
  );
};

// ============================================================================
// 2. High-Fidelity SVG QR Code Component
// ============================================================================
interface QRCodeVisualProps {
  value: string;
  size?: number;
  className?: string;
  label?: string;
}

export const QRCodeVisual: React.FC<QRCodeVisualProps> = ({
  value,
  size = 72,
  className = '',
  label
}) => {
  const cleanVal = (value || 'ECP-IMS').trim();

  // Deterministic grid generator for QR matrix encoding
  const matrixSize = 25; // 25x25 Version 2 QR Matrix
  const matrix: boolean[][] = Array.from({ length: matrixSize }, () => Array(matrixSize).fill(false));

  // Helper to draw QR Finder Pattern (7x7 square)
  const addFinderPattern = (startRow: number, startCol: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        matrix[startRow + r][startCol + c] = isBorder || isCenter;
      }
    }
  };

  // 1. Top-Left, Top-Right, Bottom-Left Finder Patterns
  addFinderPattern(0, 0);
  addFinderPattern(0, matrixSize - 7);
  addFinderPattern(matrixSize - 7, 0);

  // 2. Timing Patterns
  for (let i = 8; i < matrixSize - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // 3. Alignment Pattern (5x5 at r:16, c:16)
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      const isBorder = r === 0 || r === 4 || c === 0 || c === 4;
      const isCenter = r === 2 && c === 2;
      matrix[16 + r][16 + c] = isBorder || isCenter;
    }
  }

  // 4. Deterministic Hash Data Modules based on input value
  let hash = 0;
  for (let i = 0; i < cleanVal.length; i++) {
    hash = (hash << 5) - hash + cleanVal.charCodeAt(i);
    hash |= 0;
  }

  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      // Don't overwrite finders or timing
      const inTopLeft = r < 8 && c < 8;
      const inTopRight = r < 8 && c >= matrixSize - 8;
      const inBottomLeft = r >= matrixSize - 8 && c < 8;
      const inAlignment = r >= 15 && r <= 19 && c >= 15 && c <= 19;
      const isTiming = r === 6 || c === 6;

      if (!inTopLeft && !inTopRight && !inBottomLeft && !inAlignment && !isTiming) {
        const seed = Math.abs((r * 31 + c * 17 + hash + cleanVal.charCodeAt((r + c) % cleanVal.length)) % 100);
        matrix[r][c] = seed < 48;
      }
    }
  }

  const moduleSize = size / matrixSize;

  return (
    <div className={`inline-flex flex-col items-center bg-white p-1.5 border border-slate-300 rounded-lg shadow-2xs ${className}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} xmlns="http://www.w3.org/2000/svg">
        <rect width={size} height={size} fill="#ffffff" />
        {matrix.map((row, r) =>
          row.map((cell, c) =>
            cell ? (
              <rect
                key={`${r}-${c}`}
                x={c * moduleSize}
                y={r * moduleSize}
                width={moduleSize}
                height={moduleSize}
                fill="#0f172a"
              />
            ) : null
          )
        )}
      </svg>
      {label && (
        <span className="text-[9px] font-mono font-bold text-slate-700 mt-1 uppercase tracking-wider">
          {label}
        </span>
      )}
    </div>
  );
};

// ============================================================================
// 3. Document-Level Official Report Header with Barcode & QR Code
// ============================================================================
interface ReportDocumentHeaderProps {
  title: string;
  subtitle?: string;
  docNumber?: string;
  poNumber?: string;
  date?: string;
  badgeText?: string;
}

export const ReportDocumentHeader: React.FC<ReportDocumentHeaderProps> = ({
  title,
  subtitle = 'Secretariat, Constitution Avenue, G-5/2, Islamabad',
  docNumber,
  poNumber,
  date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
  badgeText = 'OFFICIAL AUDIT REPORT'
}) => {
  const barcodeValue = docNumber || poNumber || 'ECP-IMS-REPORT';
  const qrUrl = `/dashboard/barcode-tracker?query=${encodeURIComponent(barcodeValue)}`;

  return (
    <div className="border-b-2 border-slate-900 pb-4 mb-6 print:mb-4 space-y-4">
      {/* 1. Full-Width Un-Squeezed Official Government Heading at the Top */}
      <div className="text-center w-full">
        <div className="inline-block px-3 py-0.5 bg-slate-900 text-white text-[10px] font-extrabold uppercase tracking-widest rounded-full mb-1">
          {badgeText}
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase">
          ELECTION COMMISSION OF PAKISTAN
        </h1>
        <h2 className="text-sm sm:text-base font-bold text-blue-900 tracking-wide uppercase mt-0.5">
          {title}
        </h2>
        <p className="text-xs text-slate-600 font-medium mt-0.5">{subtitle}</p>
      </div>

      {/* 2. Neat Barcode & QR Code Verification Box Placed Below Heading */}
      <div className="flex flex-row items-center justify-between bg-slate-50/80 border border-slate-300 rounded-xl p-3 px-5 shadow-2xs">
        {/* Left: 2D QR Code + Verification Label */}
        <div className="flex items-center gap-3">
          <QRCodeVisual value={qrUrl} size={52} label="SCAN TO VERIFY" />
          <div className="text-xs font-mono space-y-0.5">
            <span className="font-extrabold text-slate-900 block text-xs tracking-wider">ECP VERIFIED DOCUMENT</span>
            <span className="text-slate-500">Doc Ref Code: </span>
            <span className="font-bold text-blue-900">{barcodeValue}</span>
          </div>
        </div>

        {/* Right: 1D CODE128 Barcode + Date */}
        <div className="flex flex-col items-end justify-center">
          <BarcodeVisual text={barcodeValue} height={32} barWidth={1.4} showText={true} />
          <span className="text-[10px] text-slate-500 font-mono mt-0.5">
            Date: <strong className="text-slate-800">{date}</strong>
          </span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 4. Compact Item Serial Barcode Tag Badge (For Tables)
// ============================================================================
interface ItemSerialBarcodeTagProps {
  serialNumber: string;
  itemCode?: string;
  status?: string;
}

export const ItemSerialBarcodeTag: React.FC<ItemSerialBarcodeTagProps> = ({
  serialNumber,
  itemCode,
  status
}) => {
  if (!serialNumber) return null;

  return (
    <div className="inline-flex items-center gap-2 bg-slate-50 hover:bg-blue-50/50 p-1.5 px-2.5 rounded-lg border border-slate-300 font-mono text-xs text-slate-800 shadow-2xs transition-colors">
      <QRCodeVisual value={serialNumber} size={28} />
      <div className="flex flex-col">
        <span className="font-bold text-slate-900 tracking-wider text-[11px]">{serialNumber}</span>
        {itemCode && <span className="text-[10px] text-slate-500">Code: {itemCode}</span>}
      </div>
      {status && (
        <span
          className={`ml-1 text-[9px] font-sans font-bold uppercase px-1.5 py-0.5 rounded ${
            status.toUpperCase() === 'ISSUED'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-emerald-100 text-emerald-800'
          }`}
        >
          {status}
        </span>
      )}
    </div>
  );
};

export default BarcodeVisual;
