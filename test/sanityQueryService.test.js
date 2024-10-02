import {initializeService} from '../src/services/config.js';
import {getFieldsForContentType} from "../src/contentTypeConfig";
import {fetchSanity} from "../src/services/sanity";
import {log} from './log.js';

const {
    fetchSongById,
    fetchArtists,
    fetchSongArtistCount,
    fetchRelatedSongs,
    fetchAllSongs,
    fetchSongFilterOptions,
    fetchSongCount,
    fetchNewReleases,
    fetchUpcomingEvents,
    fetchByRailContentId,
    fetchByRailContentIds,
    fetchAll,
    fetchAllOld,
    fetchAllFilterOptions,
    fetchFoundation,
    fetchMethods,
    fetchMethod,
    fetchRelatedLessons,
    fetchAllPacks,
    fetchPackAll,
    fetchLessonContent,
    fetchCourseOverview,
    fetchChildren,
    fetchParentByRailContentId,
    fetchLiveEvent,
    fetchChallengeOverview,
    fetchCoachLessons,
    fetchByReference,
    fetchScheduledReleases,
    getSortOrder,
    fetchShowsData,
    fetchMetadata
} = require('../src/services/sanity.js');

const {
    FilterBuilder,
} = require('../src/filterBuilder.js');

const {
    processMetadata,
} = require('../src/contentMetaData.js');

