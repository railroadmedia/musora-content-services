#!/usr/bin/env node
/**
 * Generates TypeScript types from a Sanity schema exported by musora-platform-backend:
 *
 *   docker exec railenvironmentdocker_php-8-octane bash -c \
 *     "cd /app/musora-platform-backend && php artisan sanity:export-schema --workspace=marketing --mcs" \
 *     | node tools/generate-sanity-types.cjs > src/lib/sanity/types/marketing.d.ts
 *
 * Requires the --mcs flag: it normalises the schema for codegen (resolves nested array item types
 * and reduces Sanity validation rules to a plain `required` boolean).
 *
 * Reads the schema JSON from stdin or from a file path argument, writes the .d.ts to stdout.
 */
const fs = require('fs')

const SCALARS = {
  string: 'string',
  text: 'string',
  url: 'string',
  date: 'string',
  datetime: 'string',
  number: 'number',
  boolean: 'boolean',
  geopoint: '{ _type: "geopoint"; lat: number; lng: number; alt?: number }',
  slug: '{ _type: "slug"; current: string }',
  reference: '{ _type: "reference"; _ref: string }',
  image: '{ _type: "image"; asset: { _type: "reference"; _ref: string } }',
  file: '{ _type: "file"; asset: { _type: "reference"; _ref: string } }',
  block: 'PortableTextBlock',
  's3-files.media': '{ _type: "s3-files.media"; asset: { _type: "reference"; _ref: string } }',
}

const pascalCase = (name) =>
  name
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join('')

const isRequired = (field) => field.required === true

const stringListValues = (field) => {
  const list = field && field.type === 'string' && field.options && field.options.list
  if (!Array.isArray(list) || !list.length) return null
  const values = list.map((item) => (item && typeof item === 'object' ? item.value : item))
  if (values.some((value) => typeof value !== 'string')) return null
  return values
}

const stringUnion = (field) => {
  const values = stringListValues(field)
  return values && values.map((value) => JSON.stringify(value)).join(' | ')
}

const indent = (depth) => '  '.repeat(depth)

const objectLiteral = (fields, depth, extraKeys = '') => {
  const body = (fields || []).map((field) => renderField(field, depth + 1)).join('')
  return `{\n${extraKeys}${body}${indent(depth)}}`
}

const typeOf = (field, depth) => {
  if (field.type === 'object') return objectLiteral(field.fields, depth)
  if (field.type === 'array') {
    const items = (field.of || []).map((item) =>
      item.type === 'object'
        ? objectLiteral(item.fields, depth, `${indent(depth + 1)}_key: string\n`)
        : typeOf(item, depth)
    )
    if (!items.length) return 'unknown[]'
    return items.length === 1 ? `${items[0]}[]` : `(${items.join(' | ')})[]`
  }
  if (field.type === 'string') {
    const union = stringUnion(field)
    if (union) return union
  }
  return SCALARS[field.type] || 'unknown'
}

const renderField = (field, depth) => {
  const optional = isRequired(field) ? '' : '?'
  const title = field.title && field.title !== field.name ? `${indent(depth)}/** ${field.title} */\n` : ''
  return `${title}${indent(depth)}${field.name}${optional}: ${typeOf(field, depth)}\n`
}

const META_FIELDS = [
  `  _createdAt: string`,
  `  _updatedAt: string`,
  `  _rev: string`,
]

const isHiddenFor = (rule, value) =>
  rule.operator === '===' ? rule.value === value : rule.value !== value

const discriminantOf = (type) => {
  const rules = (type.fields || []).filter((field) => field.hiddenWhen)
  if (!rules.length) return null

  const names = new Set(rules.map((rule) => rule.hiddenWhen.field))
  if (names.size !== 1) {
    throw new Error(
      `${type.name}: conditional fields keyed off multiple discriminants (${[...names].join(', ')}) are not supported`
    )
  }

  const name = [...names][0]
  const field = (type.fields || []).find((candidate) => candidate.name === name)
  const values = stringListValues(field)
  if (!values) {
    throw new Error(`${type.name}: discriminant field "${name}" has no static string option list`)
  }

  return { name, values }
}

