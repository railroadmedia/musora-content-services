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
