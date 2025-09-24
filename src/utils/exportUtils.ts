import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { PaceNote } from '../types';

export const exportToPDF = async (paceNotes: PaceNote[], routeName: string): Promise<void> => {
  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4 size
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const { height } = page.getSize();
    const margin = 50;
    const lineHeight = 20;
    let yPosition = height - margin;

    // Title
    page.drawText('Rally Pace Notes', {
      x: margin,
      y: yPosition,
      size: 24,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    yPosition -= 30;

    // Route name
    page.drawText(`Route: ${routeName}`, {
      x: margin,
      y: yPosition,
      size: 16,
      font: boldFont,
      color: rgb(0.2, 0.2, 0.2),
    });

    yPosition -= 30;

    // Generated date
    page.drawText(`Generated: ${new Date().toLocaleDateString()}`, {
      x: margin,
      y: yPosition,
      size: 12,
      font: font,
      color: rgb(0.4, 0.4, 0.4),
    });

    yPosition -= 40;

    // Legend
    page.drawText('Turn Numbers: 1=Hairpin, 2=Sharp, 3=Medium, 4=Open, 5=Slight, 6=Straight', {
      x: margin,
      y: yPosition,
      size: 10,
      font: font,
      color: rgb(0.4, 0.4, 0.4),
    });

    yPosition -= 30;

    // Pace notes
    paceNotes.forEach((note, index) => {
      if (yPosition < margin + 40) {
        // Add new page if needed
        pdfDoc.addPage([595, 842]);
        yPosition = height - margin;
      }

      const noteText = formatNoteForPDF(note);
      
      page.drawText(`${index + 1}.`, {
        x: margin,
        y: yPosition,
        size: 12,
        font: font,
        color: rgb(0, 0, 0),
      });

      page.drawText(noteText, {
        x: margin + 30,
        y: yPosition,
        size: 12,
        font: font,
        color: rgb(0, 0, 0),
      });

      yPosition -= lineHeight;
    });

    // Save and download
    const pdfBytes = await pdfDoc.save();
    downloadFile(pdfBytes, `${routeName.replace(/[^a-z0-9]/gi, '_')}_pace_notes.pdf`, 'application/pdf');

  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF');
  }
};

export const exportToText = (paceNotes: PaceNote[], routeName: string): void => {
  try {
    let content = `Rally Pace Notes\n`;
    content += `Route: ${routeName}\n`;
    content += `Generated: ${new Date().toLocaleDateString()}\n`;
    content += `\n`;
    content += `Turn Numbers: 1=Hairpin, 2=Sharp, 3=Medium, 4=Open, 5=Slight, 6=Straight\n`;
    content += `\n`;

    paceNotes.forEach((note, index) => {
      content += `${index + 1}. ${formatNoteForText(note)}\n`;
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${routeName.replace(/[^a-z0-9]/gi, '_')}_pace_notes.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);

  } catch (error) {
    console.error('Error generating text file:', error);
    throw new Error('Failed to generate text file');
  }
};

const formatNoteForPDF = (note: PaceNote): string => {
  const elevation = note.elevation ? ` ${note.elevation}` : '';
  return `${note.distance}m: ${note.turnNumber} ${note.direction}${elevation}, ${note.surface}`;
};

const formatNoteForText = (note: PaceNote): string => {
  const elevation = note.elevation ? ` ${note.elevation}` : '';
  return `${note.distance}m: ${note.turnNumber} ${note.direction}${elevation}, ${note.surface}`;
};

const downloadFile = (data: Uint8Array, filename: string, mimeType: string): void => {
  const blob = new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};
