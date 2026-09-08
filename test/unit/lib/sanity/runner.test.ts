import { run, sanityRunner, SanityQueryError, QueryRunner } from '../../../../src/lib/sanity/runner'
import { Either } from '../../../../src/lib/ads/either'
import { SanityClient } from '../../../../src/infrastructure/sanity/SanityClient'
import { ConfigProvider } from '../../../../src/infrastructure/sanity/interfaces/ConfigProvider'
import { QueryExecutor } from '../../../../src/infrastructure/sanity/interfaces/QueryExecutor'
import { SanityConfig } from '../../../../src/infrastructure/sanity/interfaces/SanityConfig'

const stubConfig: SanityConfig = {
  projectId: 'test-project',
  dataset: 'test-dataset',
  version: '2021-06-07',
  token: 'test-token',
}

const stubConfigProvider: ConfigProvider = {
  getConfig: () => stubConfig,
}

const resolvingExecutor = (result: unknown): QueryExecutor => ({
  execute: async () => ({ result, ms: 1, query: 'irrelevant' }) as any,
})

const throwingExecutor = (error: unknown): QueryExecutor => ({
  execute: async () => {
    throw error
  },
})

const clientWith = (executor: QueryExecutor, configProvider = stubConfigProvider) =>
  new SanityClient(configProvider, executor)

describe('sanityRunner', () => {
  test('wraps a resolved result in a Right', async () => {
    const documents = [{ _id: 'song-1' }, { _id: 'song-2' }]
    const runner = sanityRunner(clientWith(resolvingExecutor(documents)))

    const result = await runner('*[_type == "song"]')

    expect(result.isRight()).toBe(true)
    expect(result.drop()).toEqual(documents)
  })

  test('treats a query that matched nothing as a Right holding null', async () => {
    const runner = sanityRunner(clientWith(resolvingExecutor(null)))

    const result = await runner('*[_type == "nope"]')

    expect(result.isRight()).toBe(true)
    expect(result.drop()).toBeNull()
  })

  test('wraps a transport failure in a Left carrying a SanityQueryError', async () => {
    const runner = sanityRunner(clientWith(throwingExecutor(new Error('network down'))))

    const result = await runner('*[_type == "song"]')

    expect(result.isLeft()).toBe(true)
    const error = result.drop() as SanityQueryError
    expect(error).toBeInstanceOf(SanityQueryError)
    expect(error).toBeInstanceOf(Error)
    expect(error.message).toBe('network down')
  })

  test('preserves the failing query on the error', async () => {
    const groq = '*[_type == "song" && brand == "drumeo"]'
    const runner = sanityRunner(clientWith(throwingExecutor(new Error('boom'))))

    const result = await runner(groq)

    expect((result.drop() as SanityQueryError).groq).toBe(groq)
  })

  test('carries the original thrown value as the cause', async () => {
    const original = { message: 'Sanity API error: 500', query: '*[]' }
    const runner = sanityRunner(clientWith(throwingExecutor(original)))

    const result = await runner('*[]')

    expect((result.drop() as SanityQueryError).cause).toBe(original)
  })

  test('reports a missing configuration as a Left instead of throwing', async () => {
    const failingConfigProvider: ConfigProvider = {
      getConfig: () => {
        throw new Error('Sanity token is missing in configuration')
      },
    }
    const runner = sanityRunner(clientWith(resolvingExecutor([]), failingConfigProvider))

    const result = await runner('*[]')

    expect(result.isLeft()).toBe(true)
    expect((result.drop() as SanityQueryError).message).toBe(
      'Sanity token is missing in configuration'
    )
  })

  test('refreshes the client configuration before every query', async () => {
    const client = clientWith(resolvingExecutor([]))
    const refreshSpy = jest.spyOn(client, 'refreshConfig')
    const runner = sanityRunner(client)

    await runner('*[]')
    await runner('*[]')

    expect(refreshSpy).toHaveBeenCalledTimes(2)
  })

  test('reads the configuration again after globalConfig changes', async () => {
    let projectId = 'first-project'
    const seenProjectIds: string[] = []
    const mutableConfigProvider: ConfigProvider = {
      getConfig: () => ({ ...stubConfig, projectId }),
    }
    const recordingExecutor: QueryExecutor = {
      execute: async (_query, config) => {
        seenProjectIds.push(config.projectId)
        return { result: [], ms: 1, query: '*[]' } as any
      },
    }
    const runner = sanityRunner(clientWith(recordingExecutor, mutableConfigProvider))

    await runner('*[]')
    projectId = 'second-project'
    await runner('*[]')

    expect(seenProjectIds).toEqual(['first-project', 'second-project'])
  })
})

describe('run', () => {
  test('forwards the query to the injected runner', async () => {
    const seen: string[] = []
    const fakeRunner: QueryRunner<string[]> = async (groq) => {
      seen.push(groq)
      return Either.right(null)
    }

    await run('*[_type == "song"]', fakeRunner)

    expect(seen).toEqual(['*[_type == "song"]'])
  })

  test('returns the runner result untouched', async () => {
    const expected = Either.right<SanityQueryError, string[]>(['a'])
    const fakeRunner: QueryRunner<string[]> = async () => expected

    const result = await run<string[]>('*[]', fakeRunner)

    expect(result).toBe(expected)
  })

  test('returns a Left untouched when the runner fails', async () => {
    const error = new SanityQueryError('boom', '*[]')
    const fakeRunner: QueryRunner<string[]> = async () => Either.left(error)

    const result = await run('*[]', fakeRunner)

    expect(result.isLeft()).toBe(true)
    expect(result.drop()).toBe(error)
  })
})
