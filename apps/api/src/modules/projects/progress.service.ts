export interface ProgressResult {
  totalCategories: number;
  populatedCategories: number;
  percentage: number;
}

export const FIXED_CATEGORY_COUNT = 16;

/**
 * Calculates project progress based on the 16 counted categories:
 * Formula: (Count of folders with at least 1 document / 16) * 100
 * Any file in a category counts as 100% for that folder, regardless of approval.
 */
export function calculateProgress(populatedCategories: number, totalCategories: number = FIXED_CATEGORY_COUNT): ProgressResult {
  if (totalCategories <= 0) {
    return { totalCategories: 0, populatedCategories: 0, percentage: 0.0 };
  }

  const boundedPopulated = Math.max(0, Math.min(populatedCategories, totalCategories));
  const rawPercentage = (boundedPopulated / totalCategories) * 100;
  // Round to 2 decimal places
  const percentage = Math.round(rawPercentage * 100) / 100;

  return {
    totalCategories,
    populatedCategories: boundedPopulated,
    percentage,
  };
}

/**
 * Meaningful progress change evaluator:
 * Only sends progress notifications when the calculated percentage changes.
 */
export function isMeaningfulProgressChange(oldPercentage: number, newPercentage: number): boolean {
  return Math.abs(newPercentage - oldPercentage) >= 0.01;
}