describe('Sanity Queries', function () {
    beforeEach(() => {
        const config = {
            sanityConfig: {
                token: process.env.SANITY_API_TOKEN,
                projectId: process.env.SANITY_PROJECT_ID,
                dataset: process.env.SANITY_DATASET,
                useCachedAPI: process.env.SANITY_USE_CACHED_API === 'true' || true,
                version: '2021-06-07',
                debug: process.env.DEBUG === 'true' || false,
                useDummyRailContentMethods: true,
            }
        };
        initializeService(config);
    });

    test('fetchSongById', async () => {
        const id = 380094;
        const response = await fetchSongById(id);
        expect(response.id).toBe(id);

    });


    test('fetchArtists', async () => {
        const response = await fetchArtists('drumeo');
        const artistNames = response.map((x) => x.name);
        expect(artistNames).toContain("Arctic Monkeys");

    }, 10000);

    test('fetchSongArtistCount', async () => {
        const response = await fetchSongArtistCount('drumeo');
        log(response);
        expect(response).toBeGreaterThan(1000);
    }, 10000);

    test('fetchSanity-WithPostProcess', async () => {
        const id = 380094;
        const query = `*[railcontent_id == ${id}]{
        ${getFieldsForContentType('song')}
          }`
        const newSlug = 'keysmash1';
        const newField = 1
        const postProcess = (result) => {
            result['new_field'] = newField;
            result['slug'] = newSlug;
            return result;
        };
        const response = await fetchSanity(query, false, {customPostProcess: postProcess});
        log(response);
        expect(response.id).toBe(id);
        expect(response.new_field).toBe(newField);
        expect(response.slug).toBe(newSlug);
    });


    test('fetchSanityPostProcess', async () => {
        const id = 380094;
        const response = await fetchByRailContentId(id, "song");
        expect(response.id).toBe(id);
    });

    test('fetchChallengeOverview', async () => {
        const id = 402197;
        const response = await fetchChallengeOverview(id);
        expect(response.lessons).toBeDefined();
        expect(response.id).toBe(id);

    });

    test('fetchByRailContentIds', async () => {
        const id = 380094;
        const id2 = 402204;
        const response = await fetchByRailContentIds([id, id2]);
        const returnedIds = response.map((x) => x.id);
        expect(returnedIds).toContain(id);
        expect(returnedIds).toContain(id2);
        expect(returnedIds.length).toBe(2);

    });

    test('fetchUpcomingEvents', async () => {
        const response = await fetchUpcomingEvents('drumeo', {});
        expect(response.length).toBeGreaterThan(0);
    });

    test('fetchUpcomingNewReleases', async () => {
        const response = await fetchNewReleases('drumeo');
        expect(response.length).toBeGreaterThan(0);
    });


    test('fetchLessonContent', async () => {
        const id = 380094;
        const response = await fetchLessonContent(id);
        expect(response.id).toBe(id);
    });


    test('fetchCourseOverview', async () => {
        const id = 310414;
        const response = await fetchCourseOverview(id);
        expect(response.id).toBe(id);
        expect(response.type).toBe('course');
    });

    test('fetchSongCount', async () => {
        const response = await fetchSongCount('drumeo');
        expect(response).toBeGreaterThan(1000);
    });

    test('fetchAllSongs', async () => {
        const response = await fetchAllSongs('drumeo', {});
        log(response);
        expect(response.entity[0].soundslice).toBeDefined();
        expect(response.entity[0].artist_name).toBeDefined();
        expect(response.entity[0].instrumentless).toBeDefined();
    });

    test('fetchSongFilterOptions', async () => {
        const response = await fetchSongFilterOptions('drumeo', {});
        log(response);
        expect(response.genre).toBeDefined();
        expect(response.difficulty).toBeDefined();
    });

    test('fetchAllSongsGroupByArtist', async () => {
        const response = await fetchAllSongs('drumeo', {groupBy:"artist"});
        expect(response.entity[0].lessons[0].soundslice).toBeDefined();
        expect(response.entity[0].lessons[0].artist_name).toBeDefined();
        expect(response.entity[0].lessons[0].instrumentless).toBeDefined();
    }, 100000);


    test('fetchNewReleases', async () => {
        const response = await fetchNewReleases('drumeo');
        log(response);
        expect(response[0].id).toBeDefined();
    });

    test('fetchAllWorkouts', async () => {
        const response = await fetchAll('drumeo', 'workout',{});
        log(response);
        expect(response.entity[0].id).toBeDefined();
    });

    test('fetchAllInstructorField', async () => {
        const response = await fetchAll('drumeo', 'quick-tips',{searchTerm: 'Domino Santantonio'});
        log(response);
        expect(response.entity[0].id).toBeDefined();
        expect(response.entity[0].instructors).toBeTruthy();
    });

    test('fetchAllSortField', async () => {
        const response = await fetchAll('drumeo', 'rhythmic-adventures-of-captain-carson',{});
        log(response);
        expect(response.entity[0].id).toBeDefined();
        expect(response.entity[0].sort).toBeDefined();
    });


    test('fetchAllChallenges', async () => {
        const response = await fetchAll('drumeo', 'challenge',{});
        log(response);
        expect(response.entity[0].registration_url).toBeDefined();
        expect(response.entity[0].enrollment_start_time).toBeDefined();
        expect(response.entity[0].enrollment_end_time).toBeDefined();

        expect(response.entity[0].lesson_count).toBeDefined();
        expect(response.entity[0].primary_cta_text).toBeDefined();
        expect(response.entity[0].challenge_state).toBeDefined();
        expect(response.entity[0].challenge_state_text).toBeDefined();

    });

    test('fetchAll-CustomFields', async () => {
        let response = await fetchAll('drumeo', 'challenge',{customFields:['garbage']});
        log(response);
        expect(response.entity[0].garbage).toBeDefined();
        expect(response.entity[0].id).toBeDefined();

        response = await fetchAll('drumeo', 'challenge',{useDefaultFields: false, customFields:['garbage']});
        log(response);
        expect(response.entity[0].garbage).toBeDefined();
        expect.not.objectContaining(response.entity[0].id);
    });

    test('fetchRelatedLessons', async () => {
        const id = 380094;
        const document = await fetchByRailContentId(id, 'song');
        let artist = document.artist.name;
        const response = await fetchRelatedLessons(id, 'singeo');
        let relatedDoc = await fetchByRailContentId(response.related_lessons[0].id, 'song');
        // match on artist or any genre
        let isMatch = artist === relatedDoc.artist.name;
        isMatch = isMatch || document.genre.some((genre) => {
            return relatedDoc.genre.some((relatedGenre) => {
                return genre._ref === relatedGenre._ref;
            });
        });
        expect(isMatch).toBeTruthy();
    });

    test('fetchChildren', async () => {
        // complement test to fetchParentByRailContentId
        const id = 191338; ////https://web-staging-one.musora.com/admin/studio/publishing/structure/play-along;play-along_191338
        const expectedChildID = 191492;
        const response = await fetchChildren(id);
        log('num children', response.length);
        log(response);
        
        expect(response.length > 0).toBeTruthy();
        const foundExpectedChild = response.some((child) => {
            return child['id'] = expectedChildID; 
        });
        expect(foundExpectedChild).toBeTruthy();
    });

    test('fetchParentByRailContentId', async () => {
        // complement test to fetchChildren
        const childId = 191492; // child of https://web-staging-one.musora.com/admin/studio/publishing/structure/play-along;play-along_191338
        const expectedParent = 191338;
        const response = await fetchParentByRailContentId(childId);
        expect(response['id']).toBe(expectedParent);
    });

    test('getSortOrder',  () => {
        let sort = getSortOrder()
        expect(sort).toBe('published_on desc');
        sort = getSortOrder('slug')
        expect(sort).toBe('title asc');
        sort = getSortOrder('-slug')
        expect(sort).toBe('title desc');
        sort = getSortOrder('-slug', true)
        expect(sort).toBe('name desc');
        sort = getSortOrder('published-on')
        expect(sort).toBe('published_on asc');
    });

    test('fetchMethod', async () => {
        const response = await fetchMethod('drumeo', 'drumeo-method');log(response);
        expect(response).toBeDefined();
        expect(response.levels.length).toBeGreaterThan(0);
    });

    test('fetchMethods', async () => {
        const response = await fetchMethods('drumeo');
        log(response);
        expect(response.length).toBeGreaterThan(0);
        expect(response[0].type).toBe('learning-path');
    });

    test('fetchAll-WithProgress', async () => {
        const ids = [410213, 305649];
        let response = await fetchAll('drumeo', 'song', {
            sort: 'slug',
            progressIds: ids,
        });
        expect(response.entity.length).toBe(2);
        expect(response.entity[0].id = 305649);
        expect(response.entity[1].id = 410213);
        // change the type and we expect no results
        response = await fetchAll('drumeo', 'quick-tip', {
            sort: 'slug',
            progressIds: ids,
        });
        expect(response.entity.length).toBe(0);
    });

    test('fetchAllFilterOptions-WithProgress', async () => {
        const ids = [410213, 305649];
        let response = await fetchAllFilterOptions('drumeo', '', '', '', 'song', '', ids);
        expect(response.meta.totalResults).toBe(2);
        // change the brand and we expect no results
        response = await fetchAllFilterOptions('singeo', '', '', '', 'song', '', ids);
        expect(response.meta.totalResults).toBe(0);

    });

    test('fetchFoundation', async () => {
        const response = await fetchFoundation('foundations-2019');log(response);
        expect(response.units.length).toBeGreaterThan(0);
        expect(response.type).toBe('foundation');
    });

    test('fetchPackAll', async () => {
        const response = await fetchPackAll(212899); //https://web-staging-one.musora.com/admin/studio/publishing/structure/pack;pack_212899%2Cinspect%3Don
        log(response);
        expect(response.slug).toBe('creative-control');
    });

    test('fetchAllPacks', async () => {
        let response = await fetchAllPacks('drumeo');
        response = await fetchAllPacks('drumeo', 'slug');
        const titles = response.map((doc) => doc.title);

        const sortedTitles = [...titles].sort((a, b) => a === b ? 0 : a > b ? 1 : -1);

        expect(titles).toStrictEqual(sortedTitles);
        response = await fetchAllPacks('drumeo', 'slug', 'Creative Control');
        expect(response[0].id).toBe(212899);
    });

    test('fetchCoachLessons', async () => {
        const response = await fetchCoachLessons('drumeo',411493, {});
        expect(response.entity.length).toBeGreaterThan(0);
    });

    test('fetchAll-IncludedFields', async () => {
        let response = await fetchAll('drumeo', 'instructor',{includedFields: ['is_active']});
        console.log(response);
        expect(response.entity.length).toBeGreaterThan(0);
    });

    test('fetchAll-IncludedFields-multiple', async () => {
        let response = await fetchAll('drumeo', 'course',{includedFields: ['essential,Dynamics','essential,Timing','difficulty,Beginner']});
        log(response);
        expect(response.entity.length).toBeGreaterThan(0);
    });

    test('fetchAll-IncludedFields-playalong-multiple', async () => {
        let response = await fetchAll('drumeo', 'play-along',{includedFields: ['bpm,91-120','bpm,181+','genre,Blues']});
        log(response);
        expect(response.entity.length).toBeGreaterThan(0);
    });

    test('fetchAll-IncludedFields-rudiment-multiple-gear', async () => {
        let response = await fetchAll('drumeo', 'rudiment',{includedFields: ['gear,Drum-Set','gear,Practice Pad']});
        log(response);
        expect(response.entity.length).toBeGreaterThan(0);
    });

    test('fetchAll-IncludedFields-coaches-multiple-focus', async () => {
        let response = await fetchAll('drumeo', 'instructor',{includedFields: ['focus,drumline','focus,recording']});
        log(response);
        expect(response.entity.length).toBeGreaterThan(0);
    });

    test('fetchAll-IncludedFields-songs-multiple-instrumentless', async () => {
        let response = await fetchAll('drumeo', 'song',{includedFields: ['instrumentless,true','instrumentless,false']});
        log(response);
        expect(response.entity.length).toBeGreaterThan(0);
    });

    test('fetchByReference', async () => {
        const response = await fetchByReference('drumeo', { includedFields: ['is_featured'] });
        expect(response.entity.length).toBeGreaterThan(0);
    });

    test('fetchScheduledReleases', async () => {
        const response = await fetchScheduledReleases('drumeo', {});
        expect(response.length).toBeGreaterThan(0);
    });

    test('fetchAll-GroupBy-Genre', async () => {
        let response = await fetchAll('drumeo', 'solo',{groupBy: 'genre'});
        log(response);
        expect(response.entity[0].web_url_path).toContain('/drumeo/genres/');
    });

    test('fetchAll-GroupBy-Artists', async () => {
        let response = await fetchAll('drumeo', 'song',{groupBy: 'artist'});
        log(response);
        expect(response.entity[0].web_url_path).toContain('/drumeo/artists/');
    });

    test('fetchAll-GroupBy-Instructors', async () => {
        let response = await fetchAll('drumeo', 'course',{groupBy: 'instructor'});
        log(response);
        expect(response.entity[0].web_url_path).toContain('/drumeo/coaches/');
    });

    test('fetchShowsData', async () => {
        const response = await fetchShowsData('drumeo');
        log(response);
        expect(response.length).toBeGreaterThan(0);
        const showTypes = response.map((x) => x.type);
        expect(showTypes).toContain('live');
    });

    test('fetchMetadata', async () => {
        const response = await fetchMetadata('drumeo','song');
        log(response);
        expect(response.tabs.length).toBeGreaterThan(0);
    });

    test('fetchChallengesV2Fields', async () => {
        const id = 402197;
        const response = await fetchChallengeOverview(id);
        log(response);
        expect(response.award).toBeDefined();
        expect(response.award_template).toBeDefined();
        expect(response.lessons[0].is_always_unlocked).toBeDefined();
        expect(response.lessons[0].is_bonus_content).toBeDefined();
    });

    test('fetchShowsData-OddTimes', async () => {
        const response = await fetchShowsData('drumeo');
        log(response);
        expect(response.length).toBeGreaterThan(0);
        const showTypes = response.map((x) => x.type);
        expect(showTypes).toContain('odd-times');
    });

});

