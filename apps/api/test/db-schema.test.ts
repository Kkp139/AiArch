import { describe, it, expect } from 'vitest';
import { FIXED_16_CATEGORIES } from '../prisma/seed';

describe('Database Schema & 16-Category Structure', () => {
  it('defines exactly 16 fixed categories with correct counting rules', () => {
    expect(FIXED_16_CATEGORIES.length).toBe(16);

    const conceptCats = FIXED_16_CATEGORIES.filter(c => c.phase === 'CONCEPT_DESIGN');
    expect(conceptCats.length).toBe(6);

    const constructionCats = FIXED_16_CATEGORIES.filter(c => c.phase === 'CONSTRUCTION_DESIGN');
    expect(constructionCats.length).toBe(9);

    const otherCat = FIXED_16_CATEGORIES.find(c => c.code === '16_OTHER');
    expect(otherCat).toBeDefined();
    expect(otherCat?.name).toBe('03_OTHER');
    expect(otherCat?.phase).toBe('OTHER');
  });

  it('guarantees unique category codes and sequential display order 1 to 16', () => {
    const codes = new Set(FIXED_16_CATEGORIES.map(c => c.code));
    expect(codes.size).toBe(16);

    const orders = FIXED_16_CATEGORIES.map(c => c.order);
    expect(orders).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
  });
});
