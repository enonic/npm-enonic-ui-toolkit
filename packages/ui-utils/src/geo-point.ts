/** A latitude and a longitude — XP's `GeoPoint`, `59.91,10.75` on the wire. */
export class GeoPoint {
  private readonly latitude: number;
  private readonly longitude: number;

  constructor(latitude: number, longitude: number) {
    if (!GeoPoint.isValid(latitude, longitude)) {
      throw new Error(`Invalid GeoPoint: ${latitude},${longitude}`);
    }
    this.latitude = latitude;
    this.longitude = longitude;
  }

  static isValid(latitude: number, longitude: number): boolean {
    return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
  }

  /** `latitude,longitude`, both numbers and both in range. */
  static isValidString(value: string): boolean {
    return parse(value) != null;
  }

  static fromString(value: string): GeoPoint {
    const parsed = parse(value);
    if (parsed == null) {
      throw new Error(`Cannot parse GeoPoint from string: ${value}`);
    }
    return new GeoPoint(parsed[0], parsed[1]);
  }

  getLatitude(): number {
    return this.latitude;
  }

  getLongitude(): number {
    return this.longitude;
  }

  toString(): string {
    return `${this.latitude},${this.longitude}`;
  }

  equals(other: unknown): boolean {
    return (
      other instanceof GeoPoint &&
      other.latitude === this.latitude &&
      other.longitude === this.longitude
    );
  }
}

function parse(value: string): [number, number] | undefined {
  const parts = value.split(',');
  if (parts.length !== 2 || parts[0] == null || parts[1] == null) {
    return undefined;
  }
  const latitude = toNumber(parts[0]);
  const longitude = toNumber(parts[1]);
  if (latitude == null || longitude == null || !GeoPoint.isValid(latitude, longitude)) {
    return undefined;
  }
  return [latitude, longitude];
}

function toNumber(part: string): number | undefined {
  const trimmed = part.trim();
  if (trimmed === '') {
    return undefined;
  }
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : undefined;
}
