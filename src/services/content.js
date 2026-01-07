/**
 * @module Content-Services-V2
 */

import {
  fetchByRailContentIds,
  fetchMetadata,
  fetchRecent,
  fetchTabData,
  fetchNewReleases,
  fetchUpcomingEvents,
  fetchScheduledReleases,
  fetchReturning,
  fetchLeaving, fetchScheduledAndNewReleases, fetchContentRows, fetchOwnedContent, fetchCourseCollectionData
} from './sanity.js'
import {TabResponseType, Tabs, capitalizeFirstLetter} from '../contentMetaData.js'
import {recommendations, rankCategories, rankItems} from "./recommendations";
import {addContextToContent} from "./contentAggregator.js";
import {globalConfig} from "./config";
import {getUserData} from "./user/management";
import {filterTypes, ownedContentTypes} from "../contentTypeConfig";
import {getPermissionsAdapter} from "./permissions/index.ts";


export async function getLessonContentRows (brand='drumeo', pageName = 'lessons') {
  const [recentContentIds, rawContentRows, userData] = await Promise.all([
    fetchRecent(brand, pageName, { progress: 'recent', limit: 10 }),
    getContentRows(brand, pageName),
    getUserData()
  ])

  const contentRows = Array.isArray(rawContentRows) ? rawContentRows : []

  // Only fetch owned content if user has no active membership
  if (!userData?.has_active_membership) {
    const type = ownedContentTypes[pageName] || []

    const ownedContent = await fetchOwnedContent(brand, { type })
    if (ownedContent?.entity && ownedContent.entity.length > 0) {
      contentRows.unshift({
        id: 'owned',
        title: 'Owned ' + capitalizeFirstLetter(pageName),
        items: ownedContent.entity
      })
    }
  }

  // Add recent content row
  contentRows.unshift({
    id: 'recent',
    title: 'Recent ' + capitalizeFirstLetter(pageName),
    items: recentContentIds || []
  })

  const results = await Promise.all(
    contentRows.map(async (row) => {
      return { id: row.id, title: row.title, items:  row.items }
    })
  )

  return results
}

/**
 * Get data that should be displayed for a specific tab with pagination
 * @param {string} brand - The brand for which to fetch data.
 * @param {string} pageName - The page name (e.g., 'lessons', 'songs').
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
  sort = 'recommended',
  selectedFilters = []
} = {}) {
  // Extract and handle 'progress' filter separately
  const progressFilter = selectedFilters.find(f => f.startsWith('progress,')) || 'progress,all';
  const progressValue = progressFilter.split(',')[1].toLowerCase();
  const filteredSelectedFilters = selectedFilters.filter(f => !f.startsWith('progress,'));

  // Prepare included fields
  const mergedIncludedFields = [...filteredSelectedFilters, `tab,${tabName.toLowerCase()}`];

  // Fetch data
  let results
  if( tabName === Tabs.ForYou.name ) {
    results = await addContextToContent(getLessonContentRows, brand, pageName, {
      dataField: 'items',
      addNextLesson: true,
      addNavigateTo: true,
      addProgressPercentage: true,
      addProgressStatus: true
    })
  } else {
    let temp = await fetchTabData(brand, pageName, { page, limit, sort, includedFields: mergedIncludedFields, progress: progressValue });

    const [ranking, contextResults] = await Promise.all([
      sort === 'recommended' ? rankItems(brand, temp.entity.map(e => e.id)) : [],
      addContextToContent(() => temp.entity, {
        addNextLesson: true,
        addNavigateTo: true,
        addProgressPercentage: true,
        addProgressStatus: true
      })
    ]);

    results = ranking.length === 0 ? contextResults : contextResults.sort((a, b) => {
      const indexA = ranking.indexOf(a.id);
      const indexB = ranking.indexOf(b.id);
      return (indexA === -1 ? Infinity : indexA) - (indexB === -1 ? Infinity : indexB);
    })
  }


  // Fetch metadata
  const metaData = await fetchMetadata(brand, pageName, { skipTabFiltering: true });

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
    data: results,
    meta: { filters, sort: sortOptions }
  };
}

/**
 * Fetches recent content for a given brand and page with pagination.
 *
 * @param {string} brand - The brand for which to fetch data.
 * @param {string} pageName - The page name (e.g., 'all', 'incomplete', 'completed').
 * @param {string} [tabName='all'] - The tab name (defaults to 'all' for recent content).
 * @param {Object} params - Parameters for pagination and sorting.
 * @param {number} [params.page=1] - The page number for pagination.
 * @param {number} [params.limit=10] - The number of items per page.
 * @param {string} [params.sort="-published_on"] - The field to sort the data by.
 * @returns {Promise<Object>} - The fetched content data.
 *
 * @example
 * getRecent('drumeo', 'lessons', 'all', {
 *   page: 2,
 *   limit: 15,
 *   sort: '-popularity'
 * })
 *   .then(content => console.log(content))
 *   .catch(error => console.error(error));
 */
