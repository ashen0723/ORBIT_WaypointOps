import { BadRequestException } from '@nestjs/common';
import { Brand, TempRequirement } from '../generated/prisma/client';

const items = [
  ['fresh-whole-milk-2l', 'Whole milk 2L', Brand.FRESH, TempRequirement.CHILLED, 'cases', 12.4, 0.018],
  ['fresh-greek-yogurt-500g', 'Greek yogurt 500g', Brand.FRESH, TempRequirement.CHILLED, 'cases', 6.2, 0.012],
  ['fresh-chicken-breast-1kg', 'Chicken breast 1kg', Brand.FRESH, TempRequirement.CHILLED, 'cases', 8.5, 0.016],
  ['fresh-mixed-salad-200g', 'Mixed salad 200g', Brand.FRESH, TempRequirement.CHILLED, 'crates', 2.4, 0.03],
  ['fresh-cheddar-block-400g', 'Cheddar block 400g', Brand.FRESH, TempRequirement.CHILLED, 'cases', 4.1, 0.008],
  ['fresh-frozen-peas-1kg', 'Frozen peas 1kg', Brand.FRESH, TempRequirement.CHILLED, 'cases', 10.2, 0.02],
  ['fresh-sourdough-loaf', 'Sourdough loaf', Brand.FRESH, TempRequirement.AMBIENT, 'crates', 6.4, 0.04],
  ['fresh-basmati-rice-5kg', 'Basmati rice 5kg', Brand.FRESH, TempRequirement.AMBIENT, 'cases', 20.5, 0.03],
  ['fresh-chopped-tomatoes-400g', 'Chopped tomatoes 400g', Brand.FRESH, TempRequirement.AMBIENT, 'cases', 10.1, 0.012],
  ['fresh-penne-500g', 'Penne 500g', Brand.FRESH, TempRequirement.AMBIENT, 'cases', 10.2, 0.022],
  ['fresh-olive-oil-1l', 'Olive oil 1L', Brand.FRESH, TempRequirement.AMBIENT, 'cases', 5.9, 0.009],
  ['style-cotton-tee-assorted', 'Cotton tee, assorted', Brand.STYLE, TempRequirement.AMBIENT, 'cases', 3.1, 0.04],
  ['style-denim-jeans-slim', 'Denim jeans, slim', Brand.STYLE, TempRequirement.AMBIENT, 'cases', 7.8, 0.05],
  ['style-canvas-tote', 'Canvas tote', Brand.STYLE, TempRequirement.AMBIENT, 'units', 0.3, 0.002],
  ['style-crew-socks-3-pack', 'Crew socks 3-pack', Brand.STYLE, TempRequirement.AMBIENT, 'cases', 2.2, 0.02],
  ['tech-microwave-20l', 'Microwave 20L', Brand.TECH, TempRequirement.AMBIENT, 'units', 11.5, 0.06],
  ['tech-air-fryer-4l', 'Air fryer 4L', Brand.TECH, TempRequirement.AMBIENT, 'units', 5.2, 0.04],
  ['tech-electric-kettle-1-7l', 'Electric kettle 1.7L', Brand.TECH, TempRequirement.AMBIENT, 'units', 1.4, 0.01],
  ['tech-steam-iron', 'Steam iron', Brand.TECH, TempRequirement.AMBIENT, 'units', 1.6, 0.008],
] as const;

export const catalog = items.map(([id, name, brand, temp, unit, weightKg, volumeM3]) => ({ id, name, brand, temp, unit, weightKg, volumeM3 }));

function invalid(message: string): never {
  throw new BadRequestException({ code: 'INVALID_ORDER', message, details: [] });
}

export function validateOrderInput(value: unknown, brand: Brand) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid('Provide an order object.');
  const body = value as Record<string, unknown>;
  if ('outletId' in body || 'brand' in body || 'units' in body || 'weightKg' in body || 'volumeM3' in body) invalid('Outlet, brand, and totals are calculated by the server.');
  if (typeof body.clientActionId !== 'string' || !/^[a-zA-Z0-9_-]{8,100}$/.test(body.clientActionId)) invalid('Provide a valid clientActionId.');
  if (!Object.values(TempRequirement).includes(body.temp as TempRequirement)) invalid('Choose AMBIENT, CHILLED, or FROZEN.');
  const requestedDate = typeof body.requestedDate === 'string' ? new Date(`${body.requestedDate}T00:00:00.000Z`) : new Date(NaN);
  if (typeof body.requestedDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.requestedDate) || Number.isNaN(requestedDate.getTime()) || requestedDate.toISOString().slice(0, 10) !== body.requestedDate) invalid('Use a valid requestedDate in YYYY-MM-DD format.');
  if (!Array.isArray(body.lines) || body.lines.length === 0 || body.lines.length > 100) invalid('Provide between 1 and 100 order lines.');
  const seen = new Set<string>();
  const lines = body.lines.map((raw: unknown, index: number) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) invalid(`Line ${index + 1} is invalid.`);
    const line = raw as Record<string, unknown>;
    if (typeof line.catalogItemId !== 'string' || !Number.isSafeInteger(line.requestedQty) || (line.requestedQty as number) <= 0) invalid(`Line ${index + 1} needs a catalog item and positive quantity.`);
    if (seen.has(line.catalogItemId)) invalid('Duplicate catalog items are not allowed.');
    seen.add(line.catalogItemId);
    const product = catalog.find(item => item.id === line.catalogItemId && item.brand === brand && item.temp === body.temp);
    if (!product) invalid(`Line ${index + 1} is unavailable for this outlet and temperature.`);
    return { item: product.name, unit: product.unit, requestedQty: line.requestedQty as number, weightKg: product.weightKg * (line.requestedQty as number), volumeM3: product.volumeM3 * (line.requestedQty as number) };
  });
  return {
    clientActionId: body.clientActionId as string,
    submittedDate: body.requestedDate as string,
    temp: body.temp as TempRequirement,
    units: lines.reduce((sum, line) => sum + line.requestedQty, 0),
    weightKg: Number(lines.reduce((sum, line) => sum + line.weightKg, 0).toFixed(3)),
    volumeM3: Number(lines.reduce((sum, line) => sum + line.volumeM3, 0).toFixed(4)),
    lines: lines.map(({ item, unit, requestedQty }) => ({ item, unit, requestedQty })),
  };
}
