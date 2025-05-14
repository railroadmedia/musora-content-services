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
import {fetchPlaylistItems, fetchUserPlaylists} from "./content-org/playlists";
import {collectionLessonTypes, lessonTypesMapping, progressTypesMapping} from "../contentTypeConfig";

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

export async function getProgressRows({ brand = null, limit = 8 } = {}) {
  const excludedTypes = new Set([
    'course-part',
    'pack-bundle-lesson',
    'song-tutorial-children',
    'challenge-part',
    'pack-bundle',
    'semester-pack-lesson',
    'learning-path-lesson',
    'learning-path-course',
    'learning-path-level'
  ]);

  const recentPlaylists = await fetchUserPlaylists(brand, {
    sort: '-last_progress',
    limit: limit,
  });
  const playlists = recentPlaylists?.data || [];
  const eligiblePlaylistItems = await getEligiblePlaylistItems(playlists);
  const playlistEngagedOnContents = eligiblePlaylistItems.map(item => item.last_engaged_on);
  const playlistsContents = await fetchByRailContentIds(playlistEngagedOnContents, 'progress-tracker');
  const excludedParents = new Set();
  for (const item of playlistsContents) {
    const contentId = item.id ?? item.railcontent_id;
    excludedParents.add(contentId)
    const parentIds = item.parent_content_data || [];
      parentIds.forEach(id => excludedParents.add(id));
  }


  const progressContents = await getAllStartedOrCompleted({onlyIds: false, brand: brand, excludedIds: Array.from(excludedParents) });
  const contents = await fetchByRailContentIds(Object.keys(progressContents), 'progress-tracker', brand);
   console.log('rox:: progress from video      ---------------------------', Object.keys(progressContents), contents);
  const contentsMap = {};
  contents.forEach(content => {
    contentsMap[content.railcontent_id] = content;
  });

  const childToParentMap = {};
  const parentToChildrenMap = {};
  const addedParentIds = new Set();

  Object.values(contentsMap).forEach(content => {
    if (Array.isArray(content.parent_content_data)) {
      content.parent_content_data.forEach(parentId => {
        childToParentMap[content.id] = parentId;
        if (!parentToChildrenMap[parentId]) {
          parentToChildrenMap[parentId] = [];
        }
        parentToChildrenMap[parentId].push(content.id);
      });
    }
  });

  const progressList = [];

  for (const [idStr, progress] of Object.entries(progressContents)) {
    const id = parseInt(idStr);
    const content = contentsMap[id];

    if (!content || excludedTypes.has(content.type)) continue;

    const isLeaf = !Array.isArray(content.lessons) || content.lessons === null;
    const parentId = childToParentMap[id];

    // If it's a child and we haven't yet added its parent
    if (parentId ) {
      console.log('rox:: parentId type:', typeof parentId, content);
      console.log('rox:: All keys in contentsMap:', Object.keys(contentsMap));
      const parentContent = contentsMap[parentId];

      if (parentContent) {
        if(!addedParentIds.has(parentId)){
        addedParentIds.add(parentId);
}
        const existing = progressList.find(item => item.id === parentId);

        if (existing) {
          // Add childIndex (you can also use an array if there are multiple)
          existing.childIndex = nextId;
        } else {
          // Otherwise, push a new object with everything
          progressList.push({
            id: parentId,
            raw: parentContent,
            state: progress.status,
            percent: progress.progress,
            progressTimestamp: progress.last_update * 1000,
            childIndex: nextId
          });
        }

        console.log('rox:: it\'s a child and we haven\'t yet added its parent    ', content ,'gasit')

      }
      continue; // skip adding the child
    }

    // If it's a parent (with lessons) and not added yet
    if (!parentId && !addedParentIds.has(id)) {
      progressList.push({
        id,
        raw: content,
        state: progress.status,
        percent: progress.progress,
        progressTimestamp: progress.last_update * 1000
      });
      addedParentIds.add(id);
    }
  }

 const combined = mergeAndSortItems([...progressList, ...eligiblePlaylistItems], limit);
  const results = await Promise.all(
    combined.slice(0, limit).map(item =>
      item.type === 'playlist'
        ? processPlaylistItem1(item)
        : processContentItem1(item)
    )
  );

  return {
    type: TabResponseType.PROGRESS_ROWS,
    data: results
  };
}

