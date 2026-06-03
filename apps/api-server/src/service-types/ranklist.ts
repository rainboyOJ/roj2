export interface RanklistEntryViewModel {
  rank: number;
  username: string;
  displayName: string;
  className?: string | undefined;
  acceptedCount: number;
  submissionCount: number;
  lastAcceptedAt: string | null;
}

export interface RanklistFilters {
  className?: string;
}

export interface RanklistServices {
  listRanklist(filters?: RanklistFilters): Promise<RanklistEntryViewModel[]>;
}
