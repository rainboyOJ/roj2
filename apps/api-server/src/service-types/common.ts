export interface PaginationViewModel {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  previousPage: number | null;
  nextPage: number | null;
}
