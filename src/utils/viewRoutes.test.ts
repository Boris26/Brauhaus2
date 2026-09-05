import {UiMode} from '../enums/eUiMode';
import {Views} from '../enums/eViews';
import {getFinishedBeerIdFromPath, getMeasurementDataPath, getViewForPath} from './viewRoutes';

describe('measurement data route', () => {
  it('builds and resolves the route including encoded finished-beer ids', () => {
    const path = getMeasurementDataPath('brew/id 1');
    expect(path).toBe('/finished-brews/brew%2Fid%201/measurements');
    expect(getFinishedBeerIdFromPath(path)).toBe('brew/id 1');
    expect(getViewForPath(path, UiMode.DESKTOP)).toBe(Views.MEASUREMENT_DATA);
  });
});