const variantsOf = (type, discriminant) => {
  const conditional = type.fields.filter((field) => field.hiddenWhen)
  const variants = []

  discriminant.values.forEach((value) => {
    const fields = conditional.filter((field) => !isHiddenFor(field.hiddenWhen, value))
    const signature = fields.map((field) => field.name).join(',')
    const existing = variants.find((variant) => variant.signature === signature)
    if (existing) {
      existing.values.push(value)
    } else {
      variants.push({ signature, values: [value], fields })
    }
  })

  return variants
}

const renderVariant = (discriminant, variant) => {
  const values = variant.values.map((value) => JSON.stringify(value)).join(' | ')
  const fields = variant.fields.map((field) => renderField(field, 3)).join('')
  return `${indent(1)}| {\n${indent(3)}${discriminant.name}: ${values}\n${fields}${indent(2)}}`
}

const renderDocument = (type) => {
  const discriminant = discriminantOf(type)
  const isBaseField = (field) =>
    !field.hiddenWhen && (!discriminant || field.name !== discriminant.name)
  const base = (type.fields || []).filter(isBaseField).map((field) => renderField(field, 1)).join('')
  const head = [
    `export type ${pascalCase(type.name)}Document = {`,
    `  _id: string`,
    `  _type: ${JSON.stringify(type.name)}`,
    ...META_FIELDS,
    base.replace(/\n$/, ''),
  ].join('\n')

  if (!discriminant) {
    return `${head}\n}\n`
  }

  const variants = variantsOf(type, discriminant).map((variant) => renderVariant(discriminant, variant))
  return `${head}\n} & (\n${variants.join('\n')}\n)\n`
}

if (!process.argv[2] && process.stdin.isTTY) {
  console.error(
    [
      'Usage: generate-sanity-types.cjs [schema.json] < schema.json',
      '',
      'This only converts an already-exported schema to TypeScript; it does not export the schema itself.',
      'To export the schema from musora-platform-backend and generate types in one step:',
      '',
      '  docker exec railenvironmentdocker_php-8-octane bash -c \\',
      '    "cd /app/musora-platform-backend && php artisan sanity:export-schema --workspace=marketing --mcs" \\',
      '    | node tools/generate-sanity-types.cjs > src/lib/sanity/types/marketing.d.ts',
    ].join('\n')
  )
  process.exit(1)
}

const source = process.argv[2] ? fs.readFileSync(process.argv[2], 'utf8') : fs.readFileSync(0, 'utf8')
const schema = JSON.parse(source.slice(source.indexOf('{')))
const documents = (schema.types || []).filter((type) => type.type === 'document')

const hasBlockField = (fields) =>
  (fields || []).some(
    (field) =>
      field.type === 'block' ||
      hasBlockField(field.fields) ||
      hasBlockField((field.of || []).filter((item) => typeof item === 'object'))
  )

const usesPortableText = documents.some((type) => hasBlockField(type.fields))

const PORTABLE_TEXT_BLOCK = `export type PortableTextBlock = {
  _type: string
  _key?: string
  style?: string
  listItem?: string
  level?: number
  markDefs?: { _type: string; _key: string; [key: string]: unknown }[]
  children?: { _type: string; _key?: string; text?: string; marks?: string[] }[]
}
`

process.stdout.write(
  [
    `// Generated by tools/generate-sanity-types.cjs from the musora-platform-backend Sanity schema.`,
    `// Do not edit by hand; re-run the generator instead.`,
    ``,
    usesPortableText ? PORTABLE_TEXT_BLOCK : ``,
    documents.map(renderDocument).join('\n'),
  ]
    .filter((line) => line !== ``)
    .join('\n')
)