export async function getRecent(brand, pageName, tabName = 'all', {
  page = 1,
  limit = 10,
  sort = '-published_on',
} = {}) {
  const progress = tabName.toLowerCase() == 'all' ? 'recent':tabName.toLowerCase();
  const recentContentIds = await fetchRecent(brand, pageName, { page:page, limit:limit, progress: progress });
  const metaData = await fetchMetadata(brand, 'recent');
  return {
    type: TabResponseType.CATALOG,
    data: recentContentIds,
    meta:  { tabs: metaData.tabs }
  };
}

/**
 * Fetches content rows for a given brand and page with optional filtering by content row slug.
 *
 * @param {string} brand - The brand for which to fetch content rows.
 * @param {string} pageName - The page name (e.g., 'lessons', 'songs').
 * @param {string|null} contentRowSlug - The specific content row ID to fetch.
 * @param {Object} params - Parameters for pagination.
 * @param {number} [params.page=1] - The page number for pagination.
 * @param {number} [params.limit=10] - The maximum number of content items per row.
 * @returns {Promise<Object>} - The fetched content rows with complete Sanity data instead of just content IDs.
 *                              When contentRowId is provided, returns an object with type, data, and meta properties.
 *
 * @example
 * getContentRows('drumeo', 'lessons', 'Your-Daily-Warmup', {
 *   page: 1,
 *   limit: 5
 * })
 *   .then(content => console.log(content))
 *   .catch(error => console.error(error));
 */
export async function getContentRows(brand, pageName, contentRowSlug = null, {
  page = 1,
  limit = 10
} = {}) {
  const sanityData = await fetchContentRows(brand, pageName, contentRowSlug)
  if (!sanityData) {
    return []
  }
  let contentMap = {}
  let recData = {}
  let slugNameMap = {}
  for (const category of sanityData) {
    recData[category.slug] = category.content.map(item => item.id)
    for (const content of category.content) {
      contentMap[content.id] = content
    }
    slugNameMap[category.slug] = category.name
  }

  const start = (page - 1) * limit
  const end = start + limit
  const sortedData = await rankCategories(brand, recData)
  let finalData = []
  for (const category of sortedData) {
    finalData.push( {
      id: category.slug,
      title: slugNameMap[category.slug],
      items: category.items.slice(start, end).map(id => contentMap[id])})
  }

  return contentRowSlug ?
    {
      type: TabResponseType.CATALOG,
      data: finalData[0].items,
      meta: {}
    }
    : finalData
}

/**
 * Fetches new and upcoming releases for a given brand with pagination options.
 *
 * @param {string} brand - The brand for which to fetch new and upcoming releases.
 * @param {Object} [params={}] - Pagination parameters.
 * @param {number} [params.page=1] - The page number for pagination.
 * @param {number} [params.limit=10] - The maximum number of content items to fetch.
 * @returns {Promise<{ data: Object[] } | null>} - A promise that resolves to the fetched content data or `null` if no data is found.
 *
 * @example
 * // Fetch the first page with 10 results
 * getNewAndUpcoming('drumeo')
 *   .then(response => console.log(response))
 *   .catch(error => console.error(error));
 *
 * @example
 * // Fetch the second page with 20 results
 * getNewAndUpcoming('drumeo', { page: 2, limit: 20 })
 *   .then(response => console.log(response))
 *   .catch(error => console.error(error));
 */
