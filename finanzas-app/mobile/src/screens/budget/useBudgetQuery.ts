import { useQuery } from '@tanstack/react-query';
import { budgetService } from '../../services/budget.service';

/** The active budget (with income sources, categories and summary); shared by the budget screens. */
export const useBudgetQuery = () =>
  useQuery({
    queryKey: ['budget'],
    queryFn: budgetService.getCurrent,
    staleTime: 0,
    retry: 1,
  });
