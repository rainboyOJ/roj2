export interface ContestViewModel {
  id: string;
  title: string;
  status: string;
  startAtText: string;
  endAtText: string;
  description: string;
}

export interface ContestServices {
  listContests(): Promise<ContestViewModel[]>;
  getContestById(id: string): Promise<ContestViewModel | null>;
}