export async function getNewAndUpcoming(brand, {
  page = 1,
  limit = 10,
} = {}) {

  const data = await fetchScheduledAndNewReleases(brand, {page: page, limit: limit});
  if (!data) {
    return null;
  }

  return {
    data: data,
  };
}

/**
 * Fetches scheduled content rows for a given brand with optional filtering by content row ID.
 *
 * @param {string} brand - The brand for which to fetch content rows.
 * @param {string} [contentRowId=null] - The specific content row ID to fetch (optional).
 * @param {Object} [params={}] - Pagination parameters.
 * @param {number} [params.page=1] - The page number for pagination.
 * @param {number} [params.limit=10] - The maximum number of content items per row.
 * @returns {Promise<Object>} - A promise that resolves to the fetched content rows.
 *
 * @example
 * // Fetch all sections with default pagination
 * getScheduleContentRows('drumeo')
 *   .then(content => console.log(content))
 *   .catch(error => console.error(error));
 *
 * @example
 * // Fetch only the 'New-Releases' section with custom pagination
 * getScheduleContentRows('drumeo', 'New-Releases', { page: 1, limit: 30 })
 *   .then(content => console.log(content))
 *   .catch(error => console.error(error));
 *
 * @example
 * // Fetch only the 'Live-Streams' section with unlimited results
 * getScheduleContentRows('drumeo', 'Live-Streams')
 *   .then(content => console.log(content))
 *   .catch(error => console.error(error));
 */
export async function getScheduleContentRows(brand, contentRowId = null, { page = 1, limit = 10 } = {}) {
  const sections = {
    'New-Releases': {
      title: 'New Releases',
      fetchMethod: fetchNewReleases
    },
    'Live-Streams': {
      title: 'Live Streams',
      fetchMethod: fetchUpcomingEvents
    },
    'Upcoming-Releases': {
      title: 'Upcoming Releases',
      fetchMethod: fetchScheduledReleases
    },
    'Returning-Soon': {
      title: 'Returning Soon',
      fetchMethod: fetchReturning
    },
    'Leaving-Soon': {
      title: 'Leaving Soon',
      fetchMethod: fetchLeaving
    }
  };

  if (contentRowId) {
    if (!sections[contentRowId]) {
      return null; // Return null if the requested section does not exist
    }

    const items = await sections[contentRowId].fetchMethod(brand, { page, limit });

    // Fetch only the requested section
    const result = {
      id: contentRowId,
      title: sections[contentRowId].title,
      // TODO: Remove content after FE/MA updates the existing code to use items
      content: items,
      items: items
    };

    return {
      type: TabResponseType.CATALOG,
      data: result,
      meta: {}
    };
  }

  // If no specific contentRowId, fetch all sections
  const results = await Promise.all(
    Object.entries(sections).map(async ([id, section]) => {
      // Apply special pagination rules
      const isNewReleases = id === 'New-Releases';
      const pagination = isNewReleases ? { page: 1, limit: 30 } : { page: 1, limit: Number.MAX_SAFE_INTEGER };
      const items = await section.fetchMethod(brand, pagination)

      return {
        id,
        title: section.title,
        // TODO: Remove content after FE/MA updates the existing code to use items
        content: items,
        items: items
      };
    })
  );

  return {
    type: TabResponseType.SECTIONS,
    data: results,
    meta: {}
  };
}

/**
 * Fetches recommended content for a given brand with pagination support.
 *
 * @param {string} brand - The brand for which to fetch recommended content.
 * @param {Object} [params={}] - Pagination parameters.
 * @param {number} [params.page=1] - The page number for pagination.
 * @param {number} [params.limit=10] - The maximum number of recommended content items per page.
 * @returns {Promise<Object>} - A promise that resolves to an object containing recommended content.
 *
 * @example
 * // Fetch recommended content for a brand with default pagination
 * getRecommendedForYou('drumeo')
 *   .then(content => console.log(content))
 *   .catch(error => console.error(error));
 *
 * @example
 * // Fetch recommended content for a brand with custom pagination
 * getRecommendedForYou('drumeo', { page: 2, limit: 5 })
 *   .then(content => console.log(content))
 *   .catch(error => console.error(error));
 */
