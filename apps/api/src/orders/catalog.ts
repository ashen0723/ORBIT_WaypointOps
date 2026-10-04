import { BadRequestException } from '@nestjs/common';
import { Brand, TempRequirement } from '../generated/prisma/client';

export interface OrderItemInput { name: string; qty: number; unit: string }
export interface CreateOrderInput { requestedDate: string; type: 'dry' | 'chilled'; items: OrderItemInput[]; brand?: string }

const products = [
  ['Whole milk 2L', Brand.FRESH, TempRequirement.CHILLED, 'cases', 12.4, 0.018],
  ['Greek yogurt 500g', Brand.FRESH, TempRequirement.CHILLED, 'cases', 6.2, 0.012],
  ['Chicken breast 1kg', Brand.FRESH, TempRequirement.CHILLED, 'cases', 8.5, 0.016],
  ['Mixed salad 200g', Brand.FRESH, TempRequirement.CHILLED, 'crates', 2.4, 0.03],
  ['Cheddar block 400g', Brand.FRESH, TempRequirement.CHILLED, 'cases', 4.1, 0.008],
  ['Frozen peas 1kg', Brand.FRESH, TempRequirement.CHILLED, 'cases', 10.2, 0.02],
  ['Sourdough loaf', Brand.FRESH, TempRequirement.AMBIENT, 'crates', 6.4, 0.04],
  ['Basmati rice 5kg', Brand.FRESH, TempRequirement.AMBIENT, 'cases', 20.5, 0.03],
  ['Chopped tomatoes 400g', Brand.FRESH, TempRequirement.AMBIENT, 'cases', 10.1, 0.012],
  ['Penne 500g', Brand.FRESH, TempRequirement.AMBIENT, 'cases', 10.2, 0.022],
  ['Olive oil 1L', Brand.FRESH, TempRequirement.AMBIENT, 'cases', 5.9, 0.009],
  ['Cotton tee, assorted', Brand.STYLE, TempRequirement.AMBIENT, 'cases', 3.1, 0.04],
  ['Denim jeans, slim', Brand.STYLE, TempRequirement.AMBIENT, 'cases', 7.8, 0.05],
  ['Canvas tote', Brand.STYLE, TempRequirement.AMBIENT, 'units', 0.3, 0.002],
  ['Crew socks 3-pack', Brand.STYLE, TempRequirement.AMBIENT, 'cases', 2.2, 0.02],
  ['Microwave 20L', Brand.TECH, TempRequirement.AMBIENT, 'units', 11.5, 0.06],
  ['Air fryer 4L', Brand.TECH, TempRequirement.AMBIENT, 'units', 5.2, 0.04],
  ['Electric kettle 1.7L', Brand.TECH, TempRequirement.AMBIENT, 'units', 1.4, 0.01],
  ['Steam iron', Brand.TECH, TempRequirement.AMBIENT, 'units', 1.6, 0.008],
] as const;

function invalid(message: string, details: unknown[] = []): never {
  throw new BadRequestException({ code: 'INVALID_ORDER', message, details });
}

export function validateOrderInput(value: unknown, brand: Brand) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid('Provide an order object.');
  const body = value as Record<string, unknown>;
  if ('outletId' in body || 'outlet_id' in body) invalid('The outlet is determined from your account.');
  if (body.brand !== undefined && String(body.brand).toUpperCase() !== brand) invalid('Order brand must match your outlet.');
  if (body.type !== 'dry' && body.type !== 'chilled') invalid('Choose dry or chilled delivery.');
  if (body.type === 'chilled' && brand !== Brand.FRESH) invalid('Only Fresh outlets can place chilled orders.');
  const requestedDate = typeof body.requestedDate === 'string' ? new Date(`${body.requestedDate}T00:00:00.000Z`) : new Date(NaN);
  if (typeof body.requestedDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.requestedDate) ||
      Number.isNaN(requestedDate.getTime()) || requestedDate.toISOString().slice(0, 10) !== body.requestedDate) {
    invalid('Use a valid requestedDate in YYYY-MM-DD format.');
  }
  if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 100) invalid('Add between 1 and 100 order items.');

  const temp = body.type === 'chilled' ? TempRequirement.CHILLED : TempRequirement.AMBIENT;
  const lines = (body.items as unknown[]).map((raw, index) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) invalid(`Item ${index + 1} is invalid.`);
    const item = raw as Record<string, unknown>;
    if (typeof item.name !== 'string' || typeof item.unit !== 'string' || !Number.isInteger(item.qty) || (item.qty as number) <= 0) {
      invalid(`Item ${index + 1} needs a name, unit, and positive whole-number quantity.`);
    }
    const product = products.find(([name, productBrand, productTemp, unit]) =>
      name.toLowerCase() === (item.name as string).trim().toLowerCase() && productBrand === brand && productTemp === temp && unit === item.unit);
    if (!product) invalid(`Item ${index + 1} is not in the ${brand.toLowerCase()} ${body.type} catalogue.`);
    return { item: product[0], unit: product[3], requestedQty: item.qty as number, weightKg: product[4] * (item.qty as number), volumeM3: product[5] * (item.qty as number) };
  });
  return {
    submittedDate: body.requestedDate as string,
    temp,
    units: lines.reduce((sum, line) => sum + line.requestedQty, 0),
    weightKg: Number(lines.reduce((sum, line) => sum + line.weightKg, 0).toFixed(3)),
    volumeM3: Number(lines.reduce((sum, line) => sum + line.volumeM3, 0).toFixed(4)),
    lines: lines.map(({ item, unit, requestedQty }) => ({ item, unit, requestedQty })),
  };
}
