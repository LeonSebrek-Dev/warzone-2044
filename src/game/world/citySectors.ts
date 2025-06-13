// City sector definitions for Futuristic High-Tech Luxury Tokyo
// Each sector has a type, visual style, and city elements

export type SectorType =
  | 'neon_downtown'
  | 'luxury_district'
  | 'industrial_zone'
  | 'chinatown'
  | 'tech_market'
  | 'residential'
  | 'park';

export interface CityElement {
  type: 'building' | 'road' | 'car' | 'prop';
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  style?: string; // e.g. neon, luxury, etc.
  interactive?: boolean;
}

export interface CitySectorConfig {
  id: string;
  type: SectorType;
  x: number;
  y: number;
  width: number;
  height: number;
  elements: CityElement[];
}

// Example sector configs (expand as needed)
export const citySectors: CitySectorConfig[] = [
  {
    id: 'sector_neon_1',
    type: 'neon_downtown',
    x: 0,
    y: 0,
    width: 2000,
    height: 2000,
    elements: [
      { type: 'road', x: 0, y: 900, width: 2000, height: 200, style: 'neon' },
      { type: 'building', x: 200, y: 200, width: 300, height: 600, style: 'neon' },
      { type: 'car', x: 400, y: 950, width: 60, height: 30, style: 'luxury', interactive: false },
      { type: 'prop', x: 600, y: 1000, style: 'vending_machine', interactive: true },
      // ...more elements
    ],
  },
  {
    id: 'sector_luxury_1',
    type: 'luxury_district',
    x: 2000,
    y: 0,
    width: 2000,
    height: 2000,
    elements: [
      { type: 'road', x: 2000, y: 900, width: 2000, height: 200, style: 'luxury' },
      { type: 'building', x: 2200, y: 300, width: 400, height: 900, style: 'gold_glass' },
      { type: 'car', x: 2500, y: 950, width: 70, height: 32, style: 'supercar', interactive: false },
      { type: 'prop', x: 2600, y: 1100, style: 'digital_billboard', interactive: true },
      // ...more elements
    ],
  },
  // ...add more sectors for industrial, chinatown, tech_market, etc.
];

// Ready for expansion: add more sectors, elements, and interactivity as needed.