export async function getRecommendedForYou(brand, rowId = null, {
  page = 1,
  limit = 10,
} = {}) {
  const requiredItems = page * limit;
  const data = await recommendations( brand, {limit: requiredItems})
  if (!data || !data.length) {
    return { id: 'recommended', title: 'Recommended For You', items: [] };
  }

  // Apply pagination before calling fetchByRailContentIds
  const startIndex = (page - 1) * limit;
  const paginatedData = data.slice(startIndex, startIndex + limit);
  const contents = await addContextToContent(fetchByRailContentIds, paginatedData, 'tab-data', brand, true,
    {
      addNextLesson: true,
      addNavigateTo: true,
    })
  if (rowId) {
    return {
      type: TabResponseType.CATALOG,
      data: contents,
      meta: {}
    };
  }

  return { id: 'recommended', title: 'Recommended For You', items: contents }
}


/**
 * Fetches legacy methods for a given brand by permission.
 *
 * @param {string} brand - The brand for which to fetch legacy methods.
 * @returns {Promise<Object>} - A promise that resolves to an object containing legacy methods.
 *
 * @example
 * // Fetch legacy methods for a brand by permission
 * getLegacyMethods('drumeo')
 *   .then(content => console.log(content))
 *   .catch(error => console.error(error));
 */
export async function getLegacyMethods(brand)
{
  const brandMap = {
    drumeo: [241247],
    pianote: [
      276693,
      215952 //Foundations 2019
    ],
    singeo: [308514],
    guitareo: [333652],
  }
  const ids = brandMap[brand] ?? null;
  if (!ids) return [];
  const adapter = getPermissionsAdapter()
  const userPermissionsData = await adapter.fetchUserPermissions()
  const userPermissions = userPermissionsData.permissions
  // Users should only have access to this if they have an active membership AS WELL as the content access
  // This is hardcoded behaviour and isn't found elsewhere
  const hasMembership = userPermissionsData.isAdmin || userPermissions.includes(91) || userPermissions.includes(92)
  const hasContentPermission = userPermissions.includes(100000000 + ids[0])
  if (hasMembership && hasContentPermission) {
   return Promise.all(ids.map(id => fetchCourseCollectionData(id)))
  } else {
    return []
  }
}

/**
 * Fetches content owned by the user (excluding membership content).
 * Shows only content accessible through purchases/entitlements, not through membership.
 *
 * @param {string} brand - The brand for which to fetch owned content.
 * @param {Object} [params={}] - Parameters for pagination and sorting.
 * @param {Array<string>} [params.type=[]] - Content type(s) to filter (optional array).
 * @param {number} [params.page=1] - The page number for pagination.
 * @param {number} [params.limit=10] - The number of items per page.
 * @param {string} [params.sort='-published_on'] - The field to sort the data by.
 * @returns {Promise<Object>} - The fetched owned content with entity array and total count.
 *
 * @example
 * // Fetch all owned content with default pagination
 * getOwnedContent('drumeo')
 *   .then(content => console.log(content))
 *   .catch(error => console.error(error));
 *
 * @example
 * // Fetch owned content with custom pagination and sorting
 * getOwnedContent('drumeo', {
 *   page: 2,
 *   limit: 20,
 *   sort: '-published_on'
 * })
 *   .then(content => console.log(content))
 *   .catch(error => console.error(error));
 *
 * @example
 * // Fetch owned content filtered by types
 * getOwnedContent('drumeo', {
 *   type: ['course', 'course-collection'],
 *   page: 1,
 *   limit: 10
 * })
 *   .then(content => console.log(content))
 *   .catch(error => console.error(error));
 */
export async function getOwnedContent(brand, {
  type = [],
  page = 1,
  limit = 10,
  sort = '-published_on',
} = {}) {
  const data = await fetchOwnedContent(brand, { type, page, limit, sort });

  if (!data) {
    return {
      entity: [],
      total: 0
    };
  }

  return await addContextToContent(() => data, {
    dataField: 'entity',
    addNavigateTo: true,
    addProgressPercentage: true,
    addProgressStatus: true,
  });
}
