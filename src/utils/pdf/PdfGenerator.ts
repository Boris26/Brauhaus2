import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = pdfFonts.vfs;

export interface PdfRenderStrategy<T> {
    buildContent(data: T): object[];
    getStyles(): object;
}


export class PdfGenerator<T> {
    private strategy: PdfRenderStrategy<T>;

    constructor(strategy: PdfRenderStrategy<T>) {
        this.strategy = strategy;
    }

    async generatePdf(data: T, filename: string = "download"): Promise<void> {
        const content = this.strategy.buildContent(data);
        const styles = this.strategy.getStyles();
        const docDefinition = { content, styles };
        return new Promise((resolve, reject) => {
            pdfMake.createPdf(docDefinition).download(filename, () => resolve(), (error: any) => reject(error));
        });
    }
}
