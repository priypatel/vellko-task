import { PDFDocument } from 'pdf-lib';

/**
 * Count the number of pages in a PDF buffer.
 */
export async function getPageCount(pdfBuffer: Buffer): Promise<number> {
  const pdf = await PDFDocument.load(pdfBuffer);
  return pdf.getPageCount();
}

export interface EmbedSignatureOptions {
  pdfBuffer: Buffer;
  signatureBuffer: Buffer;
  page: number; // 1-based page number
  xPct: number; // 0–100, from the left edge
  yPct: number; // 0–100, from the TOP edge (screen coordinate convention)
  widthPct: number; // 0–100, relative to page width
  heightPct: number; // 0–100, relative to page height
}

/**
 * Embed a signature image (PNG or JPEG) onto a specific page of a PDF.
 *
 * Coordinates arrive as percentages measured from the top-left (screen
 * convention). PDF user space has its origin at the bottom-left, so the y
 * coordinate is flipped here.
 */
export async function embedSignature(
  options: EmbedSignatureOptions,
): Promise<Buffer> {
  const {
    pdfBuffer,
    signatureBuffer,
    page,
    xPct,
    yPct,
    widthPct,
    heightPct,
  } = options;

  const pdf = await PDFDocument.load(pdfBuffer);
  const pages = pdf.getPages();

  const pageIndex = page - 1;
  if (pageIndex < 0 || pageIndex >= pages.length) {
    throw new Error(
      `[pdf] page ${page} is out of range (document has ${pages.length} page(s))`,
    );
  }

  const targetPage = pages[pageIndex];
  const { width: pageWidth, height: pageHeight } = targetPage.getSize();

  // Detect PNG by its 8-byte signature; otherwise treat as JPEG.
  const isPng =
    signatureBuffer.length >= 8 &&
    signatureBuffer[0] === 0x89 &&
    signatureBuffer[1] === 0x50 &&
    signatureBuffer[2] === 0x4e &&
    signatureBuffer[3] === 0x47;

  const image = isPng
    ? await pdf.embedPng(signatureBuffer)
    : await pdf.embedJpg(signatureBuffer);

  const drawWidth = (widthPct / 100) * pageWidth;
  const drawHeight = (heightPct / 100) * pageHeight;
  const drawX = (xPct / 100) * pageWidth;
  // Flip from top-origin to bottom-origin: subtract the distance-from-top and
  // the box height from the page height.
  const drawY = pageHeight - (yPct / 100) * pageHeight - drawHeight;

  targetPage.drawImage(image, {
    x: drawX,
    y: drawY,
    width: drawWidth,
    height: drawHeight,
  });

  const signedBytes = await pdf.save();
  return Buffer.from(signedBytes);
}
