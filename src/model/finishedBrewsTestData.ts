import {FinishedBrew} from "./FinishedBrew";


export const finishedBrewsTestData: FinishedBrew[] = [
  {
    id: 1,
    name: "Helles Sommerbier",
    startDate: new Date(),
    endDate: "27.05.2025",
    liters: 25,
    originalwort: 12.5,
    residualExtract: 2.8,
    aktiv: true,
    description: "Leichtes, süffiges Bier für warme Tage."
  },
  {
    id: 2,
    name: "Dunkles Bockbier",
    startDate: "20.05.2025",
    endDate: "27.05.2025",
    liters: 20,
    originalwort: 18.2,
    residualExtract: 4.1,
    aktiv: false,
    description: "Kräftig malzig, mit feiner Karamellnote."
  },
  {
    id: 3,
    name: "Weizenbier",
    startDate: "20.05.2024",
    endDate: "27.05.2024",
    liters: 30,
    originalwort: 13.0,
    residualExtract: 3.2,
    aktiv: false,
    description: "Fruchtig, spritzig, typisch bayerisch."
  }
];
