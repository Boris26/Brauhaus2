import { Views } from '../enums/eViews';
import { UiMode } from '../enums/eUiMode';
import { getNavigationViews } from './viewConfig';
import { getViewForPath } from './viewRoutes';

describe('mode-aware navigation and routes', () => {
    it('keeps every existing desktop navigation entry', () => {
        expect(getNavigationViews(UiMode.DESKTOP)).toEqual(expect.arrayContaining(Object.values(Views).filter(Number.isInteger)));
    });

    it('limits controller navigation to production, beer list and settings', () => {
        expect(getNavigationViews(UiMode.CONTROLLER)).toEqual([
            Views.PRODUCTION,
            Views.MAIN,
            Views.SETTINGS,
        ]);
    });

    it.each([
        ['/', Views.PRODUCTION],
        ['/database', Views.PRODUCTION],
        ['/unknown', Views.PRODUCTION],
        ['/settings', Views.SETTINGS],
        ['/beers', Views.MAIN],
        ['/production', Views.PRODUCTION],
    ])('resolves controller path %s', (path, expected) => {
        expect(getViewForPath(path, UiMode.CONTROLLER)).toBe(expected);
    });
});