function processContentItem1(item) {
  const data = item.raw;
  const progress = item.progress;
  const contentType = getFormattedType(data.type);
  const status = item.state;
  let ctaText = 'Continue';
  if (contentType === 'transcription') ctaText = 'Replay Song';
  if (contentType === 'lesson') ctaText = status === 'completed' ? 'Revisit Lesson' : 'Continue';
  if ((contentType === 'pack' || contentType === 'song tutorial' || collectionLessonTypes.includes(contentType)) && status === 'completed') {
    ctaText = 'View Lessons';
  }
 // const { status, progress: progressPercent } = progress;
  const lessonIds = extractLessonIds(item);

  if(data.lesson_count > 0){
    console.log('rox:: item parinte 1', item)


    if(item.childIndex){
      const nextId = item.childIndex
      const lessonIndex = data.lessons.findIndex(lesson => lesson.id === nextId);
      if(progress.status == "completed" && content.type === 'challenge-part')
      {
        const lessonIndex = data.lessons.findIndex(lesson => lesson.id === item.childIndex);
      } elseif(progress.status == "completed" )
      {

      }


      console.log('rox:: item parinte', item, data.lessons, lessonIndex, item.childIndex)
      if (lessonIndex !== -1) {
        const lesson = data.lessons[lessonIndex];
        data.first_incomplete_child = lesson;
        console.log('rox:: item parinte 21 ',  lesson)
      }
    }
  }
  return {
    id: item.id,
    progressType: 'content',
    header: contentType,
    body: {
      progressPercent: item.percent,
      thumbnail: item.raw.thumbnail,
      title: item.raw.title,
      subtitle: !item.raw.child_count || item.raw.lesson_count === 1
                   ? `${item.raw.difficulty_string} • ${item.raw.artist_name}`
                   : `${item.raw.completed_children} of ${item.raw.lesson_count ?? item.raw.child_count} Lessons Complete`
    },
    cta: {
      text: ctaText,
      action: {
        type: data.type,
        brand: data.brand,
        id: data.id,
        slug: data.slug,
        child: data.first_incomplete_child
                ? {
            id: data.first_incomplete_child.id,
            type: data.first_incomplete_child.type,
            brand: data.first_incomplete_child.brand,
            slug: data.first_incomplete_child.slug,
            child: data.second_incomplete_child
                  ? {
                id: data.second_incomplete_child.id,
                type: data.second_incomplete_child.type,
                brand: data.second_incomplete_child.brand,
                slug: data.second_incomplete_child.slug
              }
                  : null
          }
                : null
      }
    },
    progressTimestamp: item.progressTimestamp
  };
  return {
    ...item,
    type: getFormattedType(item.type),
    progressTimestamp: item.progressTimestamp,
  };
}

async function processPlaylistItem1(item) {
  const playlist = item.raw;
  const progressOnItems = await getProgressStateByIds(playlist.items.map(a => a.content_id));
  const allItemsCompleted = item.raw.items.every(i => {
    const itemId = i.content_id;
    const progress = progressOnItems[itemId];
    return progress && progress === 'completed';
  });

  let nextItem = playlist.items[0] ?? null;
  if (!allItemsCompleted) {
    const lastItemProgress = progressOnItems[playlist.last_engaged_on];
    const index = playlist.items.findIndex(i => i.content_id  === playlist.last_engaged_on);
    if (lastItemProgress === 'completed') {
      nextItem = playlist.items[index + 1] ?? nextId;
    } else {
      nextItem = playlist.items[index] ?? nextId;
    }
  }

  return {
    id:                playlist.id,
    progressType:      'playlist',
    header:            'playlist',
    body:              {
      first_items_thumbnail_url: playlist.first_items_thumbnail_url,
      title:                     playlist.name,
      subtitle:                  `${playlist.duration_formated} • ${playlist.total_items} items • ${playlist.likes} likes • ${playlist.user.display_name}`
    },
    progressTimestamp: item.progressTimestamp,
    cta:               {
      text:   'Continue',
      action: {
        brand:  playlist.brand,
        id:     playlist.id,
        itemId: nextItem.id,
        type:   'playlists',
      }
    }
  }
}
const getFormattedType = type => {
  for (const [key, values] of Object.entries(progressTypesMapping)) {
    if (values.includes(type)) {
      return key;
    }
  }
  return null;
};

function traverse(lessons) {
  for (const item of lessons) {
    if (item.id) {
      ids.push(item.id);
    }
    if (item.lessons) {
      traverse(item.lessons); // Recursively handle nested lessons
    }
  }
}

function extractLessonIds(data) {
  const ids = [];
  function traverse(lessons) {
    for (const item of lessons) {
      if (item.id) {
        ids.push(item.id);
      }
      if (item.lessons) {
        traverse(item.lessons); // Recursively handle nested lessons
      }
    }
  }
  if (data.raw && Array.isArray(data.raw.lessons)) {
    traverse(data.raw.lessons);
  }

  return ids;
}


async function getEligiblePlaylistItems(playlists) {
  return Promise.all(
    playlists
      .filter(p => p.last_progress && p.last_engaged_on)
      .map(async p => ({
        type: 'playlist',
        progressTimestamp: new Date(p.last_progress).getTime(),
        last_engaged_on:p.last_engaged_on,
        raw: p
      }))
  );
}

function mergeAndSortItems(items, limit) {
  return items
    .filter(item => typeof item.progressTimestamp === 'number' && item.progressTimestamp > 0)
    .sort((a, b) => b.progressTimestamp - a.progressTimestamp)
    .slice(0, limit + 5);
}







