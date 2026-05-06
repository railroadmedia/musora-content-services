// note: could move these to a src/services/__mocks__/ dir with sanity.mock.ts & content-progress-observer.mock.ts
//  & learning-paths.mock.ts if these are used across multiple test files
export const mockContentProgressObserver = () => ({
  contentProgressObserver: {
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn(),
  },
})

export const mockSanity = () => ({
  getHierarchy: jest.fn((contentId: number) => Promise.resolve({
    metadata: { [contentId]: { brand: 'drumeo', type: 'lesson', parent_id: 0 } },
    parents: {},
    children: {},
  })),
  getHierarchies: jest.fn((contentIds: number[]) => Promise.resolve({
    metadata: Object.fromEntries(
      contentIds.map(id => [id, { brand: 'drumeo', type: 'lesson', parent_id: 0 }])
    ),
    parents: {},
    children: {},
  })),
  getSanityDate: jest.fn((date: Date) => date.toISOString()),
})

export const mockLearningPaths = () => ({
  getDailySession: jest.fn().mockResolvedValue(null),
  onContentCompletedLearningPathActions: jest.fn().mockResolvedValue(undefined),
})

export const mockProgressEvents = () => ({
  emitProgressSaved: jest.fn(),
})
