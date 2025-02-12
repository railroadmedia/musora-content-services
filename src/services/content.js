/**
 * @module Content-Services-V2
 */

import {fetchAll, fetchByRailContentIds, fetchMetadata, fetchTabData} from './sanity.js'
import {TabResponseType, Tabs} from '../contentMetaData.js'

export async function getLessonContentRows () {
  //TODO: this should come from backend
  const rows = [
    {
      id: 'recent',
      title: 'Recent Lessons',
      content: [389313, 389314, 389315, 389316, 389317, 389318, 389319, 389320, 389321, 389322]
    },
    {
      id: 'recommended',
      title: 'Recommended For You',
      content: [389313, 389314, 389315, 389316, 389317, 389318, 389319, 389320, 389321, 389322]
    },
    {
      id: 'method-progress',
      title: 'Inspired By Your Method Progress',
      content: [389313, 389314, 389315, 389316, 389317, 389318, 389319, 389320, 389321, 389322]
    },
    {
      id: 'creativity',
      title: 'Unlock Your Creativity',
      content: [389313, 389314, 389315, 389316, 389317, 389318, 389319, 389320, 389321, 389322]
    },
    {
      id: 'essential-skills',
      title: 'Essential Skills',
      content: [389313, 389314, 389315, 389316, 389317, 389318, 389319, 389320, 389321, 389322]
    },
    {
      id: 'technique',
      title: 'Improve Your Technique',
      content: [389313, 389314, 389315, 389316, 389317, 389318, 389319, 389320, 389321, 389322]
    },
    {
      id: 'five-levels',
      title: '5 Levels of...',
      content: [389313, 389314, 389315, 389316, 389317, 389318, 389319, 389320, 389321, 389322]
    },
    {
      id: 'arpeggios',
      title: 'Get Started With Arpeggios',
      content: [389313, 389314, 389315, 389316, 389317, 389318, 389319, 389320, 389321, 389322]
    },
    {
      id: 'hears-first-time',
      title: 'Hears For The First Time',
      content: [389313, 389314, 389315, 389316, 389317, 389318, 389319, 389320, 389321, 389322]
    },
    {
      id: 'ten-minute',
      title: '10-Minute Workouts',
      content: [389313, 389314, 389315, 389316, 389317, 389318, 389319, 389320, 389321, 389322]
    }
  ]

  const results = await Promise.all(
    rows.map(async (row) => {
      const data = await fetchByRailContentIds(row.content)
      return { id: row.id, title: row.title, items: data }
    })
  )
  return results
}

/**
 * Get data that should be displayed for a specific tab with pagination
 * @param {string} brand - The brand for which to fetch data.
 * @param {string} pageName - The page name (e.g., 'lessons', 'songs','challenges).
 * @param {string} tabName - The name for the selected tab. Should be same name received from fetchMetadata (e.g., 'Individuals', 'Collections','For You').
 * @param {Object} params - Parameters for pagination, sorting, and filter.
 * @param {number} [params.page=1] - The page number for pagination.
 * @param {number} [params.limit=10] - The number of items per page.
 * @param {string} [params.sort="-published_on"] - The field to sort the data by.
 * @param {Array<string>} [params.selectedFilters=[]] - The selected filter.
 * @returns {Promise<Object|null>} - The fetched content data or null if not found.
 *
 * @example
 * getTabResults('drumeo', 'lessons','Singles', {
 *   page: 2,
 *   limit: 20,
 *   sort: '-popularity',
 *   includedFields: ['difficulty,Intermediate'],
 * })
 *   .then(content => console.log(content))
 *   .catch(error => console.error(error));
 */
export async function getTabResults(brand, pageName, tabName, {
  page = 1,
  limit = 10,
  sort = '-published_on',
  selectedFilters = []
} = {}) {

  // Extract and handle 'progress' filter separately
  const progressFilter = selectedFilters.find(f => f.startsWith('progress,')) || 'progress,all';
  const progressValue = progressFilter.split(',')[1].toLowerCase();
  const filteredSelectedFilters = selectedFilters.filter(f => !f.startsWith('progress,'));

  // Prepare included fields
  const mergedIncludedFields = [...filteredSelectedFilters, `type,${tabName.toLowerCase()}`];

  // Fetch data
  const results = tabName === Tabs.ForYou.name
      ? { entity: await getLessonContentRows() }
      : await fetchTabData(brand, pageName, { page, limit, sort, includedFields: mergedIncludedFields, progress: progressValue });

  // Fetch metadata
  const metaData = await fetchMetadata(brand, pageName);

  // Process filters
  const filters = (metaData.filters ?? []).map(filter => ({
    ...filter,
    items: filter.items.map(item => {
      const value = item.value.split(',')[1];
      return {
        ...item,
        selected: selectedFilters.includes(`${filter.key},${value}`) ||
                      (filter.key === 'progress' && value === 'all' && !selectedFilters.some(f => f.startsWith('progress,')))
      };
    })
  }));

  // Process sort options
  const sortOptions = {
    title: metaData.sort?.title ?? 'Sort By',
    type: metaData.sort?.type ?? 'radio',
    items: (metaData.sort?.items ?? []).map(option => ({
      ...option,
      selected: option.value === sort
    }))
  };

  return {
    type: tabName === Tabs.ForYou.name ? TabResponseType.SECTIONS : TabResponseType.CATALOG,
    data: results.entity,
    meta: { filters, sort: sortOptions }
  };
}
