import { PdfRenderStrategy } from './PdfGenerator';
import {Beer} from "../../model/Beer";
import { COLOR_LIGHT_TEXT } from '../../colors';


export class BeerPdfStrategy implements PdfRenderStrategy<Beer> {
    buildContent(beer: Beer): object[] {
        return [
            { text: beer.name, style: 'header' },
            { text: beer.description, style: 'description' },

            { text: 'Grunddaten', style: 'subheader' },
            this.renderBasicInfo(beer),

            { text: 'Maischeführung', style: 'subheader' },
            this.renderFermentation(beer),

            { text: 'Malze', style: 'subheader' },
            this.renderMalts(beer),

            this.renderWortBoiling(beer),
            this.renderFermentationMaturation(beer)
        ];
    }

    getStyles(): object {
        return {
            header: { fontSize: 22, bold: true, margin: [0, 0, 0, 10] },
            subheader: { fontSize: 14, bold: true, margin: [0, 10, 0, 4] },
            tableHeader: { bold: true, fillColor: COLOR_LIGHT_TEXT },
            table: { margin: [0, 0, 0, 10] },
            description: { fontSize: 11, italics: true, margin: [0, 0, 0, 10] }
        };
    }

    private renderBasicInfo(beer: Beer): object {
        return {
            style: 'table',
            table: {
                widths: ['auto', 'auto'],
                body: [
                    ['Stammwürze (°P)', beer.originalwort != null ? beer.originalwort.toString() : ''],
                    ['Maischevolumen (l)', beer.mashVolume != null ? beer.mashVolume.toString() : ''],
                    ['Nachgussvolumen (l)', beer.spargeVolume != null ? beer.spargeVolume.toString() : ''],
                    ['Kochzeit (min)', beer.cookingTime != null ? beer.cookingTime.toString() : ''],
                    ['Kochtemperatur (°C)', beer.cookingTemperatur != null ? beer.cookingTemperatur.toString() : ''],
                ]
            }
        };
    }

    private renderFermentation(beer: Beer): object {
        return {
            style: 'table',
            table: {
                headerRows: 1,
                widths: ['auto', 'auto', 'auto'],
                body: [
                    ['Typ', 'Temperatur (°C)', 'Dauer (min)'],
                    ...beer.fermentation.map(f => [
                        f.type != null ? String(f.type) : '',
                        f.temperature != null ? String(f.temperature) : '',
                        f.time != null ? String(f.time) : ''
                    ])
                ]
            }
        };
    }

    private renderMalts(beer: Beer): object {
        return {
            style: 'table',
            table: {
                headerRows: 1,
                widths: ['*', 'auto'],
                body: [
                    ['ID', 'Menge (kg)'],
                    ...beer.malts.map(m => [String(m.id), String(m.quantity)])
                ]
            }
        };
    }

    private renderWortBoiling(beer: Beer): object {
        if (!beer.wortBoiling.hops.length) return {};
        return {
            stack: [
                { text: `Würzekochen: ${beer.wortBoiling.totalTime} min`, style: 'subheader' },
                {
                    style: 'table',
                    table: {
                        headerRows: 1,
                        widths: ['*', 'auto', 'auto'],
                        body: [
                            ['ID', 'Menge (g)', 'Zugabezeit'],
                            ...beer.wortBoiling.hops.map(h => [String(h.id), String(h.quantity), h.additionTime == null ? '' : String(h.additionTime)])
                        ]
                    }
                }
            ]
        };
    }

    private renderFermentationMaturation(beer: Beer): object {
        if (!beer.fermentationMaturation.yeast.length) return {};
        return {
            stack: [
                { text: 'Gärung & Reifung', style: 'subheader' },
                {
                    style: 'table',
                    table: {
                        headerRows: 1,
                        widths: ['*', 'auto', 'auto', 'auto'],
                        body: [
                            ['Hefe-ID', 'Gärtemperatur (°C)', 'Karbonisierung (g/l)', 'Menge'],
                            ...beer.fermentationMaturation.yeast.map(y => [
                                String(y.id),
                                beer.fermentationMaturation.fermentationTemperature != null ? String(beer.fermentationMaturation.fermentationTemperature) : '',
                                beer.fermentationMaturation.carbonation != null ? String(beer.fermentationMaturation.carbonation) : '',
                                y.quantity != null ? String(y.quantity) : ''
                            ])
                        ]
                    }
                }
            ]
        };
    }
}
