import i18n from '../i18n';

const RASTER_SIZE = 512;

type PdfPaper = {
  label: string;
  widthMm: number;
  heightMm: number;
};

type MonotonyPdfOptions = {
  translateText?: (source: string, values?: Record<string, unknown>) => string;
  sequence: string[];
  goodTypeIds: string[];
  paper: PdfPaper;
  rectangleWidthMm: number;
  borderWidthMm: number;
  cornerRadiusMm: number;
  columns: number;
  rows: number;
  gapMm: number;
};

function roundedRectanglePath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const boundedRadius = Math.max(0, Math.min(radius, width / 2, height / 2));
  context.beginPath();
  context.moveTo(x + boundedRadius, y);
  context.lineTo(x + width - boundedRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + boundedRadius);
  context.lineTo(x + width, y + height - boundedRadius);
  context.quadraticCurveTo(
    x + width,
    y + height,
    x + width - boundedRadius,
    y + height,
  );
  context.lineTo(x + boundedRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - boundedRadius);
  context.lineTo(x, y + boundedRadius);
  context.quadraticCurveTo(x, y, x + boundedRadius, y);
  context.closePath();
}

function roundedTopMarkerPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  context.beginPath();
  context.moveTo(x, y + height);
  context.lineTo(x, y + height / 2);
  context.quadraticCurveTo(x, y, x + width / 2, y);
  context.quadraticCurveTo(x + width, y, x + width, y + height / 2);
  context.lineTo(x + width, y + height);
  context.closePath();
}

function drawCornerMarker(context: CanvasRenderingContext2D, typeId: string) {
  const markerWidth = RASTER_SIZE * 0.88;
  const markerHeight = RASTER_SIZE * 0.44;
  const positions: Record<string, { x: number; y: number; rotation: number }> =
    {
      'corner-upper-left': {
        x: -RASTER_SIZE * 0.3,
        y: -RASTER_SIZE * 0.1,
        rotation: 135,
      },
      'corner-upper-right': {
        x: RASTER_SIZE * 0.42,
        y: -RASTER_SIZE * 0.1,
        rotation: 225,
      },
      'corner-bottom-right': {
        x: RASTER_SIZE * 0.42,
        y: RASTER_SIZE * 0.66,
        rotation: 315,
      },
      'corner-bottom-left': {
        x: -RASTER_SIZE * 0.3,
        y: RASTER_SIZE * 0.66,
        rotation: 45,
      },
    };
  const marker = positions[typeId];
  if (!marker) return;

  const centerX = marker.x + markerWidth / 2;
  const centerY = marker.y + markerHeight / 2;
  context.save();
  context.translate(centerX, centerY);
  context.rotate((marker.rotation * Math.PI) / 180);
  context.translate(-centerX, -centerY);
  roundedTopMarkerPath(context, marker.x, marker.y, markerWidth, markerHeight);
  context.fill();
  context.restore();
}

function drawSideMarker(context: CanvasRenderingContext2D, typeId: string) {
  const thickness = RASTER_SIZE * 0.24;
  const radius = thickness / 2;
  context.beginPath();

  if (typeId === 'side-top') {
    context.moveTo(0, 0);
    context.lineTo(RASTER_SIZE, 0);
    context.lineTo(RASTER_SIZE, thickness - radius);
    context.quadraticCurveTo(
      RASTER_SIZE,
      thickness,
      RASTER_SIZE - radius,
      thickness,
    );
    context.lineTo(radius, thickness);
    context.quadraticCurveTo(0, thickness, 0, thickness - radius);
  } else if (typeId === 'side-right') {
    context.moveTo(RASTER_SIZE, 0);
    context.lineTo(RASTER_SIZE, RASTER_SIZE);
    context.lineTo(RASTER_SIZE - thickness + radius, RASTER_SIZE);
    context.quadraticCurveTo(
      RASTER_SIZE - thickness,
      RASTER_SIZE,
      RASTER_SIZE - thickness,
      RASTER_SIZE - radius,
    );
    context.lineTo(RASTER_SIZE - thickness, radius);
    context.quadraticCurveTo(
      RASTER_SIZE - thickness,
      0,
      RASTER_SIZE - thickness + radius,
      0,
    );
  } else if (typeId === 'side-bottom') {
    context.moveTo(0, RASTER_SIZE);
    context.lineTo(RASTER_SIZE, RASTER_SIZE);
    context.lineTo(RASTER_SIZE, RASTER_SIZE - thickness + radius);
    context.quadraticCurveTo(
      RASTER_SIZE,
      RASTER_SIZE - thickness,
      RASTER_SIZE - radius,
      RASTER_SIZE - thickness,
    );
    context.lineTo(radius, RASTER_SIZE - thickness);
    context.quadraticCurveTo(
      0,
      RASTER_SIZE - thickness,
      0,
      RASTER_SIZE - thickness + radius,
    );
  } else if (typeId === 'side-left') {
    context.moveTo(0, 0);
    context.lineTo(0, RASTER_SIZE);
    context.lineTo(thickness - radius, RASTER_SIZE);
    context.quadraticCurveTo(
      thickness,
      RASTER_SIZE,
      thickness,
      RASTER_SIZE - radius,
    );
    context.lineTo(thickness, radius);
    context.quadraticCurveTo(thickness, 0, thickness - radius, 0);
  } else {
    return;
  }

  context.closePath();
  context.fill();
}

