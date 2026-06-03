export interface ProblemSetListViewModel {
  id: string;
  title: string;
  problemRefs: string[];
  isPublished: boolean;
  publishedAtText: string | null;
  updatedAtText: string;
}

export interface ProblemSetProblemRefViewModel {
  pid: string;
  title: string;
  href: string | null;
  status: 'accepted' | 'empty';
  missing: boolean;
}

export interface ProblemSetDetailViewModel extends ProblemSetListViewModel {
  contentMarkdown: string;
  contentHtml: string;
  problemRefsView: ProblemSetProblemRefViewModel[];
}

export interface AdminProblemSetViewModel extends ProblemSetListViewModel {
  contentMarkdown: string;
}

export interface ProblemSetServices {
  listPublishedProblemSets(): Promise<ProblemSetListViewModel[]>;
  getPublishedProblemSetById(id: string): Promise<ProblemSetDetailViewModel | null>;
  listAdminProblemSets(): Promise<AdminProblemSetViewModel[]>;
  getAdminProblemSetById(id: string): Promise<AdminProblemSetViewModel | null>;
  createProblemSet(input: {
    title: string;
    contentMarkdown: string;
  }): Promise<{ id: string }>;
  updateProblemSet(id: string, input: {
    title: string;
    contentMarkdown: string;
  }): Promise<void>;
  publishProblemSet(id: string): Promise<void>;
  hideProblemSet(id: string): Promise<void>;
  deleteProblemSet(id: string): Promise<void>;
}
