import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { summaryService } from '../services/summary.service';
import { formatMoney } from '../utils/currency';

/**
 * Formatter bound to the house's local currency (from GET /summary, shared
 * with the dashboard through the ['summary'] query). Until the currency is
 * known it falls back to formatMoney's default.
 */
export function useMoney(): (amount: number, currency?: string) => string {
  const { data } = useQuery({ queryKey: ['summary'], queryFn: summaryService.get, staleTime: 60_000 });
  const local = data?.currency;
  return useCallback((amount: number, currency?: string) => formatMoney(amount, currency ?? local), [local]);
}
