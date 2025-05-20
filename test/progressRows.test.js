import { getProgressRows } from '../src/services/userActivity';
import { fetchUserPlaylists } from '../src/services/content-org/playlists';
import { fetchByRailContentIds } from '../src/services/sanity';
import {getAllStartedOrCompleted, getProgressStateByIds} from '../src/services/contentProgress';
import mockData_progress_content from './mockData/mockData_progress_content.json';
import mockData_sanity_progress_content from "./mockData/mockData_sanity_progress_content.json";

jest.mock('../src/services/content-org/playlists');
jest.mock('../src/services/sanity');
jest.mock('../src/services/contentProgress');

describe('getProgressRows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns progress rows successfully', async () => {
    const mockPlaylists = [
      {
        id: 1,
        name: 'Playlist 1',
        last_progress: '2025-05-19 10:00:00',
        last_engaged_on: 101,
        items: [{ content_id: 201 }],
        duration_formated: '10m',
        total_items: 1,
        likes: 100,
        user: { display_name: 'User1' },
        brand: 'brand1',
        first_items_thumbnail_url: 'url1',
      },
    ];

    const mockPlaylistContents = [
      {
        id: 201,
        railcontent_id: 201,
        parent_content_data: [],
        type: 'lesson',
        thumbnail: 'thumb1',
        title: 'Lesson 1',
        difficulty_string: 'Easy',
        artist_name: 'Artist 1',
        lesson_count: 1,
        completed_children: 0,
        brand: 'brand1',
        slug: 'lesson-1',
      },
    ];

    const mockProgressContents = {
      '201': {
        status: 'in_progress',
        progress: 50,
        last_update: 1621510400, // Unix timestamp
      },
    };

    const mockProgressState = {
      '201': 'in_progress',
    };

    fetchUserPlaylists.mockResolvedValue({ data: mockPlaylists });
    fetchByRailContentIds.mockResolvedValue(mockPlaylistContents);
    getAllStartedOrCompleted.mockResolvedValue(mockProgressContents);
    getProgressStateByIds.mockResolvedValue(mockProgressState);

    const result = await getProgressRows({ brand: 'brand1', limit: 8 });

    expect(result).toHaveProperty('type', 'progress_rows');
    expect(result).toHaveProperty('data');
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data.length).toBe(2);
    expect(result.data[0]).toHaveProperty('id', 'progressType', 'header', 'body', 'cta');
    expect(result.data[0].progressType).toBe('playlist');
    expect(result.data[0].body).toHaveProperty('first_items_thumbnail_url', 'title', 'subtitle');
    expect(result.data[0].cta).toHaveProperty('text');
    expect(result.data[0].cta).toHaveProperty('action');

  });

  it('handles no progress', async () => {
    fetchUserPlaylists.mockResolvedValue({ data: [] });
    getAllStartedOrCompleted.mockResolvedValue({});
    fetchByRailContentIds.mockResolvedValue([]);
    getProgressStateByIds.mockResolvedValue({});

    const result = await getProgressRows({ brand: 'brand1', limit: 8 });
    expect(result).toHaveProperty('type', 'progress_rows');
    expect(result.data).toEqual([]);
  });

  it('check progress rows logic', async () => {
    fetchUserPlaylists.mockResolvedValue({ data: [] });
    fetchByRailContentIds
      .mockImplementationOnce(() => Promise.resolve([])) // playlists
      .mockImplementationOnce(() => Promise.resolve(mockData_sanity_progress_content) // content progress
      );

    getAllStartedOrCompleted.mockResolvedValue(mockData_progress_content);
    getProgressStateByIds
      .mockImplementationOnce(() => Promise.resolve({
        "287853": "completed",
        "287854": "completed",
        "287855": "completed",
        "287858": "completed",
        "287859": ""
      })) // course lessons
       .mockImplementationOnce(() => Promise.resolve({
         "257243": "started",
         "257245": "started",
         "257246": "",
         "257247": "",
         "257248": "",
         "257249": "completed",
         "257250": "completed",
         "257251": "",
         "257252": "",
         "257253": "",
         "257254": "",
         "257255": "",
         "257256": "",
         "257257": "",
         "257258": "",
         "257259": "",
         "257260": "",
         "259235": "",
         "259236": ""
       })) //pack
      .mockImplementationOnce(() => Promise.resolve({
          "410479": "",
          "410480": "completed",
          "410481": "completed",
          "410482": "",
          "410483": "",
          "410484": "",
          "410485": "",
          "410486": "",
          "410487": ""
        }) // challenge
      );


    const result = await getProgressRows({ brand: 'brand1', limit: 8 });
    console.log('result', result);
    expect(fetchByRailContentIds).toHaveBeenCalledTimes(2);

    expect(result).toHaveProperty('type', 'progress_rows');
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data.length).toBeLessThanOrEqual(8);
    //course 280498
    const lesson1Progress = result.data.find(row => row.id === 280498);
    expect(lesson1Progress).toBeDefined();
    expect(lesson1Progress.cta).toHaveProperty('text');
    expect(lesson1Progress.cta.text.toLowerCase()).toContain('continue');
    expect(lesson1Progress.cta.action).toHaveProperty('type');
    expect(lesson1Progress.cta.action.type).toBe('course');
    expect(lesson1Progress.cta.action.id).toBe(280498);
    expect(lesson1Progress.cta.action.child).toBeDefined();
    expect(lesson1Progress.cta.action.child.type).toBe('course-part');
    expect(lesson1Progress.cta.action.child.id).toBe(287859);
    //pack 257242
    const lesson2Progress = result.data.find(row => row.id === 257242);
    expect(lesson2Progress).toBeDefined();
    expect(lesson2Progress.cta).toHaveProperty('text');
    expect(lesson2Progress.cta.text.toLowerCase()).toContain('continue');
    console.log(lesson2Progress.cta.action)
    expect(lesson2Progress.cta.action).toHaveProperty('type');
    expect(lesson2Progress.cta.action.type).toBe('pack');
    expect(lesson2Progress.cta.action.id).toBe(257242);
    expect(lesson2Progress.cta.action.child).toBeDefined();
    expect(lesson2Progress.cta.action.child.type).toBe('pack-bundle');
    expect(lesson2Progress.cta.action.child.child).toBeDefined();
    expect(lesson2Progress.cta.action.child.child.type).toBe('pack-bundle-lesson');
    expect(lesson2Progress.cta.action.child.child.id).toBe(257251);

    //challenge 410478
    const lesson3Progress = result.data.find(row => row.id === 410478);
    expect(lesson3Progress).toBeDefined();
    expect(lesson3Progress.cta).toHaveProperty('text');
    expect(lesson3Progress.cta.text.toLowerCase()).toContain('continue');
    expect(lesson3Progress.cta.action).toHaveProperty('type');
    expect(lesson3Progress.cta.action.type).toBe('challenge');
    expect(lesson3Progress.cta.action.id).toBe(410478);
    expect(lesson3Progress.cta.action.child).toBeDefined();
    expect(lesson3Progress.cta.action.child.type).toBe('challenge-part');
    expect(lesson3Progress.cta.action.child.id).toBe(410479);

    //completed play-along  316772
    const lesson4Progress = result.data.find(row => row.id === 316772);
    expect(lesson4Progress).toBeDefined();
    expect(lesson4Progress.cta).toHaveProperty('text');
    expect(lesson4Progress.cta.text).toContain('Replay Song');
    expect(lesson4Progress.cta.action).toHaveProperty('type');
    expect(lesson4Progress.cta.action.type).toBe('play-along');
    expect(lesson4Progress.cta.action.id).toBe(316772);
    expect(lesson4Progress.body.progressPercent).toBe(100);

    //in progress quick-tips 325826
    const lesson5Progress = result.data.find(row => row.id === 325826);
    console.log(lesson5Progress)
    expect(lesson5Progress).toBeDefined();
    expect(lesson5Progress.cta).toHaveProperty('text');
    expect(lesson5Progress.cta.text).toContain('Continue');
    expect(lesson5Progress.cta.action).toHaveProperty('type');
    expect(lesson5Progress.cta.action.type).toBe('quick-tips');
    expect(lesson5Progress.cta.action.id).toBe(325826);
    expect(lesson5Progress.body.progressPercent).toBeLessThan(100);
  });



});