function renderStimulusImage(
  typeId: string,
  rectangleWidthMm: number,
  borderWidthMm: number,
  cornerRadiusMm: number,
) {
  const canvas = document.createElement('canvas');
  canvas.width = RASTER_SIZE;
  canvas.height = RASTER_SIZE;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas rendering is unavailable.');

  const borderPixels = Math.max(
    1,
    (borderWidthMm / rectangleWidthMm) * RASTER_SIZE,
  );
  const radiusPixels = (cornerRadiusMm / rectangleWidthMm) * RASTER_SIZE;
  const inset = borderPixels / 2;

  roundedRectanglePath(
    context,
    inset,
    inset,
    RASTER_SIZE - borderPixels,
    RASTER_SIZE - borderPixels,
    radiusPixels,
  );
  context.fillStyle = '#ffffff';
  context.fill();

  context.save();
  roundedRectanglePath(
    context,
    inset,
    inset,
    RASTER_SIZE - borderPixels,
    RASTER_SIZE - borderPixels,
    radiusPixels,
  );
  context.clip();
  context.fillStyle = '#000000';
  if (typeId.startsWith('corner-')) drawCornerMarker(context, typeId);
  else drawSideMarker(context, typeId);
  context.restore();

  roundedRectanglePath(
    context,
    inset,
    inset,
    RASTER_SIZE - borderPixels,
    RASTER_SIZE - borderPixels,
    radiusPixels,
  );
  context.strokeStyle = '#000000';
  context.lineWidth = borderPixels;
  context.stroke();

  return canvas.toDataURL('image/png');
}

function safeFileDate() {
  return new Date().toISOString().slice(0, 10);
}