describe('Filter Builder', function () {

    test('baseConstructor', async () => {
        const filter = 'railcontent_id = 111'
        let builder = new FilterBuilder(filter);
        let finalFilter = builder.buildFilter(filter);
        let clauses = spliceFilterForAnds(finalFilter);
        expect(clauses[0].phrase).toBe(filter);
        expect(clauses[1].field).toBe('published_on');

        builder = new FilterBuilder();
        finalFilter = builder.buildFilter(filter);
        clauses = spliceFilterForAnds(finalFilter);
        expect(clauses[0].field).toBe('published_on');
        expect(clauses[0].operator).toBe('<=');
    });

    test('withOnlyFilterAvailableStatuses', async () => {
        const filter = 'railcontent_id = 111'
        const builder =  FilterBuilder.withOnlyFilterAvailableStatuses(filter,['published', 'unlisted']);
        const finalFilter = builder.buildFilter();
        const clauses = spliceFilterForAnds(finalFilter);
        expect(clauses[0].phrase).toBe(filter);
        expect(clauses[1].field).toBe('status');
        expect(clauses[1].operator).toBe('in');
        // not sure I like this
        expect(clauses[1].condition).toBe("['published','unlisted']");
        expect(clauses[2].field).toBe('published_on');
    });

    test('withContentStatusAndFutureScheduledContent', async () => {
        const filter = 'railcontent_id = 111'
        const builder =  new FilterBuilder(filter,{
            availableContentStatuses: ['published', 'unlisted', 'scheduled'],
            getFutureScheduledContentsOnly: true});
        const finalFilter = builder.buildFilter();
        const clauses = spliceFilterForAnds(finalFilter);
        expect(clauses[0].phrase).toBe(filter);
        expect(clauses[1].field).toBe('(status'); // extra ( because it's a multi part filter
        expect(clauses[1].operator).toBe('in');
        // getFutureScheduledContentsOnly doesn't make a filter that's splicable, so we match on the more static string
        const expected = "['published','unlisted'] || (status == 'scheduled' && published_on >=";
        console.log(clauses[1].condition);
        console.log(expected)
        const isMatch = finalFilter.includes(expected);
        expect(isMatch).toBeTruthy();
    });

    test('withUserPermissions', async () => {
        const filter = 'railcontent_id = 111'
        const builder = new FilterBuilder(filter,
            { user: {
                    user: {},
                    permissions: [91, 92],
                }});
        const finalFilter = builder.buildFilter();
        const expected = "references(*[_type == 'permission' && railcontent_id in [91,92]]._id)"
        const isMatch = finalFilter.includes(expected);
        expect(isMatch).toBeTruthy();
    });

    test('withUserPermissionsForPlusUser', async () => {
        const filter = 'railcontent_id = 111'
        const builder = new FilterBuilder(filter,
            {
                user: getPlusUser()
            });
        const finalFilter = builder.buildFilter();
        const expected = "references(*[_type == 'permission' && railcontent_id in [91,92]]._id)"
        const isMatch = finalFilter.includes(expected);
        expect(isMatch).toBeTruthy();
    });

    test('withPermissionBypass', async () => {
        const filter = 'railcontent_id = 111'
        const builder = new FilterBuilder(filter,
            {
                user: getPlusUser(),
                bypassPermissions:true
            });
        const finalFilter = builder.buildFilter();
        const expected = "references(*[_type == 'permission' && railcontent_id in [91,92]]._id)"
        const isMatch = finalFilter.includes(expected);
        expect(isMatch).toBeFalsy();
        const clauses = spliceFilterForAnds(finalFilter);
        expect(clauses[0].field).toBe('railcontent_id');
        expect(clauses[1].field).toBe('published_on');
    });


    test('withPublishOnRestrictions', async () => {
        // testing dates is a pain more frustration than I'm willing to deal with, so I'm just testing operators.

        const filter = 'railcontent_id = 111'
        let builder =  new FilterBuilder(filter, {
            user: {},
            pullFutureContent: true,
        });

        let finalFilter = builder.buildFilter();
        let clauses = spliceFilterForAnds(finalFilter);
        expect(clauses[0].phrase).toBe(filter);

        expect(clauses[1].field).toBe('published_on');
        expect(clauses[1].operator).toBe('<=');
        const restrictionDate = new Date(clauses[1].condition)
        const now = new Date();
        expect(now.getTime()).toBeLessThan(restrictionDate.getTime());

        builder = new FilterBuilder(filter,
            {
                user: {},
                getFutureContentOnly: true,
        });
        finalFilter = builder.buildFilter();
        clauses = spliceFilterForAnds(finalFilter);
        expect(clauses[0].phrase).toBe(filter);
        expect(clauses[1].field).toBe('published_on');
        expect(clauses[1].operator).toBe('>=');
    });

    function getPlusUser() {
        return {
            permissions: [91,92],
        }
    }

    function spliceFilterForAnds(filter) {
        // this will not correctly split complex filters with && and || conditions.
        let phrases = filter.split(' && ');
        let clauses= [];
        phrases.forEach((phrase) => {
            let  field = phrase.substring(0, phrase.indexOf(' '));
            //if(field.charAt(0) === '(' ) field = field.substring(1);
            const temp = phrase.substring(phrase.indexOf(' ') + 1);
            const operator = temp.substring(0, temp.indexOf(' '));
            let condition = temp.substring(temp.indexOf(' ') + 1);
            //if(condition.charAt(condition.length) === ')') condition = condition.slice(-1);
            clauses.push({phrase, field, operator, condition});
        });
        return clauses;
    }

    test('fetchAllFilterOptions', async () => {
        let response = await fetchAllFilterOptions('drumeo', [], '', '', 'song', '');
        log(response);
        expect(response.meta.filterOptions.difficulty).toBeDefined();
        expect(response.meta.filterOptions.genre).toBeDefined();
        expect(response.meta.filterOptions.lifestyle).toBeDefined();
        expect(response.meta.filterOptions.instrumentless).toBeDefined();
    });

    test('fetchAllFilterOptions-Rudiment', async () => {
        let response = await fetchAllFilterOptions('drumeo', [], '', '', 'rudiment', '');
        log(response);
        expect(response.meta.filterOptions.gear).toBeDefined();
        expect(response.meta.filterOptions.genre).toBeDefined();
        expect(response.meta.filterOptions.topic).toBeDefined();
    });
    test('fetchAllFilterOptions-PlayAlong', async () => {
        let response = await fetchAllFilterOptions('drumeo', [], '', '', 'play-along', '');
        log(response);
        expect(response.meta.filterOptions.difficulty).toBeDefined();
        expect(response.meta.filterOptions.genre).toBeDefined();
        expect(response.meta.filterOptions.bpm).toBeDefined();
    });

    test('fetchAllFilterOptions-Coaches', async () => {
        let response = await fetchAllFilterOptions('drumeo', [], '', '', 'instructor', '');
        log(response);
        expect(response.meta.filterOptions.focus).toBeDefined();
        expect(response.meta.filterOptions.focus.length).toBeGreaterThan(0);
        expect(response.meta.filterOptions.genre).toBeDefined();
        expect(response.meta.filterOptions.genre.length).toBeGreaterThan(0);
    });

    test('fetchAllFilterOptions-filter-selected', async () => {
        let response = await fetchAllFilterOptions('drumeo', ['theory,notation','theory,time signatures','creativity,Grooves','creativity,Fills & Chops','difficulty,Beginner','difficulty,Intermediate','difficulty,Expert'], '', '', 'course', '');
        log(response);
        expect(response.meta.filterOptions).toBeDefined();
    });
});


