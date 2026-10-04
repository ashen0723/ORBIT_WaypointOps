import type { Brand } from '../../types/orders';

const STYLES: Record<Brand, string> = {
  Fresh: 'bg-forest text-white',
  Style: 'bg-brand text-white',
  Tech: 'bg-brand-mint text-forest'
};

export function BrandTag({ brand }: {brand: Brand;}) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${STYLES[brand]}`}>
      {brand}
    </span>);

}