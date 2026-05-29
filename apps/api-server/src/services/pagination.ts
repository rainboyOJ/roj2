import type { PaginationViewModel } from '../service-types.ts';

export function buildPaginationViewModel(input: {
  page: number;
  pageSize: number;
  total: number;
}): PaginationViewModel {
  const totalPages = Math.max(1, Math.ceil(input.total / input.pageSize));
  const page = Math.min(Math.max(input.page, 1), totalPages);

  return {
    page,
    pageSize: input.pageSize,
    total: input.total,
    totalPages,
    previousPage: page > 1 ? page - 1 : null,
    nextPage: page < totalPages ? page + 1 : null,
  };
}
