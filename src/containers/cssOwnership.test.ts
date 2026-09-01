import * as fs from 'fs';
import * as path from 'path';

const readContainerFile = (relativePath: string): string =>
    fs.readFileSync(path.join(__dirname, relativePath), 'utf8');

describe('lazy route CSS ownership', () => {
    it('keeps generic production grid classes scoped to the production root', () => {
        const css = readContainerFile('Production/Production.css');

        for (const className of ['info', 'settings', 'left', 'list', 'meters']) {
            const unscopedSelector = new RegExp(`(^|[},]\\s*)\\.${className}(?=[\\s,{:])`, 'm');
            expect(css).not.toMatch(unscopedSelector);
            expect(css).toContain(`.containerProduction .${className}`);
        }
    });

    it('does not expose route-level finish button styles', () => {
        const finishedBrewsCss = readContainerFile('MainView/FinishBrewsBeers/FinishedBrewsTable.css');
        const beerFormCss = readContainerFile('DatabaseOverview/BeerForm.css');

        expect(finishedBrewsCss).not.toMatch(/(^|[},]\s*)\.finish-btn(?=[\s,{:.])/m);
        expect(beerFormCss).not.toMatch(/(^|[},]\s*)\.finish-btn(?=[\s,{:.])/m);
        expect(finishedBrewsCss).toContain('.FinishedBrewsTable .finish-btn');
        expect(beerFormCss).toContain('.containerBeerForm .finish-btn');
    });

    it('keeps Main CSS route-scoped and free of global SimpleBar overrides', () => {
        const css = readContainerFile('MainView/Main.css');

        expect(css).toContain('.main-view');
        expect(css).not.toContain('.simplebar-');
        expect(css).not.toContain('.ingredients-wrapper');
    });

    it('owns the ingredients wrapper and loading fallback in the eager app shell', () => {
        const css = readContainerFile('App.css');

        expect(css).toContain('.ingredients-wrapper');
        expect(css).toContain('.view-loading');
    });

    it('keeps scrolling route-local to Settings without changing the Production shell', () => {
        const settingsCss = readContainerFile('Settings/SettingsPage.css');
        const productionCss = readContainerFile('Production/Production.css');

        expect(settingsCss).toMatch(/\.settings-page\s*\{[^}]*height:\s*100%;/s);
        expect(settingsCss).toMatch(/\.settings-page\s*\{[^}]*min-height:\s*0;/s);
        expect(settingsCss).toMatch(/\.settings-page\s*\{[^}]*overflow-y:\s*auto;/s);
        expect(settingsCss).toMatch(/\.settings-page\s*\{[^}]*overflow-x:\s*hidden;/s);
        expect(settingsCss).toContain('-webkit-overflow-scrolling: touch');
        expect(settingsCss).toContain('env(safe-area-inset-bottom)');
        expect(productionCss).toMatch(/\.containerProduction\s*\{[^}]*overflow:\s*hidden;/s);
    });
});
