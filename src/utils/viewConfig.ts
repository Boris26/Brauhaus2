import { Views } from '../enums/eViews';
import { UiMode } from '../enums/eUiMode';

export const CONTROLLER_HOME_VIEW = Views.PRODUCTION;

export const controllerViews: ReadonlyArray<Views> = [
    Views.PRODUCTION,
    Views.MAIN,
    Views.SETTINGS,
];

export const isViewAllowed = (view: Views, mode: UiMode): boolean =>
    mode === UiMode.DESKTOP || controllerViews.includes(view);

export const getNavigationViews = (mode: UiMode): ReadonlyArray<Views> =>
    mode === UiMode.CONTROLLER
        ? controllerViews
        : [
            Views.DASHBOARD,
            Views.MAIN,
            Views.PRODUCTION,
            Views.DATABASE,
            Views.FINISHED_BREWS,
            Views.BREWING_CALCULATIONS,
            Views.INGREDIENTS,
            Views.SETTINGS,
            Views.VERSION,
        ];
