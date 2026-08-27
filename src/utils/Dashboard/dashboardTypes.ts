export interface DashboardKpis {
  recipeCount: number;
  brewCount: number;
  totalLiters: number;
  activeBeerCount: number;
  fermentationCount: number;
  maturationCount: number;
  finishedCount: number;
}

export interface DashboardIngredientUsage {
  name: string;
  unit?: string;
  quantity: number;
  brewCount: number;
}

export interface DashboardYeastUsage {
  name: string;
  brewCount: number;
  type?: string;
}

export interface DashboardIngredientSummary {
  malts: DashboardIngredientUsage[];
  hops: DashboardIngredientUsage[];
  yeasts: DashboardYeastUsage[];
  additionalIngredients: DashboardIngredientUsage[];
  linkedBrewCount: number;
}

export interface DashboardMonthlyStat {
  key: string;
  label: string;
  brewCount: number;
  liters: number;
}

export interface DashboardRecipeHistory {
  recipeId: string;
  recipeName: string;
  brewCount: number;
  liters: number;
}

export interface DashboardAdditionalStats {
  averageOriginalWort?: number;
  originalWortSampleCount: number;
  largestBrew?: number;
  smallestBrew?: number;
  lastBrew?: string;
}

export interface DashboardConsumption {
  maltQuantity: number;
  hopQuantity: number;
  yeastUses: number;
  linkedBrewCount: number;
}

export interface DashboardCareHints {
  missingLiters: number;
  missingEndDate: number;
  missingResidualExtract: number;
  activeInvalidStartDate: number;
  missingRecipeLink: number;
}

export interface DashboardActiveBrewRow {
  id: string;
  name: string;
  stateLabel: string;
  state: string;
  startDateLabel: string;
  daysSinceStartLabel: string;
  litersLabel: string;
  originalWortLabel: string;
  residualExtractLabel: string;
  noteLabel: string;
}
