export type {
  PaginationViewModel,
} from './service-types/common.ts';
export type {
  ContestServices,
  ContestViewModel,
} from './service-types/contests.ts';
export type {
  ClassViewModel,
  DictionaryServices,
  GradeViewModel,
} from './service-types/dictionaries.ts';
export type {
  AdminProblemSetViewModel,
  ProblemSetDetailViewModel,
  ProblemSetListViewModel,
  ProblemSetProblemRefViewModel,
  ProblemSetServices,
} from './service-types/problem-sets.ts';
export type {
  AdminProblemListFilters,
  AdminProblemViewModel,
  PaginatedProblemsViewModel,
  ProblemListFilters,
  ProblemListProgressFilter,
  ProblemListQueryFilters,
  ProblemListViewModel,
  ProblemProgress,
  ProblemServices,
  ProblemViewModel,
} from './service-types/problems.ts';
export type {
  RanklistEntryViewModel,
  RanklistFilters,
  RanklistServices,
} from './service-types/ranklist.ts';
export type {
  LanguageSettingsViewModel,
  PaginationSettingsViewModel,
  SettingsServices,
} from './service-types/settings.ts';
export type {
  CreateSubmissionResult,
  PaginatedSubmissionsViewModel,
  SubmissionListFilters,
  SubmissionServices,
  SubmissionViewModel,
} from './service-types/submissions.ts';
export type {
  AdminUserListFilters,
  PaginatedAdminUsersViewModel,
  PublicUserProfileViewModel,
  SessionUser,
  UserProfileProblemViewModel,
  UserServices,
} from './service-types/users.ts';

import type { ContestServices } from './service-types/contests.ts';
import type { DictionaryServices } from './service-types/dictionaries.ts';
import type { ProblemSetServices } from './service-types/problem-sets.ts';
import type { ProblemServices } from './service-types/problems.ts';
import type { RanklistServices } from './service-types/ranklist.ts';
import type { SettingsServices } from './service-types/settings.ts';
import type { SubmissionServices } from './service-types/submissions.ts';
import type { UserServices } from './service-types/users.ts';

export interface ApiServerServices
  extends ProblemServices,
    ProblemSetServices,
    SubmissionServices,
    UserServices,
    DictionaryServices,
    SettingsServices,
    RanklistServices,
    ContestServices {}