export async function downloadMonotonyPdf({
  translateText = (source, values = {}) =>
    i18n.getFixedT('en')(source, { ...values, defaultValue: source }),
  sequence,
  goodTypeIds,
  paper,
  rectangleWidthMm,
  borderWidthMm,
  cornerRadiusMm,
  columns,
  rows,
  gapMm,
}: MonotonyPdfOptions) {
  const { jsPDF } = await import('jspdf');
  const itemsPerPage = columns * rows;
  const pageCount = Math.max(1, Math.ceil(sequence.length / itemsPerPage));
  const document = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [paper.widthMm, paper.heightMm],
    compress: true,
    putOnlyUsedFonts: true,
  });
  document.setProperties({
    title: translateText('monotony.paper.monotonyPaperTest'),
    subject: translateText('monotony.paper.lengthRandomizedPerceptionSymbols', {
      length: sequence.length,
    }),
    creator: 'PSY Practice Lab',
  });

  // Built-in PDF fonts lack Hungarian ő/ű. Rasterize translated labels with
  // the browser font so exported sheets retain every accent.
  const text = (
    source: string,
    x: number,
    y: number,
    align: 'left' | 'right' = 'left',
    values: Record<string, unknown> = {},
  ) => {
    const value = translateText(source, values);
    if (value === source) {
      document.text(value, x, y, { align });
      return;
    }
    const scale = 4;
    const size = document.getFontSize();
    const canvas = globalThis.document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas rendering is unavailable.');
    const font = `${document.getFont().fontStyle === 'bold' ? 'bold ' : ''}${size * scale}px Arial, sans-serif`;
    context.font = font;
    canvas.width = Math.ceil(context.measureText(value).width) + 8;
    canvas.height = Math.ceil(size * scale * 1.5);
    context.font = font;
    context.fillStyle = '#000000';
    context.fillText(value, 0, size * scale);
    const width = ((canvas.width / scale) * 25.4) / 72;
    const height = ((canvas.height / scale) * 25.4) / 72;
    document.addImage(
      canvas.toDataURL('image/png'),
      'PNG',
      align === 'right' ? x - width : x,
      y - (size * 25.4) / 72,
      width,
      height,
    );
  };

  const imageCache = new Map<string, string>();
  const imageFor = (typeId: string) => {
    const cached = imageCache.get(typeId);
    if (cached) return cached;
    const image = renderStimulusImage(
      typeId,
      rectangleWidthMm,
      borderWidthMm,
      cornerRadiusMm,
    );
    imageCache.set(typeId, image);
    return image;
  };

  const gridWidth =
    columns * rectangleWidthMm + Math.max(0, columns - 1) * gapMm;
  const gridStartX = (paper.widthMm - gridWidth) / 2;
  const gridStartY = 45;
  const legendSize = 9;

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    if (pageIndex > 0) {
      document.addPage([paper.widthMm, paper.heightMm], 'portrait');
    }

    document.setDrawColor(0);
    document.setTextColor(0);
    document.setFont('helvetica', 'bold');
    document.setFontSize(16);
    text('Monotony pattern', 10, 15);
    document.setFont('helvetica', 'normal');
    document.setFontSize(9);
    text('Circle every rectangle matching one of the target types.', 10, 20);
    text('Name: ____________________', paper.widthMm - 72, 15);
    text('Date: _____________________', paper.widthMm - 72, 20);
    document.setLineWidth(0.25);
    document.line(10, 24, paper.widthMm - 10, 24);

    document.setFont('helvetica', 'bold');
    document.setFontSize(8);
    text('CIRCLE THESE', 10, 32);
    let legendX = 34;
    for (const typeId of goodTypeIds) {
      document.addImage(
        imageFor(typeId),
        'PNG',
        legendX,
        26,
        legendSize,
        legendSize,
        `monotony-${typeId}`,
        'FAST',
      );
      legendX += legendSize + 2;
    }
    if (goodTypeIds.length === 0) {
      document.setFont('helvetica', 'normal');
      text('No target types selected', 34, 32);
    }
    document.line(10, 40, paper.widthMm - 10, 40);

    const pageStart = pageIndex * itemsPerPage;
    const pageItems = sequence.slice(pageStart, pageStart + itemsPerPage);
    pageItems.forEach((typeId, index) => {
      const row = Math.floor(index / columns);
      const column = index % columns;
      document.addImage(
        imageFor(typeId),
        'PNG',
        gridStartX + column * (rectangleWidthMm + gapMm),
        gridStartY + row * (rectangleWidthMm + gapMm),
        rectangleWidthMm,
        rectangleWidthMm,
        `monotony-${typeId}`,
        'FAST',
      );
    });

    const firstItem = pageStart + 1;
    const lastItem = pageStart + pageItems.length;
    document.setFont('helvetica', 'normal');
    document.setFontSize(8);
    document.line(
      10,
      paper.heightMm - 13,
      paper.widthMm - 10,
      paper.heightMm - 13,
    );
    text(
      'monotony.paper.itemsFirstitemLastitem',
      10,
      paper.heightMm - 7,
      'left',
      { firstItem, lastItem },
    );
    text(
      'monotony.paper.pagePageindexOfPagecount',
      paper.widthMm - 10,
      paper.heightMm - 7,
      'right',
      { pageIndex: pageIndex + 1, pageCount },
    );
  }

  document.save(`monotony-pattern-${safeFileDate()}.pdf`);
}
