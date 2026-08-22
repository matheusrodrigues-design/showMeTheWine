export interface DailyTip {
  title: string;
  editorial: string;
  wineName: string;
  wineId: string | null;
  weatherSummary: string;
  temperatureC: number;
  locationLabel: string;
  pairingRationale: string;
  fromCache: boolean;
}
