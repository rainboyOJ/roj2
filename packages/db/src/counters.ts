import type { Collection } from 'mongodb';
import type { CounterDocument } from '@roj/shared';

export async function nextCounterValue(
  counters: Collection<CounterDocument>,
  counterId: string,
) {
  const now = new Date();
  const result = await counters.findOneAndUpdate(
    { _id: counterId },
    {
      $inc: { value: 1 },
      $set: { updatedAt: now },
    },
    {
      upsert: true,
      returnDocument: 'after',
    },
  );

  if (!result) {
    throw new Error(`failed to allocate counter ${counterId}`);
  }
  return result.value;
}
