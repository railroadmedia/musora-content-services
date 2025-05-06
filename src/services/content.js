/**
 * @module Content-Services-V2
 */

import {
  fetchAll,
  fetchByRailContentIds,
  fetchMetadata,
  fetchRecent,
  fetchTabData,
  fetchNewReleases,
  fetchUpcomingEvents,
  fetchScheduledReleases,
  fetchReturning,
  fetchLeaving, fetchScheduledAndNewReleases, fetchHierarchy, fetchMethodChildrenIds, jumpToContinueContent
} from './sanity.js'
import {TabResponseType, Tabs, capitalizeFirstLetter} from '../contentMetaData.js'
import {getAllStartedOrCompleted, getProgressDateByIds, getProgressStateByIds} from "./contentProgress";
import {fetchHandler} from "./railcontent";
import {recommendations} from "./recommendations";
import {fetchUserPlaylists} from "./content-org/playlists";
import {lessonTypesMapping, progressTypesMapping} from "../contentTypeConfig";

export async function getLessonContentRows (brand='drumeo', pageName = 'lessons') {
  let recentContentIds = await fetchRecent(brand, pageName, { progress: 'recent' });
  recentContentIds = recentContentIds.map(item => item.id);

  let contentRows = await getContentRows(brand, pageName);
  contentRows = Array.isArray(contentRows) ? contentRows : [];
  contentRows.unshift({
    id: 'recent',
    title: 'Recent ' + capitalizeFirstLetter(pageName),
    content: recentContentIds || []
  });

  const results = await Promise.all(
      contentRows.map(async (row) => {
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
 * Fetches content rows for a given brand and page with optional filtering by content row id.
 *
 * @param {string} brand - The brand for which to fetch content rows.
 * @param {string} pageName - The page name (e.g., 'lessons', 'songs', 'challenges').
 * @param {string} [contentRowId] - The specific content row ID to fetch.
 * @param {Object} params - Parameters for pagination.
 * @param {number} [params.page=1] - The page number for pagination.
 * @param {number} [params.limit=10] - The maximum number of content items per row.
 * @returns {Promise<Object>} - The fetched content rows.
 *
 * @example
 * getContentRows('drumeo', 'lessons', 'Your-Daily-Warmup', {
 *   page: 1,
 *   limit: 5
 * })
 *   .then(content => console.log(content))
 *   .catch(error => console.error(error));
 */
export async function getContentRows(brand, pageName, contentRowId , {
  page = 1,
  limit = 10,
} = {}) {
  const contentRow = contentRowId ? `&content_row_id=${contentRowId}` : ''
  const url = `/api/content/v1/rows?brand=${brand}&page_name=${pageName}${contentRow}&page=${page}&limit=${limit}`;
  return  await fetchHandler(url, 'get', null);
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
  const data = await recommendations(brand, {limit: requiredItems});
  if (!data || !data.length) {
    return { id: 'recommended', title: 'Recommended For You', items: [] };
  }

  // Apply pagination before calling fetchByRailContentIds
  const startIndex = (page - 1) * limit;
  const paginatedData = data.slice(startIndex, startIndex + limit);

  const contents = await fetchByRailContentIds(paginatedData);
  const result = {
    id: 'recommended',
    title: 'Recommended For You',
    items: contents
  };

  if (rowId) {
    return {
      type: TabResponseType.CATALOG,
      data: contents,
      meta: {}
    };
  }

  return { id: 'recommended', title: 'Recommended For You', items: contents }
}

export async function getProgressRows({ brand = null } = {}) {
  const progressContentsIds = await getAllStartedOrCompleted();
  const contents = await fetchByRailContentIds(progressContentsIds, 'progress-tracker');

  const filtered = contents.filter(item => item.brand === brand).slice(0, 20);
  const recentContentIds = filtered.map(item => item.id);

  const progressMap = await getProgressDateByIds(recentContentIds);
  const recentPlaylists = await fetchUserPlaylists(brand, {
    sort: '-last_progress',
    limit: 10
  });
  const playlists = recentPlaylists?.data || [];

  const combinedLatest = await getCombinedLatestProgressItems(
    filtered,
    progressMap,
    playlists
  );

  return {
    type: TabResponseType.PROGRESS_ROWS,
    data: combinedLatest
  };
}

const getFormattedType = type => {
  for (const [key, values] of Object.entries(progressTypesMapping)) {
    if (values.includes(type)) {
      return key.replace(/\b\w/g, char => char.toUpperCase());
    }
  }
  return null;
};

async function getCombinedLatestProgressItems(contents, progressMap, playlists, limit = 8) {
  const excludedTypes = [
    'course-part',
    'pack-bundle-lesson',
    'song-tutorial-children',
    'challenge-part',
    'pack-bundle',
    'semester-pack-lesson',
    'learning-path-lesson',
    'learning-path-course',
    'learning-path-level'
  ];

  const playlistContentIds = new Set(
    playlists.map(pl => pl.last_engaged_on).filter(Boolean)
  );

  const excludedParents = new Set();
  const contentIdsWithChildren = contents
    .filter(item => item.child_count > 0)
    .map(item => item.id ?? item.railcontent_id);

  const hierarchyMap = Object.fromEntries(
    await Promise.all(contentIdsWithChildren.map(async (id) => {
      const hierarchy = await fetchHierarchy(id);
      return [id, hierarchy];
    }))
  );

  const allChildIds = Object.values(hierarchyMap)
    .flatMap(h => Object.keys(h.children || {}));
  const childContentMap = Object.fromEntries(
    (await fetchByRailContentIds(allChildIds)).map(child => [child.id, child])
  );
  const onlyLessons = Object.values(childContentMap)
    .filter(child => child.child_count == null)
    .map(child => child.id);
  const progressOnChildren = await getProgressStateByIds(allChildIds);
  const progressOnLessons = await getProgressStateByIds(onlyLessons);

  contents.map(item => {
    const contentId = item.id ?? item.railcontent_id;
    const parentIds = item.parent_content_data || [];
    if (playlistContentIds.has(contentId)) {
      parentIds.forEach(id => excludedParents.add(id));
    }
    if (item.child_count > 0 && hierarchyMap[contentId]) {
      const hierarchyChildren = hierarchyMap[contentId].children || {};
      const childEntries = Object.entries(hierarchyChildren)
        .map(([id]) => [id, progressOnChildren[id]])
        .filter(([_, status]) => status != null).slice(1);

      const itemsWithoutChildren = Object.keys(hierarchyChildren)
        .filter(id => childContentMap[id]?.child_count == null);

      const completedCount = itemsWithoutChildren.filter(id => progressOnLessons[id] === 'completed').length;

      const firstIncompleteId = childEntries.find(([_, status]) => status !== 'completed')?.[0] || null;

      item.completed_children = completedCount;
      item.first_incomplete_child = childContentMap[firstIncompleteId] || null;

      if (item.type === 'pack') {
        const secondIncompleteId = childEntries
          .filter(([id]) => id !== firstIncompleteId)
          .find(([_, status]) => status !== 'completed')?.[0] || null;
        item.second_incomplete_child = childContentMap[secondIncompleteId] || null;
      }
    }

    return item;
  });

  const normalizedContents = contents.map(item => {
    const contentId = item.id ?? item.railcontent_id;
    const progress = progressMap[contentId];
    if (!progress) return null;

    const { last_update, status, progress: progressPercent } = progress;
    const progressTimestamp = last_update * 1000;

    const hasConflict =
      playlistContentIds.has(contentId) ||
      excludedParents.has(contentId) ||
      excludedTypes.includes(item.type);

    if (!progressTimestamp || hasConflict) return null;

    const contentType = getFormattedType(item.type);
    let ctaText = 'Continue';
    if (contentType === 'Transcription') ctaText = 'Replay Song';
    if (contentType === 'Lesson') ctaText = status === 'completed' ? 'Revisit Lesson' : 'Continue';
    if (contentType === 'Pack' && status === 'completed') ctaText = 'View Lessons';

    return {
      id: item.id,
      progressType: 'content',
      contentType,
      thumbnail: item.thumbnail,
      title: item.title,
      subtitle:
        !item.child_count || item.lesson_count === 1
            ? `${item.difficulty_string} • ${item.artist_name}`
            : `${item.completed_children} of ${item.lesson_count ?? item.child_count} Lessons Complete`,
      cta: {
        text: ctaText,
        action: {
          type: item.type,
          brand: item.brand,
          id: item.id,
          slug: item.slug,
          child: item.first_incomplete_child
                  ? {
              id: item.first_incomplete_child.id,
              type: item.first_incomplete_child.type,
              brand: item.first_incomplete_child.brand,
              slug: item.first_incomplete_child.slug,
              secondChild: item.second_incomplete_child
                    ? {
                  id: item.second_incomplete_child.id,
                  type: item.second_incomplete_child.type,
                  brand: item.second_incomplete_child.brand,
                  slug: item.second_incomplete_child.slug
                }
                    : null
            }
                  : null
        }
      },
      progressPercent,
      progressTimestamp
    };
  }).filter(Boolean);

  const normalizedPlaylists = playlists.filter(p => p.last_progress).map(p => {
    const date = new Date(p.last_progress);
    return {
      progressType: 'playlist',
      contentType: 'Playlist',
      first_items_thumbnail_url: p.first_items_thumbnail_url,
      title: p.name,
      subtitle: `${p.duration_formated} • ${p.total_items} items • 27 likes • ${p.user.display_name}`,
      progressTimestamp: date.getTime(),
      user: p.user,
      cta: {
        text: 'Continue',
        action: {
          type: 'playlist',
          brand: p.brand,
          id: p.id,
          itemId: p.id
        }
      }
    };
  });

  return [...normalizedContents, ...normalizedPlaylists]
    .filter(item => typeof item.progressTimestamp === 'number' && item.progressTimestamp > 0)
    .sort((a, b) => b.progressTimestamp - a.progressTimestamp)
    .slice(0, limit);
}






