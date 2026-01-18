export function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function dateInDays(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export function today(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

export const NORTHERN_IRELAND_COUNTIES = [
  "County Antrim",
  "County Armagh",
  "County Down",
  "County Fermanagh",
  "County Londonderry",
  "County Tyrone",
];

export function isNorthernIreland(city: string): boolean {
  return NORTHERN_IRELAND_COUNTIES.some((county) => city.includes(county));
}
