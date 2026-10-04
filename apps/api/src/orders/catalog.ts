import type { Brand, TempRequirement } from '../generated/prisma/client';
export interface CatalogProduct { name: string; brand: Brand; temp: TempRequirement; unit: string; kg: number; m3: number; }
// Server-owned sample catalog copied from the submitted Store Manager design.
export const ORDER_CATALOG: CatalogProduct[] = [
{ name: 'Whole milk 2L', brand: 'FRESH', temp: 'CHILLED', unit: 'cases', kg: 12.4, m3: 0.018 },
{ name: 'Greek yogurt 500g', brand: 'FRESH', temp: 'CHILLED', unit: 'cases', kg: 6.2, m3: 0.012 },
{ name: 'Chicken breast 1kg', brand: 'FRESH', temp: 'CHILLED', unit: 'cases', kg: 8.5, m3: 0.016 },
{ name: 'Mixed salad 200g', brand: 'FRESH', temp: 'CHILLED', unit: 'crates', kg: 2.4, m3: 0.03 },
{ name: 'Cheddar block 400g', brand: 'FRESH', temp: 'CHILLED', unit: 'cases', kg: 4.1, m3: 0.008 },
{ name: 'Frozen peas 1kg', brand: 'FRESH', temp: 'CHILLED', unit: 'cases', kg: 10.2, m3: 0.02 },
{ name: 'Sourdough loaf', brand: 'FRESH', temp: 'AMBIENT', unit: 'crates', kg: 6.4, m3: 0.04 },
{ name: 'Basmati rice 5kg', brand: 'FRESH', temp: 'AMBIENT', unit: 'cases', kg: 20.5, m3: 0.03 },
{ name: 'Chopped tomatoes 400g', brand: 'FRESH', temp: 'AMBIENT', unit: 'cases', kg: 10.1, m3: 0.012 },
{ name: 'Penne 500g', brand: 'FRESH', temp: 'AMBIENT', unit: 'cases', kg: 10.2, m3: 0.022 },
{ name: 'Olive oil 1L', brand: 'FRESH', temp: 'AMBIENT', unit: 'cases', kg: 5.9, m3: 0.009 },
{ name: 'Cotton tee, assorted', brand: 'STYLE', temp: 'AMBIENT', unit: 'cases', kg: 3.1, m3: 0.04 },
{ name: 'Denim jeans, slim', brand: 'STYLE', temp: 'AMBIENT', unit: 'cases', kg: 7.8, m3: 0.05 },
{ name: 'Canvas tote', brand: 'STYLE', temp: 'AMBIENT', unit: 'units', kg: 0.3, m3: 0.002 },
{ name: 'Crew socks 3-pack', brand: 'STYLE', temp: 'AMBIENT', unit: 'cases', kg: 2.2, m3: 0.02 },
{ name: 'Microwave 20L', brand: 'TECH', temp: 'AMBIENT', unit: 'units', kg: 11.5, m3: 0.06 },
{ name: 'Air fryer 4L', brand: 'TECH', temp: 'AMBIENT', unit: 'units', kg: 5.2, m3: 0.04 },
{ name: 'Electric kettle 1.7L', brand: 'TECH', temp: 'AMBIENT', unit: 'units', kg: 1.4, m3: 0.01 },
{ name: 'Steam iron', brand: 'TECH', temp: 'AMBIENT', unit: 'units', kg: 1.6, m3: 0.008 }];
