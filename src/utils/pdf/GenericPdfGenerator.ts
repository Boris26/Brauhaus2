import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { saveAs } from 'file-saver';
import { PdfRenderStrategy } from './PdfRenderStrategy';


export class GenericPdfGenerator<T> {
    async generate(items: T[], strategy: PdfRenderStrategy<T> & { tableHeaders?: string[]; asTable?: boolean }, filename = 'export.pdf'): Promise<void> {
        const pdfDoc = await PDFDocument.create();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        // Querformat (A4 landscape)
        let page = pdfDoc.addPage([841.89, 595.28]); // A4 quer
        const { width, height } = page.getSize();
        const margin = 40;
        const lineHeight = 16;
        const titleFontSize = 18;
        const bodyFontSize = 12;
        let y = height - margin;

        // Titel
        page.drawText(strategy.title, {
            x: margin,
            y,
            size: titleFontSize,
            font,
            color: rgb(0, 0, 0.6),
        });

        y -= lineHeight * 2;

        // Metadaten berechnen
        const now = new Date();
        const dateString = now.toLocaleString('de-DE');
        const entryCount = items.length;
        // Liter-Gesamtsumme berechnen (Spalte "Liter" an Index 3, als Zahl)
        let totalLiters = 0;
        if (strategy.asTable && strategy.tableHeaders && strategy.tableHeaders.includes('Liter')) {
            const literIndex = strategy.tableHeaders.indexOf('Liter');
            for (const item of items) {
                const cols = strategy.renderItem(item);
                const val = parseFloat(cols[literIndex]?.replace(',', '.') || '0');
                if (!isNaN(val)) totalLiters += val;
            }
        }
        // Metadaten anzeigen (Block untereinander)
        y -= lineHeight;
        page.drawText(`Anzahl Einträge: ${entryCount}`, {
            x: margin,
            y,
            size: bodyFontSize,
            font,
            color: rgb(0.1, 0.1, 0.1),
        });
        y -= lineHeight;
        page.drawText(`Gesamt Liter: ${totalLiters.toLocaleString('de-DE', {maximumFractionDigits:2})}`, {
            x: margin,
            y,
            size: bodyFontSize,
            font,
            color: rgb(0.1, 0.1, 0.1),
        });
        y -= lineHeight;
        page.drawText(`PDF erzeugt am: ${dateString}`, {
            x: margin,
            y,
            size: bodyFontSize,
            font,
            color: rgb(0.1, 0.1, 0.1),
        });
        y -= lineHeight * 0.5;
        // Abstand zwischen Metadaten-Block und Tabelle
        y -= lineHeight;

        if (strategy.asTable && strategy.tableHeaders) {
            // Spaltenbreiten: Name und Beschreibung breiter (Index 0 und 6!)
            const colCount = strategy.tableHeaders.length;
            const colWeight = Array(colCount).fill(1);
            colWeight[0] = 2; // Name (Index 0)
            colWeight[6] = 2; // Beschreibung (Index 6)
            const totalWeight = colWeight.reduce((a, b) => a + b, 0);
            const colPadding = 4;
            const colWidths = colWeight.map(w => ((width - 2 * margin) * w) / totalWeight);
            let x = margin;
            // Tabellenkopf
            for (let i = 0; i < colCount; i++) {
                page.drawText(strategy.tableHeaders[i], {
                    x: x + colPadding,
                    y,
                    size: bodyFontSize - 1,
                    font,
                    color: rgb(0.2, 0.2, 0.2),
                    maxWidth: colWidths[i] - 2 * colPadding,
                });
                x += colWidths[i];
            }
            y -= lineHeight;
            // Trennlinie
            page.drawLine({
                start: { x: margin, y: y + lineHeight / 2 },
                end: { x: width - margin, y: y + lineHeight / 2 },
                thickness: 1,
                color: rgb(0.7, 0.7, 0.7),
            });
            y -= 2;
            // Datenzeilen
            for (const item of items) {
                const cols = strategy.renderItem(item);
                x = margin;
                let rowHeight = lineHeight;
                // Beschreibung ggf. umbrechen (Index 6!)
                let descLines: string[] = [];
                if (cols[6]) {
                    const desc = cols[6];
                    descLines = [];
                    let rest = desc;
                    while (rest.length > 0) {
                        let cut = rest.length;
                        while (cut > 0 && font.widthOfTextAtSize(rest.slice(0, cut), bodyFontSize - 1) > colWidths[6] - 2 * colPadding) {
                            cut--;
                        }
                        if (cut === 0) break;
                        descLines.push(rest.slice(0, cut));
                        rest = rest.slice(cut);
                    }
                    rowHeight = Math.max(lineHeight, descLines.length * lineHeight);
                }
                if (y < margin + rowHeight) {
                    page = pdfDoc.addPage([841.89, 595.28]);
                    y = height - margin;
                }
                for (let i = 0; i < colCount; i++) {
                    let cellText = cols[i] ?? '';
                    if (i === 6 && descLines.length > 0) {
                        // Beschreibung mit Zeilenumbruch
                        let yy = y;
                        for (const l of descLines) {
                            page.drawText(l, {
                                x: x + colPadding,
                                y: yy,
                                size: bodyFontSize - 1,
                                font,
                                color: rgb(0, 0, 0),
                                maxWidth: colWidths[i] - 2 * colPadding,
                            });
                            yy -= lineHeight;
                        }
                    } else {
                        // Name ggf. abschneiden, aber mehr Platz (Index 0)
                        let maxTextWidth = colWidths[i] - 2 * colPadding;
                        let measuredWidth = font.widthOfTextAtSize(cellText, bodyFontSize - 1);
                        if (measuredWidth > maxTextWidth) {
                            let cut = cellText.length;
                            while (cut > 0 && font.widthOfTextAtSize(cellText.slice(0, cut) + '…', bodyFontSize - 1) > maxTextWidth) {
                                cut--;
                            }
                            cellText = cellText.slice(0, cut) + '…';
                        }
                        page.drawText(cellText, {
                            x: x + colPadding,
                            y,
                            size: bodyFontSize - 1,
                            font,
                            color: rgb(0, 0, 0),
                            maxWidth: maxTextWidth,
                        });
                    }
                    x += colWidths[i];
                }
                y -= rowHeight;
            }
        } else {
            for (const item of items) {
                const lines = strategy.renderItem(item);

                if (y < margin + lineHeight * (lines.length + 1)) {
                    // Neue Seite
                    y = height - margin;
                    pdfDoc.addPage();
                }

                for (const line of lines) {
                    page.drawText(line, {
                        x: margin,
                        y,
                        size: bodyFontSize,
                        font,
                        color: rgb(0, 0, 0),
                    });
                    y -= lineHeight;
                }

                y -= lineHeight / 2;
            }
        }

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        saveAs(blob, filename);
    }
}
