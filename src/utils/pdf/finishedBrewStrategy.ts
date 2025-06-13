import { PdfRenderStrategy } from './PdfRenderStrategy';
import { FinishedBrew } from '../../model/FinishedBrew';

// Erweitere das Strategy-Objekt um Spaltenüberschriften für die Tabellenerstellung.
// Wenn das Interface PdfRenderStrategy keine headers vorsieht, kannst du sie als eigene Eigenschaft ergänzen
// oder in der PDF-Logik separat verwalten.
export const finishedBrewStrategy: PdfRenderStrategy<FinishedBrew> & { tableHeaders: string[]; asTable: boolean } = {
    title: 'Fertige Biere',
    tableHeaders: [
        'Name',
        'Startdatum',
        'Enddatum',
        'Liter',
        'Stammwürze',
        'Restextrakt',
        'Beschreibung',
    ],
    asTable: true, // <--- Signalisiert der PDF-Logik, dass eine Tabelle erzeugt werden soll
    renderItem: (brew: FinishedBrew) => [
        brew.name,
        formatDate(brew.startDate),
        formatDate(brew.endDate),
        `${brew.liters} L`,
        `${brew.originalwort} °P`,
        `${brew.residual_extract} °P`,
        brew.note,
    ],
};

function formatDate(date?: Date | string): string {
    if (!date) return '–';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString();
}
