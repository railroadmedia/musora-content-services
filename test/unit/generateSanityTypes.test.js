const { execFileSync } = require('child_process')
const path = require('path')

const GENERATOR = path.resolve(__dirname, '../../tools/generate-sanity-types.cjs')

const generate = (schema) =>
  execFileSync(process.execPath, [GENERATOR], { input: JSON.stringify(schema), encoding: 'utf8' })

describe('generate-sanity-types', () => {
  it('maps document fields to a TypeScript type', () => {
    const output = generate({
      types: [
        {
          type: 'document',
          name: 'practice-goal',
          fields: [
            { type: 'string', name: 'brand', options: { list: ['drumeo', 'pianote'] }, required: true },
            { type: 'number', name: 'minutes' },
            { type: 'boolean', name: 'active' },
            { type: 'object', name: 'first_week', title: 'First Week', fields: [{ type: 'text', name: 'copy' }] },
            { type: 'array', name: 'items', of: [{ type: 'object', fields: [{ type: 'string', name: 'question' }] }] },
            { type: 'reference', name: 'instructor' },
            { type: 's3-files.media', name: 'resource_aws' },
          ],
        },
      ],
    })

    expect(output).toContain('export type PracticeGoalDocument = {')
    expect(output).toContain('_type: "practice-goal"')
    expect(output).toContain('brand: "drumeo" | "pianote"')
    expect(output).toContain('minutes?: number')
    expect(output).toContain('active?: boolean')
    expect(output).toContain('first_week?: {')
    expect(output).toContain('copy?: string')
    expect(output).toContain('_key: string')
    expect(output).toContain('question?: string')
    expect(output).toContain('instructor?: { _type: "reference"; _ref: string }')
    expect(output).toContain('resource_aws?: { _type: "s3-files.media"; asset: { _type: "reference"; _ref: string } }')
  })

  it('splits a document into a discriminated union when fields are conditionally hidden', () => {
    const output = generate({
      types: [
        {
          type: 'document',
          name: 'stats',
          fields: [
            { type: 'string', name: 'brand', options: { list: ['musora', 'drumeo'] }, required: true },
            { type: 'string', name: 'songs_count' },
            { type: 'string', name: 'members_count', hiddenWhen: { field: 'brand', operator: '!==', value: 'musora' } },
            { type: 'string', name: 'paths_count', hiddenWhen: { field: 'brand', operator: '===', value: 'musora' } },
          ],
        },
      ],
    })

    expect(output).toContain('songs_count?: string')
    expect(output).toMatch(/brand: "musora"\n\s+members_count\?: string/)
    expect(output).toMatch(/brand: "drumeo"\n\s+paths_count\?: string/)
    expect(output).toContain('} & (')
  })

  it('inlines the portable text block type instead of importing it', () => {
    const output = generate({
      types: [
        {
          type: 'document',
          name: 'announcement',
          fields: [{ type: 'array', name: 'message', of: [{ type: 'block' }] }],
        },
      ],
    })

    expect(output).toContain('export type PortableTextBlock = {')
    expect(output).not.toContain('import type')
    expect(output).toContain('message?: PortableTextBlock[]')
  })

  it('ignores non-document types', () => {
    const output = generate({ types: [{ type: 'object', name: 'ignored', fields: [] }] })

    expect(output).not.toContain('IgnoredDocument')
  })

  it('fails loudly instead of dropping fields when conditional fields key off multiple discriminants', () => {
    const schema = {
      types: [
        {
          type: 'document',
          name: 'stats',
          fields: [
            { type: 'string', name: 'brand', options: { list: ['musora', 'drumeo'] } },
            { type: 'string', name: 'tier', options: { list: ['free', 'paid'] } },
            { type: 'string', name: 'members_count', hiddenWhen: { field: 'brand', operator: '!==', value: 'musora' } },
            { type: 'string', name: 'upgrade_copy', hiddenWhen: { field: 'tier', operator: '!==', value: 'paid' } },
          ],
        },
      ],
    }

    expect(() => generate(schema)).toThrow(/multiple discriminants/)
  })

  it('fails loudly when the discriminant field has no static string option list', () => {
    const schema = {
      types: [
        {
          type: 'document',
          name: 'stats',
          fields: [
            { type: 'string', name: 'brand' },
            { type: 'string', name: 'members_count', hiddenWhen: { field: 'brand', operator: '!==', value: 'musora' } },
          ],
        },
      ],
    }

    expect(() => generate(schema)).toThrow(/no static string option list/)
  })
})
