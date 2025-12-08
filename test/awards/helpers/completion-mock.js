export const mockCompletionStates = (db, completedIds = [], collection = null) => {
  db.contentProgress.getSomeProgressByContentIds.mockImplementation((contentIds, requestedCollection) => {
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

export const mockAllCompleted = (db) => {
  db.contentProgress.getSomeProgressByContentIds.mockImplementation((contentIds) => {
    const completedRecords = contentIds.map(id => ({
      content_id: id,
      state: 'completed',
      created_at: Math.floor(Date.now() / 1000)
    }))

    return Promise.resolve({ data: completedRecords })
  })
}

export const mockNoneCompleted = (db) => {
  db.contentProgress.getSomeProgressByContentIds.mockResolvedValue({ data: [] })
}

export const mockCollectionAwareCompletion = (db, completionMap) => {
  db.contentProgress.getSomeProgressByContentIds.mockImplementation((contentIds, collection) => {
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
