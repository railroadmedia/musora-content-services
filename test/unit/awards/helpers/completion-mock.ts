type Collection = { type: string; id: number } | null

export const mockCompletionStates = (db: any, completedIds: number[] = [], collection: Collection = null) => {
  db.contentProgress.getSomeProgressByContentIds.mockImplementation((contentIds: number[], requestedCollection: Collection) => {
    const collectionMatches = !collection || (
      requestedCollection?.type === collection.type &&
      requestedCollection?.id === collection.id
    )

    const completedRecords = contentIds
      .filter(id => completedIds.includes(id) && collectionMatches)
      .map(id => ({
        content_id: id,
        state: 'completed',
        created_at: Math.floor(Date.now() / 1000)
      }))

    return Promise.resolve({ data: completedRecords })
  })
}

export const mockAllCompleted = (db: any) => {
  db.contentProgress.getSomeProgressByContentIds.mockImplementation((contentIds: number[]) => {
    const completedRecords = contentIds.map(id => ({
      content_id: id,
      state: 'completed',
      created_at: Math.floor(Date.now() / 1000)
    }))

    return Promise.resolve({ data: completedRecords })
  })
}

export const mockNoneCompleted = (db: any) => {
  db.contentProgress.getSomeProgressByContentIds.mockResolvedValue({ data: [] })
}

export const mockCollectionAwareCompletion = (db: any, completionMap: Record<string, boolean>) => {
  db.contentProgress.getSomeProgressByContentIds.mockImplementation((contentIds: number[], collection: Collection) => {
    const completedRecords = contentIds
      .filter(id => {
        const key = collection
          ? `${id}:${collection.type}:${collection.id}`
          : `${id}`
        const nullKey = `${id}`
        return completionMap[key] || (!collection && completionMap[nullKey])
      })
      .map(id => ({
        content_id: id,
        state: 'completed',
        created_at: Math.floor(Date.now() / 1000)
      }))

    return Promise.resolve({ data: completedRecords })
  })
}
