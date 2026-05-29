import type { ContestViewModel } from '../service-types.ts';

// 比赛页目前还是占位实现，所以这里先直接返回内存中的假数据。
export function buildPlaceholderContests(): ContestViewModel[] {
  return [
    {
      id: 'practice-may',
      title: 'May Practice Contest',
      status: 'Upcoming',
      startAtText: '2026-05-20 19:00',
      endAtText: '2026-05-20 21:00',
      description: 'A simple training contest for class practice.',
    },
    {
      id: 'weekly-ladder',
      title: 'Weekly Ladder',
      status: 'Open Practice',
      startAtText: 'Every Monday 18:00',
      endAtText: 'Every Sunday 22:00',
      description: 'A rolling ladder page used as a placeholder for future contest support.',
    },
  ];
}
