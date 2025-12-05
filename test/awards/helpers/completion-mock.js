export const mockCompletionStates = (db, completedIds = [], collection = null) => {
  db.contentProgress.getOneProgressByContentId.mockImplementation((contentId, options) => {
    const requestedCollection = options?.collection

    const collectionMatches = !collection || (
      requestedCollection?.type === collection.type &&
      requestedCollection?.id === collection.id
    )

    const isCompleted = completedIds.includes(contentId) && collectionMatches

    return Promise.resolve({
      data: isCompleted
        ? { state: 'completed', created_at: Math.floor(Date.now() / 1000) }
        : { state: 'started', created_at: Math.floor(Date.now() / 1000) }
    })
  })

  db.contentProgress.queryOne.mockImplementation((whereClause) => {
    const contentId = whereClause?.comparison?.right?.value
    const isCompleted = completedIds.includes(contentId)

    return Promise.resolve({
      data: isCompleted
        ? { state: 'completed', created_at: Math.floor(Date.now() / 1000) }
        : { state: 'started', created_at: Math.floor(Date.now() / 1000) }
    })
  })
}

export const mockAllCompleted = (db) => {
  db.contentProgress.getOneProgressByContentId.mockResolvedValue({
    data: { state: 'completed', created_at: Math.floor(Date.now() / 1000) }
  })

  db.contentProgress.queryOne.mockResolvedValue({
    data: { state: 'completed', created_at: Math.floor(Date.now() / 1000) }
  })
}

export const mockNoneCompleted = (db) => {
  db.contentProgress.getOneProgressByContentId.mockResolvedValue({
    data: { state: 'started', created_at: Math.floor(Date.now() / 1000) }
  })

  db.contentProgress.queryOne.mockResolvedValue({
    data: { state: 'started', created_at: Math.floor(Date.now() / 1000) }
  })
}

export const mockCollectionAwareCompletion = (db, completionMap) => {
  db.contentProgress.getOneProgressByContentId.mockImplementation((contentId, options) => {
    const collection = options?.collection
    const key = collection
      ? `${contentId}:${collection.type}:${collection.id}`
      : `${contentId}`

    const nullKey = `${contentId}`

    const isCompleted = completionMap[key] || (!collection && completionMap[nullKey])

    return Promise.resolve({
      data: isCompleted
        ? { state: 'completed', created_at: Math.floor(Date.now() / 1000) }
        : { state: 'started', created_at: Math.floor(Date.now() / 1000) }
    })
  })
}
