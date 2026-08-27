import type { Asset, Venue } from '@/api/contracts';

/** Persian unit noun for an asset's quantity — "۴ گرم", "۲ عدد", "۰٫۲۱ BTC". */
export function unitLabel(asset: Asset | undefined): string {
  if (!asset) return '';
  switch (asset.unit) {
    case 'gram':
      return 'گرم';
    case 'piece':
      return 'عدد';
    default:
      return asset.symbol;
  }
}

export const VENUE_KIND_LABEL: Record<Venue['kind'], string> = {
  'gold-platform': 'پلتفرم طلا',
  exchange: 'صرافی',
  physical: 'فیزیکی',
  market: 'بازار',
};
