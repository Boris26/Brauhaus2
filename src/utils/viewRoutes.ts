import { Views } from '../enums/eViews';

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
};

export const getPathForView = (view: Views): string => viewToPath[view];

export const getViewForPath = (path: string): Views => {
  const normalized = path.toLowerCase().replace(/\/$/, '') || '/';
  const match = (Object.entries(viewToPath) as Array<[string, string]>).find(([, route]) => route === normalized);
  return match ? Number(match[0]) as Views : Views.MAIN;
};

export const resolveInitialView = (): Views => {
  if (typeof window === 'undefined') return Views.MAIN;
  return getViewForPath(window.location.pathname);
};

export const pushViewPath = (view: Views): void => {
  if (typeof window === 'undefined' || !window.history?.pushState) return;
  const nextPath = getPathForView(view);
  if (window.location.pathname !== nextPath) {
    window.history.pushState(null, '', nextPath);
  }
};
