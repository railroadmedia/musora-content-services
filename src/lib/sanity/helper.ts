import { Brands } from '../brands'
import { coachLessonsTypes, showsTypes } from '../../contentTypeConfig.js'
import { FilterBuilder } from '../../filterBuilder'

interface FilterParams {
  pullFutureContent?: boolean;
}

interface QueryOptions {
  sortOrder?: string;
  start?: number;
  end?: number;
  isSingle?: boolean;
}

interface EntityAndTotalQueryOptions extends QueryOptions {
  withoutPagination?: boolean;
}

type FilterOption =
  | 'difficulty'
  | 'type'
  | 'genre'
  | 'essential'
  | 'focus'
  | 'theory'
  | 'topic'
  | 'lifestyle'
  | 'creativity'
  | 'instrumentless'
  | 'gear'
  | 'bpm';

export function arrayJoinWithQuotes(array: string[], delimiter: string = ','): string {
  const wrapped = array.map((value) => `'${value}'`);
  return wrapped.join(delimiter);
}

export function getSanityDate(date: Date, roundToHourForCaching: boolean = true): string {
  if (roundToHourForCaching) {
    // We need to set the published on filter date to be a round time so that it doesn't bypass the query cache
    // with every request by changing the filter date every second. I've set it to one minute past the current hour
    // because publishing usually publishes content on the hour exactly which means it should still skip the cache
    // when the new content is available.
    // Round to the start of the current hour
    const roundedDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      date.getHours()
    );

    return roundedDate.toISOString();
  }

  return date.toISOString();
}

export function getDateOnly(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

export const merge = <T>(
  a: T[],
  b: T[],
  predicate: (a: T, b: T) => boolean = (a, b) => a === b
): T[] => {
  const c = [...a]; // copy to avoid side effects
  // add all items from B to copy C if they're not already present
  b.forEach((bItem) => (c.some((cItem) => predicate(bItem, cItem)) ? null : c.push(bItem)));
  return c;
};

export function buildRawQuery(
  filter: string = '',
  fields: string = '...',
  { sortOrder = 'published_on desc', start = 0, end = 10, isSingle = false }: QueryOptions = {}
): string {
  const sortString = sortOrder ? `order(${sortOrder})` : '';
  const countString = isSingle ? '[0...1]' : `[${start}...${end}]`;
  const query = `*[${filter}]{
        ${fields}
    } | ${sortString}${countString}`;
  return query;
}

export async function buildQuery(
  baseFilter: string = '',
  filterParams: FilterParams = { pullFutureContent: false },
  fields: string = '...',
  { sortOrder = 'published_on desc', start = 0, end = 10, isSingle = false }: QueryOptions = {}
): Promise<string> {
  const filter = await new FilterBuilder(baseFilter, filterParams).buildFilter();
  return buildRawQuery(filter, fields, { sortOrder, start, end, isSingle });
}

export function buildEntityAndTotalQuery(
  filter: string = '',
  fields: string = '...',
  {
    sortOrder = 'published_on desc',
    start = 0,
    end = 10,
    isSingle = false,
    withoutPagination = false,
  }: EntityAndTotalQueryOptions = {}
): string {
  const sortString = sortOrder ? ` | order(${sortOrder})` : '';
  const countString = isSingle ? '[0...1]' : withoutPagination ? `` : `[${start}...${end}]`;
  const query = `{
      "entity": *[${filter}]  ${sortString}${countString}
      {
        ${fields}
      },
      "total": 0
    }`;
  return query;
}

export function getFilterOptions(
  option: FilterOption|string,
  commonFilter: string,
  contentType: string,
  brand: string
): string {
  let filterGroq = '';
  const types = Array.from(new Set([...coachLessonsTypes, ...showsTypes[brand]]));

  switch (option) {
    case 'difficulty':
      filterGroq = `
                "difficulty": [
        {"type": "All", "count": count(*[${commonFilter} && difficulty_string == "All"])},
        {"type": "Introductory", "count": count(*[${commonFilter} && (difficulty_string == "Novice" || difficulty_string == "Introductory")])},
        {"type": "Beginner", "count": count(*[${commonFilter} && difficulty_string == "Beginner"])},
        {"type": "Intermediate", "count": count(*[${commonFilter} && difficulty_string == "Intermediate" ])},
        {"type": "Advanced", "count": count(*[${commonFilter} && difficulty_string == "Advanced" ])},
        {"type": "Expert", "count": count(*[${commonFilter} && difficulty_string == "Expert" ])}
        ][count > 0],`;
      break;
    case 'type':
      const typesString = types
        .map((t) => {
          return `{"type": "${t}"}`;
        })
        .join(', ');
      filterGroq = `"type": [${typesString}]{type, 'count': count(*[_type == ^.type && ${commonFilter}])}[count > 0],`;
      break;
    case 'genre':
    case 'essential':
    case 'focus':
    case 'theory':
    case 'topic':
    case 'lifestyle':
    case 'creativity':
      filterGroq = `
            "${option}": *[_type == '${option}' ${contentType ? ` && '${contentType}' in filter_types` : ''} ] {
            "type": name,
                "count": count(*[${commonFilter} && references(^._id)])
        }[count > 0],`;
      break;
    case 'instrumentless':
      filterGroq = `
            "${option}":  [
                  {"type": "Full Song Only", "count": count(*[${commonFilter} && instrumentless == false ])},
                  {"type": "Instrument Removed", "count": count(*[${commonFilter} && instrumentless == true ])}
              ][count > 0],`;
      break;
    case 'gear':
      filterGroq = `
            "${option}":  [
                  {"type": "Practice Pad", "count": count(*[${commonFilter} && gear match 'Practice Pad' ])},
                  {"type": "Drum-Set", "count": count(*[${commonFilter} && gear match 'Drum-Set'])}
              ][count > 0],`;
      break;
    case 'bpm':
      filterGroq = `
            "${option}":  [
                  {"type": "50-90", "count": count(*[${commonFilter} && bpm > 50 && bpm < 91])},
                  {"type": "91-120", "count": count(*[${commonFilter} && bpm > 90 && bpm < 121])},
                  {"type": "121-150", "count": count(*[${commonFilter} && bpm > 120 && bpm < 151])},
                  {"type": "151-180", "count": count(*[${commonFilter} && bpm > 150 && bpm < 181])},
                  {"type": "180+", "count": count(*[${commonFilter} && bpm > 180])},
              ][count > 0],`;
      break;
    default:
      filterGroq = '';
      break;
  }

  return filterGroq;
}

export function getSortOrder(
  sort: string = '-published_on',
  brand: Brands,
  groupBy?: string
): string {
  const sanitizedSort = sort?.trim() || '-published_on';
  let isDesc = sanitizedSort.startsWith('-');
  const sortField = isDesc ? sanitizedSort.substring(1) : sanitizedSort;

  let sortOrder = '';

  switch (sortField) {
    case 'slug':
      sortOrder = groupBy ? 'name' : '!defined(title), lower(title)';
      break;

    case 'popularity':
      if (groupBy === 'artist' || groupBy === 'genre') {
        sortOrder = isDesc ? `coalesce(popularity.${brand}, -1)` : 'popularity';
      } else {
        sortOrder = isDesc ? 'coalesce(popularity, -1)' : 'popularity';
      }
      break;

    case 'recommended':
      sortOrder = 'published_on';
      isDesc = true;
      break;

    default:
      sortOrder = sortField;
      break;
  }

  sortOrder += isDesc ? ' desc' : ' asc';
  return sortOrder;
}
