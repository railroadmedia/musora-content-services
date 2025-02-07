import {fetchAll, fetchByRailContentIds, fetchMetadata} from './sanity.js'

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

export async function getTabResults(brand, pageName, tabName, { page = 1, limit = 10, sort = '-published_on', includedFields = [] } = {}) {
  const mergedIncludedFields = [...(includedFields || []), `type,${tabName.toLowerCase()}`];

  // Fetch data based on tabName
  const results = tabName === 'For You'
      ? { entity: await getLessonContentRows() }
      : await fetchAll(brand, pageName, { page, limit, sort, includedFields: mergedIncludedFields });

  // Fetch metadata and prepare filters
  const metaData = await fetchMetadata(brand, pageName);
  const filters = (metaData.filters ?? []).map(filter => ({
    ...filter,
    items: filter.items.map(item => ({
      ...item,
      selected: includedFields.some(field => {
        const [key, value] = field.split(',');
        return key === filter.key && value === item.value.split(',')[1];
      })
    }))
  }));

  return {
    type: tabName === 'For You' ? 'sections' : 'catalog',
    data: results.entity,
    meta: { filters, sort: {...metaData.sort} }
  };
}
