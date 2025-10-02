import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { PaceNote } from '../types';

export const exportToPDF = async (paceNotes: PaceNote[], routeName: string): Promise<void> => {
  try {
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([595, 842]); // A4 size
    const font = await pdfDoc.embedFont(StandardFonts.Courier);
    const boldFont = await pdfDoc.embedFont(StandardFonts.CourierBold);

    const { width, height } = page.getSize();
    const margin = 50;
    const lineHeight = 18;
    let yPosition = height - margin;

    // Rally-themed header box (red background)
    page.drawRectangle({
      x: 0,
      y: height - 120,
      width: width,
      height: 120,
      color: rgb(0.86, 0.18, 0.18), // Red #dc2e2e
    });

    // Yellow accent stripe
    page.drawRectangle({
      x: 0,
      y: height - 125,
      width: width,
      height: 5,
      color: rgb(0.98, 0.75, 0.16), // Yellow #fbbf24
    });

    // Title - "RALLY" in white
    page.drawText('RALLY', {
      x: margin,
      y: yPosition - 15,
      size: 32,
      font: boldFont,
      color: rgb(1, 1, 1),
    });

    yPosition -= 45;

    // Subtitle - "Pace Notes Generator" in yellow
    page.drawText('Pace Notes Generator', {
      x: margin,
      y: yPosition,
      size: 14,
      font: boldFont,
      color: rgb(0.98, 0.75, 0.16),
    });

    yPosition -= 40;

    // Route name in white
    page.drawText(`Stage: ${routeName}`, {
      x: margin,
      y: yPosition,
      size: 12,
      font: boldFont,
      color: rgb(1, 1, 1),
    });

    // Generated date (right aligned in header)
    const dateText = `Generated: ${new Date().toLocaleDateString()}`;
    page.drawText(dateText, {
      x: width - margin - (dateText.length * 6),
      y: yPosition,
      size: 10,
      font: font,
      color: rgb(1, 0.9, 0.9),
    });

    yPosition = height - 145; // Below header box

    // Legend section with box
    page.drawRectangle({
      x: margin - 5,
      y: yPosition - 60,
      width: width - 2 * margin + 10,
      height: 70,
      color: rgb(0.95, 0.95, 0.95),
      borderColor: rgb(0.8, 0.8, 0.8),
      borderWidth: 1,
    });

    yPosition -= 10;

    page.drawText('MCRAE 1-6 SYSTEM:', {
      x: margin,
      y: yPosition,
      size: 9,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    
    yPosition -= 15;
    
    page.drawText('1=Hairpin  2=Sharp  3=Medium  4=Open  5=Slight  6=Straight', {
      x: margin + 5,
      y: yPosition,
      size: 8,
      font: font,
      color: rgb(0.2, 0.2, 0.2),
    });
    
    yPosition -= 12;
    
    page.drawText('MODIFIERS: Long/Short (length), Tightens/Widens (radius change)', {
      x: margin + 5,
      y: yPosition,
      size: 8,
      font: font,
      color: rgb(0.2, 0.2, 0.2),
    });
    
    yPosition -= 12;
    
    page.drawText('HAZARDS: Crest, Dip, Jump  |  ADVICE: Caution, Blind, Heavy Braking', {
      x: margin + 5,
      y: yPosition,
      size: 8,
      font: font,
      color: rgb(0.2, 0.2, 0.2),
    });

    yPosition -= 35;

    // Section divider
    page.drawLine({
      start: { x: margin, y: yPosition },
      end: { x: width - margin, y: yPosition },
      thickness: 2,
      color: rgb(0.86, 0.18, 0.18),
    });

    yPosition -= 25;

    // Pace notes header
    page.drawText('PACE NOTES', {
      x: margin,
      y: yPosition,
      size: 11,
      font: boldFont,
      color: rgb(0.86, 0.18, 0.18),
    });

    yPosition -= 25;

    // Pace notes
    let currentPage = page;
    let pageNumber = 1;
    
    for (let index = 0; index < paceNotes.length; index++) {
      const note = paceNotes[index];
      
      if (yPosition < margin + 80) {
        // Add footer to current page before creating new one
        await addFooter(currentPage, width, margin, pageNumber);
        
        // Add new page
        currentPage = pdfDoc.addPage([595, 842]);
        yPosition = height - margin;
        pageNumber++;
        
        // Page number header on new pages
        currentPage.drawText(`PACE NOTES - Page ${pageNumber}`, {
          x: margin,
          y: yPosition,
          size: 10,
          font: boldFont,
          color: rgb(0.5, 0.5, 0.5),
        });
        yPosition -= 30;
      }

      const noteText = formatNoteForPDF(note);
      
      // Number with background
      const numWidth = 25;
      currentPage.drawRectangle({
        x: margin - 2,
        y: yPosition - 2,
        width: numWidth,
        height: 14,
        color: rgb(0.9, 0.9, 0.9),
      });
      
      currentPage.drawText(`${index + 1}.`, {
        x: margin,
        y: yPosition,
        size: 11,
        font: boldFont,
        color: rgb(0, 0, 0),
      });

      currentPage.drawText(noteText, {
        x: margin + numWidth + 5,
        y: yPosition,
        size: 11,
        font: font,
        color: rgb(0, 0, 0),
      });

      yPosition -= lineHeight;
    }

    // Add footer to final page
    await addFooter(currentPage, width, margin, pageNumber);

    // Save and download
    const pdfBytes = await pdfDoc.save();
    downloadFile(pdfBytes, `${routeName.replace(/[^a-z0-9]/gi, '_')}_pace_notes.pdf`, 'application/pdf');

  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF');
  }
};

// Helper function to add footer to a page
const addFooter = async (page: any, width: number, margin: number, pageNumber: number): Promise<void> => {
  const courierFont = await page.doc.embedFont(StandardFonts.Courier);
  
  // Footer divider
  page.drawLine({
    start: { x: margin, y: 60 },
    end: { x: width - margin, y: 60 },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  });

  // Footer text
  page.drawText('Created with Rally Pace Notes Generator', {
    x: margin,
    y: 45,
    size: 8,
    font: courierFont,
    color: rgb(0.5, 0.5, 0.5),
  });

  page.drawText('by local-optimum  |  blog.local-optimum.net', {
    x: margin,
    y: 32,
    size: 8,
    font: courierFont,
    color: rgb(0.5, 0.5, 0.5),
  });

  // Page number (right aligned)
  const pageText = `Page ${pageNumber}`;
  page.drawText(pageText, {
    x: width - margin - (pageText.length * 5),
    y: 45,
    size: 8,
    font: courierFont,
    color: rgb(0.5, 0.5, 0.5),
  });

  // Safety disclaimer
  page.drawText('For Educational & Recreational Use Only - Always Drive Safely', {
    x: width / 2 - 130,
    y: 20,
    size: 7,
    font: courierFont,
    color: rgb(0.6, 0.6, 0.6),
  });
};

export const exportToText = (paceNotes: PaceNote[], routeName: string): void => {
  try {
    const divider = '═'.repeat(80);
    const thinDivider = '─'.repeat(80);
    
    let content = '';
    
    // ASCII Rally Header
    content += `${divider}\n`;
    content += `█████╗  █████╗ ██╗     ██╗  ██╗   ██╗\n`;
    content += `██╔══██╗██╔══██╗██║     ██║  ╚██╗ ██╔╝\n`;
    content += `█████╔╝ ███████║██║     ██║   ╚████╔╝\n`;
    content += `██╔══██╗██╔══██║██║     ██║    ╚██╔╝\n`;
    content += `██║  ██║██║  ██║███████╗███████╗██║\n`;
    content += `╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚══════╝╚═╝\n`;
    content += `\n`;
    content += `               PACE NOTES GENERATOR\n`;
    content += `${divider}\n\n`;
    
    // Stage info
    content += `STAGE:     ${routeName}\n`;
    content += `GENERATED: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\n`;
    content += `\n${thinDivider}\n\n`;
    
    // Legend
    content += `MCRAE 1-6 SEVERITY SYSTEM:\n`;
    content += `  1 = Hairpin (< 20m radius)    |  4 = Open (70-120m radius)\n`;
    content += `  2 = Sharp (20-40m radius)     |  5 = Slight (120-200m radius)\n`;
    content += `  3 = Medium (40-70m radius)    |  6 = Straight (> 200m radius)\n`;
    content += `\n`;
    content += `MODIFIERS:\n`;
    content += `  • Long/Short - Corner length based on total angle\n`;
    content += `  • Tightens/Widens - Radius change > 20% through corner\n`;
    content += `\n`;
    content += `HAZARDS:\n`;
    content += `  • Crest - Blind peak (> 5m/100m climb)\n`;
    content += `  • Dip - Compression (> 5m/100m descent)\n`;
    content += `  • Jump - Potential airborne (> 10m change in 50m)\n`;
    content += `\n`;
    content += `ADVICE: Caution, Blind, Heavy Braking (based on corner analysis)\n`;
    content += `\n${divider}\n\n`;
    
    // Pace notes header
    content += `PACE NOTES\n\n`;

    // Format pace notes with better spacing
    paceNotes.forEach((note, index) => {
      const noteText = formatNoteForText(note);
      const paddedNum = String(index + 1).padStart(3, ' ');
      content += `${paddedNum}. ${noteText}\n`;
    });

    content += `\n${divider}\n\n`;
    
    // Footer with credits
    content += `Created with Rally Pace Notes Generator\n`;
    content += `by local-optimum  |  https://blog.local-optimum.net\n`;
    content += `\n`;
    content += `For Educational & Recreational Use Only - Always Drive Safely\n`;
    content += `\n${divider}\n`;

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
  let noteStr = `${note.position}m: `;
  
  // Add modifiers
  if (note.modifiers && note.modifiers.length > 0) {
    const modifierStr = note.modifiers
      .map(m => typeof m === 'string' ? m : `to ${m.to}`)
      .join(' ');
    noteStr += `${modifierStr} `;
  }
  
  // Add severity and direction
  noteStr += `${note.severity} ${note.direction || ''}`.trim();
  
  // Add hazards
  if (note.hazards && note.hazards.length > 0) {
    noteStr += ` [${note.hazards.join(', ')}]`;
  }
  
  // Add advice
  if (note.advice && note.advice.length > 0) {
    noteStr += ` (${note.advice.join(', ')})`;
  }
  
  noteStr += `, ${note.surface}`;
  
  return noteStr;
};

const formatNoteForText = (note: PaceNote): string => {
  let noteStr = `${note.position}m: `;
  
  // Add modifiers
  if (note.modifiers && note.modifiers.length > 0) {
    const modifierStr = note.modifiers
      .map(m => typeof m === 'string' ? m : `to ${m.to}`)
      .join(' ');
    noteStr += `${modifierStr} `;
  }
  
  // Add severity and direction
  noteStr += `${note.severity} ${note.direction || ''}`.trim();
  
  // Add hazards
  if (note.hazards && note.hazards.length > 0) {
    noteStr += ` [${note.hazards.join(', ')}]`;
  }
  
  // Add advice
  if (note.advice && note.advice.length > 0) {
    noteStr += ` (${note.advice.join(', ')})`;
  }
  
  noteStr += `, ${note.surface}`;
  
  return noteStr;
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
