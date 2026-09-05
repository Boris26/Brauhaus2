import { Views } from '../enums/eViews';
import { UiMode } from '../enums/eUiMode';
import { getUiMode } from './uiMode';
import { CONTROLLER_HOME_VIEW, isViewAllowed } from './viewConfig';

const viewToPath: Record<Views, string> = {
  [Views.DASHBOARD]: '/dashboard',
  [Views.MAIN]: '/',
  [Views.PRODUCTION]: '/production',
  [Views.DATABASE]: '/database',
  [Views.FINISHED_BREWS]: '/finished-brews',
  [Views.BREWING_CALCULATIONS]: '/brewing-calculations',
  [Views.INGREDIENTS]: '/ingredients',
  [Views.SETTINGS]: '/settings',
  [Views.VERSION]: '/version',
  [Views.MEASUREMENT_DATA]: '/finished-brews/measurements',
};

const measurementPathPattern = /^\/finished-brews\/([^/]+)\/measurements$/;

export const getMeasurementDataPath = (finishedBeerId: string): string =>
  `/finished-brews/${encodeURIComponent(finishedBeerId)}/measurements`;

export const getFinishedBeerIdFromPath = (path: string): string | undefined => {
  const match = path.replace(/\/$/, '').match(measurementPathPattern);
  if (!match) return undefined;
  try { return decodeURIComponent(match[1]); } catch (_) { return undefined; }
};

export const getPathForView = (view: Views): string => viewToPath[view];

export const getViewForPath = (path: string, mode: UiMode = getUiMode()): Views => {
  const normalized = path.toLowerCase().replace(/\/$/, '') || '/';
  if (measurementPathPattern.test(normalized)) return mode === UiMode.DESKTOP ? Views.MEASUREMENT_DATA : CONTROLLER_HOME_VIEW;
  if (mode === UiMode.CONTROLLER && normalized === '/beers') return Views.MAIN;
  const match = (Object.entries(viewToPath) as Array<[string, string]>).find(([, route]) => route === normalized);
  const matchedView = match ? Number(match[0]) as Views : undefined;
  if (mode === UiMode.CONTROLLER) {
    if (normalized === '/') return CONTROLLER_HOME_VIEW;
    return matchedView !== undefined && isViewAllowed(matchedView, mode)
      ? matchedView
      : CONTROLLER_HOME_VIEW;
  }
  return matchedView ?? Views.MAIN;
};

export const resolveInitialView = (): Views => {
  const mode = getUiMode();
  if (typeof window === 'undefined') return mode === UiMode.CONTROLLER ? CONTROLLER_HOME_VIEW : Views.MAIN;
  const view = getViewForPath(window.location.pathname, mode);
  const resolvedPath = mode === UiMode.CONTROLLER && view === Views.MAIN ? '/beers' : getPathForView(view);
  if (mode === UiMode.CONTROLLER && window.location.pathname !== resolvedPath) {
    window.history?.replaceState?.(null, '', resolvedPath);
  }
  return view;
};

export const pushViewPath = (view: Views): void => {
  if (typeof window === 'undefined' || !window.history?.pushState) return;
  const mode = getUiMode();
  const allowedView = isViewAllowed(view, mode) ? view : CONTROLLER_HOME_VIEW;
  const nextPath = mode === UiMode.CONTROLLER && allowedView === Views.MAIN
    ? '/beers'
    : getPathForView(allowedView);
  if (window.location.pathname !== nextPath) {
    window.history.pushState(null, '', nextPath);
  }
};