describe('MetaData', function () {

    test('customBrandTypeExists', async () => {
        const metaData = processMetadata('guitareo', 'recording');
        expect(metaData.type).toBe('recording');
        expect(metaData.name).toBe('Archives');
        expect(metaData.description).toBeDefined();
    });

    test('invalidContentType', async () => {
        const metaData = processMetadata('guitareo', 'not a real type');
        expect(metaData).toBeNull();
    });

    test('onlyCommon', async () => {
        const guitareoMetaData = processMetadata('guitareo', 'challenge');
        const drumeoMetaData = processMetadata('drumeo', 'challenge');
        expect(guitareoMetaData).toStrictEqual(drumeoMetaData);
        expect(guitareoMetaData.type).toBe('challenge');
        expect(guitareoMetaData.name).toBe('Challenges');
    });

    test('withCommon', async () => {
        const guitareoMetaData = processMetadata('guitareo', 'instructor');
        const drumeoMetaData = processMetadata('drumeo', 'instructor');
        expect(guitareoMetaData.description).not.toBe(drumeoMetaData.description);
        guitareoMetaData.description = ''
        drumeoMetaData.description = ''
        expect(guitareoMetaData).toStrictEqual(drumeoMetaData);
    });

    test('withWithoutFilters', async () => {
        let metaData = processMetadata('singeo', 'student-review', true);
        expect(metaData.type).toBeDefined()
        expect(metaData.name).toBeDefined()
        expect(metaData.description).toBeDefined();
        expect(metaData.thumbnailUrl).toBeDefined();
        expect(metaData.tabs).toBeDefined();
        metaData = processMetadata('singeo', 'student-review', false);
        expect(metaData.type).toBeDefined()
        expect(metaData.name).toBeDefined()
        expect(metaData.description).toBeDefined();
        expect(metaData.tabs).not.toBeDefined();
    });

    test('nulled', async () => {
        let metaData = processMetadata('drumeo', 'student-review');
        expect(metaData).toBeNull();
        metaData = processMetadata('singeo', 'student-review');
        expect(metaData).not.toBeNull();
    });
});
