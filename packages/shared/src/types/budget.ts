export interface ForecastYear {
  fiscalYear: number;
  capex: number;
  opex: number;
  total: number;
  isSpike: boolean;
  breakdown: {
    hardwareReplacement: number;
    hardwareMaintenance: number;
    software: number;
    contracts: number;
  };
}

export interface FiscalYearSettings {
  id: string;
  fiscalYearStartMonth: number;
  defaultEscalationRate: number;
  updatedAt: string;
}

export interface UpdateFiscalYearSettingsInput {
  fiscalYearStartMonth?: number;
  defaultEscalationRate?: number;
}
