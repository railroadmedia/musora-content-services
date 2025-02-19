/**
 * @module Content-Services-V2
 */

import {fetchAll, fetchByRailContentIds, fetchMetadata, fetchRecent, fetchTabData} from './sanity.js'
import {TabResponseType, Tabs, capitalizeFirstLetter} from '../contentMetaData.js'
import {getAllStartedOrCompleted} from "./contentProgress";

export async function getLessonContentRows (brand='drumeo', pageName = 'lessons') {
  //TODO: this should come from backend
  let recentContentIds = await fetchRecent(brand, pageName, { progress: 'recent' });
  recentContentIds = recentContentIds.map(item => item.id);

  let contentIds = [389313, 389314, 389315, 389316, 389317, 389318, 389319, 389320, 389321, 389322];
  if(pageName == 'songs'){
    contentIds = [415581, 415603, 416206, 416373, 416133, 415723];
  }
  const rows = [
    {
      id: 'recent',
      title: 'Recent ' + capitalizeFirstLetter(pageName),
      content: recentContentIds || []
    },
    {
      id: 'recommended',
      title: 'Recommended For You',
      content: contentIds
    },
    {
      id: 'method-progress',
      title: 'Inspired By Your Method Progress',
      content: contentIds
    },
    {
      id: 'creativity',
      title: 'Unlock Your Creativity',
      content: contentIds
    },
    {
      id: 'essential-skills',
      title: 'Essential Skills',
      content: contentIds
    },
    {
      id: 'technique',
      title: 'Improve Your Technique',
      content: contentIds
    },
    {
      id: 'five-levels',
      title: '5 Levels of...',
      content: contentIds
    },
    {
      id: 'arpeggios',
      title: 'Get Started With Arpeggios',
      content: contentIds
    },
    {
      id: 'hears-first-time',
      title: 'Hears For The First Time',
      content: contentIds
    },
    {
      id: 'ten-minute',
      title: '10-Minute Workouts',
      content: contentIds
    }
  ]

  const results = await Promise.all(
    rows.map(async (row) => {
      if (row.content.length == 0){
        return { id: row.id, title: row.title, items: [] }
      }
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
  const mergedIncludedFields = [...filteredSelectedFilters, `tab,${tabName.toLowerCase()}`];

  // Fetch data
  const results = tabName === Tabs.ForYou.name
      ? { entity: await getLessonContentRows(brand, pageName) }
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

export async function getRecent(brand, pageName, tabName = 'recent', {
  page = 1,
  limit = 10,
  sort = '-published_on',
  selectedFilters = []
} = {}) {
  const progress = tabName.toLowerCase() == 'all' ? 'recent':tabName.toLowerCase();
  const recentContentIds = await fetchRecent(brand, pageName, { progress: progress });
  const metaData = await fetchMetadata(brand, 'recent');
  return {
    type: TabResponseType.CATALOG,
    data: recentContentIds,
    meta:  { tabs: metaData.tabs }
  };
}
