export interface PdfRenderStrategy<T> {
    title: string;
    renderItem: (item: T) => string[];
}
