import {FinishedBrew} from "./FinishedBrew";
import {eBrewState} from "../enums/eBrewState";


export const finishedBrewsTestData: FinishedBrew[] = [
  {
    id: '1',
    name: "Helles Sommerbier",
    startDate: new Date(),
    endDate: "27.05.2025",
    liters: 25,
    originalwort: 12.5,
    residual_extract: 2.8,
    active: true,
    note: "Leichtes, süffiges Bier für warme Tage.",
    state: eBrewState.Finished
  },
  {
    id: '2',
    name: "Dunkles Bockbier",
    startDate: "20.05.2025",
    endDate: "27.05.2025",
    liters: 20,
    originalwort: 18.2,
    residual_extract: null,
    active: true,
    note: "Kräftig malzig, mit feiner Karamellnote.",
    state: eBrewState.Maturation
  },
  {
    id: '3',
    name: "Weizenbier",
    startDate: "20.05.2024",
    endDate: "27.05.2024",
    liters: 30,
    originalwort: 13.0,
    residual_extract: 3.2,
    active: false,
    note: "Fruchtig, spritzig, typisch bayerisch.",
    state: eBrewState.Fermentation
  }
];
