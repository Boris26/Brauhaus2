import {FinishedBrew} from "../../model/FinishedBrew";
import {PdfRenderStrategy} from "./PdfGenerator";


export class FinishedBrewListPdfStrategy implements PdfRenderStrategy<FinishedBrew[]> {
    buildContent(data: FinishedBrew[]): object[] {
        const count = data.length;
        const totalLiters = data.reduce((sum, item) => sum + item.liters, 0);
        const creationDate = new Date().toLocaleDateString();

        const tableHeader = [
            'Name', 'Start', 'Ende', 'Liter', 'Stammwürze (°P)', 'Restextrakt', 'Notiz', 'Status'
        ];
        // Header-Absicherung: alle Felder als String
        const safeTableHeader = tableHeader.map(h => h != null ? String(h) : '');
        // Zeilen-Absicherung: alle Felder als String, niemals undefined/null
        const rows = data.map(item => [
            item.name != null ? String(item.name) : '',
            this.formatDate(item.startDate),
            this.formatDate(item.endDate),
            item.liters != null ? item.liters.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '',
            item.originalwort != null ? String(item.originalwort) : '',
            item.residual_extract != null ? String(item.residual_extract) : '',
            item.note != null ? String(item.note) : '',
            this.formatState(item.state),
        ]);

        return [
            { text: 'Biere', style: 'header' },
            { text: `Anzahl Einträge: ${count}`, style: 'meta' },
            { text: `Liter gesamt: ${totalLiters.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, style: 'meta' },
            { text: `Erstellungsdatum: ${creationDate}`, style: 'meta' },
            {
                table: {
                    headerRows: 1,
                    widths: Array(safeTableHeader.length).fill('auto'),
                    body: [safeTableHeader, ...rows]
                },
                layout: 'lightHorizontalLines'
            }
        ];
    }

    getStyles(): object {
        return {
            header: { fontSize: 18, bold: true, margin: [0, 0, 0, 12] },
            meta: { fontSize: 12, margin: [0, 0, 0, 6] }
        };
    }

    private formatDate(date: Date | string | undefined): string {
        if (!date) return '-';
        const d = typeof date === 'string' ? new Date(date) : date;
        return d.toLocaleDateString();
    }

    private formatState(state: any): string {
        if (typeof state === 'string') return state;
        if (state == null) return '';
        return state.toString ? state.toString() : '';
    }
}
