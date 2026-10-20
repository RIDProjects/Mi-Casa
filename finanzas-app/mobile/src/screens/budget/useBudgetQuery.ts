import { useQuery } from '@tanstack/react-query';
import { budgetService } from '../../services/budget.service';
import { useScreenPolling } from '../../hooks/useScreenPolling';

/** The active budget (with income sources, categories and summary); shared by the budget screens. */
export const useBudgetQuery = () => {
  const pollInterval = useScreenPolling();
  return useQuery({
    queryKey: ['budget'],
    refetchInterval: pollInterval,
    queryFn: budgetService.getCurrent,
    staleTime: 0,
    retry: 1,
  });
};
