/**
 * @module MyPathPlacementQuiz
 */
import { HttpClient } from '../../infrastructure/http/HttpClient'
import { globalConfig } from '../config.js'
import { OnboardingRecommendedContent } from '@/services/user/onboarding'


const baseUrl = `/api/my-path/v1/placement-quiz`

interface PlacementQuizAnswers {
  skill_level: 'new' | 'beginner' | 'intermediate' | 'advanced' | 'expert'
  genres: string[]
  gear: string[]
}

interface PlacementQuizResponse {
  user_id: string
  brand: string
  answers: PlacementQuizAnswers
}

interface StorePlacementQuizResponse {
  placement_quiz: PlacementQuizResponse
  recommended_content: OnboardingRecommendedContent
  error?: any
}

/**
 * Fetches the placement quiz answers from the API.
 *
 * @param brand
 * @returns {Promise<PlacementQuizResponse>} - A promise that resolves to the placement quiz answers.
 * @throws {HttpError} - If the HTTP request fails.
 */
export async function fetchQuizAnswers(brand: string): Promise<PlacementQuizResponse> {
  // todo: implement the actual API call to fetch the placement quiz answers
  return {
    user_id: '12345',
    brand,
    answers: {
      skill_level: 'beginner',
      genres: ['rock', 'jazz'],
      gear: ['e_kit'],
    },
  } as PlacementQuizResponse

  // const httpClient = new HttpClient(globalConfig.baseUrl)
  // return httpClient.get<PlacementQuizResponse>(`${baseUrl}?brand=${brand}`)
}

/**
 * Stores the placement quiz answers to the API.
 *
 * @param brand
 * @param answers
 * @returns {Promise<PlacementQuizResponse>} - A promise that resolves to the stored placement quiz answers.
 * @throws {HttpError} - If the HTTP request fails.
 */
export async function storeQuizAnswers(brand: string, answers: PlacementQuizAnswers): Promise<StorePlacementQuizResponse> {
  // todo: implement the actual API call to fetch the placement quiz answers
  return {
    placement_quiz: {
      user_id: '12345',
      brand,
      answers,
    } as PlacementQuizResponse,
    recommended_content: {
      "badge": null,
      "badge_logo": "https://cdn.sanity.io/images/4032r8py/production_v2/71e1f31d142140954511e3539b28d6234c729ef8-1118x317.svg",
      "badge_rear": null,
      "brand": "drumeo",
      "content_type": "learning-path-v2",
      "description": "Learn basic beats and fills — play easy songs as quickly as possible!",
      "difficulty": "Introductory",
      "id": 452340,
      "lesson_count": 35,
      "lessons": [
        {
          "id": 452295,
          "skill_pack_title": "The Quarter-Note Groove",
          "thumbnail": "https://cdn.sanity.io/images/4032r8py/production_v2/f2001e10d447910d29e51827cd2203d80fb34f9e-1920x1080.jpg",
          "title": "The Hi-Hat And Snare Drum"
        },
        {
          "id": 452307,
          "skill_pack_title": "The Quarter-Note Groove Around The Kit",
          "thumbnail": "https://cdn.sanity.io/images/4032r8py/production_v2/495699f9df3efb8c51e3656aa08dfb7d9b232527-1920x1080.jpg",
          "title": "The Ride And Floor Tom"
        },
        {
          "id": 452301,
          "skill_pack_title": "Getting Started With Single Strokes",
          "thumbnail": "https://cdn.sanity.io/images/4032r8py/production_v2/a98ec896e44b3db126c14cf14953ef0aa6c6df4b-1920x1080.jpg",
          "title": "What Are Single Strokes?"
        }
      ],
      "skill_count": 6,
      "thumbnail": "https://cdn.sanity.io/images/4032r8py/production_v2/6a840ecf93ad4f5432514146535f8df6bddb467d-1920x1080.jpg",
      "title": "Learn To Play The Drums",
      "video": {
        "captions": [
          {
            "_key": "2d9566f6132f00e22b38f5619ae3f996",
            "_type": "object",
            "display_language": "English (auto-generated)",
            "language": "en-x-autogen",
            "link": "https://captions.cloud.vimeo.com/captions/273152121.vtt?expires=1770784151&sig=6eea24336cbd59f96d3af118a94bedd32e8fb11a&download=auto_generated_captions.vtt",
            "name": "auto_generated_captions.vtt",
            "type": "subtitles",
            "uri": "/videos/1101964379/texttracks/273152121"
          }
        ],
        "external_id": "1101964379",
        "hlsManifestUrl": "https://player.vimeo.com/external/1101964379.m3u8?s=3e5fbe7699a9613c67f600fcf105632d856f2d44&oauth2_token_id=1284792283",
        "type": "vimeo-video",
        "video_playback_endpoints": [
          {
            "_key": "0f927b8fdb3dd6804cff0e80eba5b2ca",
            "_type": "object",
            "file": "https://player.vimeo.com/progressive_redirect/playback/1101964379/rendition/240p/file.mp4%20%28240p%29.mp4?loc=external&oauth2_token_id=1284792283&signature=69c832c4eec2451ecec5a20503b4b04e9505acb12f3c11f07b8717a183f64c9e",
            "height": 240,
            "width": 426
          },
          {
            "_key": "ea5e745a5473c51f3b85c3f282f6ef5a",
            "_type": "object",
            "file": "https://player.vimeo.com/progressive_redirect/playback/1101964379/rendition/360p/file.mp4%20%28360p%29.mp4?loc=external&oauth2_token_id=1284792283&signature=f7a74c6ecab923f09a7a5de8faeede76d04a6d2249e3c5844a32e944f76bf69c",
            "height": 360,
            "width": 640
          },
          {
            "_key": "d34a41b57d0d20fe0e71b58cbbde7cf6",
            "_type": "object",
            "file": "https://player.vimeo.com/progressive_redirect/playback/1101964379/rendition/540p/file.mp4%20%28540p%29.mp4?loc=external&oauth2_token_id=1284792283&signature=fda5dd8174a8c2857a7a9b18843ecd1eba75047c7610ae3bce0f817e4f94295c",
            "height": 540,
            "width": 960
          },
          {
            "_key": "7aff06af7325f50e36f6bfbe7116f321",
            "_type": "object",
            "file": "https://player.vimeo.com/progressive_redirect/playback/1101964379/rendition/720p/file.mp4%20%28720p%29.mp4?loc=external&oauth2_token_id=1284792283&signature=661d4e047cb2b70d1b7912c0ade3d4b14247438701706088eddcb9bc81964781",
            "height": 720,
            "width": 1280
          },
          {
            "_key": "19795ec7641b7f77614767d7e4bc6086",
            "_type": "object",
            "file": "https://player.vimeo.com/progressive_redirect/playback/1101964379/rendition/1080p/file.mp4%20%281080p%29.mp4?loc=external&oauth2_token_id=1284792283&signature=928801bb98cd8db75c0e93791c3edc2a0193f68b66ada4f0fa6d4b95f263bdc9",
            "height": 1080,
            "width": 1920
          },
          {
            "_key": "acbd66acb51ab8229131b68389dd475e",
            "_type": "object",
            "file": "https://player.vimeo.com/progressive_redirect/playback/1101964379/rendition/1440p/file.mp4%20%281440p%29.mp4?loc=external&oauth2_token_id=1284792283&signature=f346726ccfa045d9123ecb7f0f51cee383c452beb5a1ff1adf03a348f30fc465",
            "height": 1440,
            "width": 2560
          },
          {
            "_key": "d5fbe1a87f25e53fecedcc1ca5fd0567",
            "_type": "object",
            "file": "https://player.vimeo.com/progressive_redirect/playback/1101964379/rendition/2160p/file.mp4%20%282160p%29.mp4?loc=external&oauth2_token_id=1284792283&signature=a4c2734ef756c6f398456b7df0d0fc8490d9a435e09d8ecf45cc69f583f121d1",
            "height": 2160,
            "width": 3840
          }
        ],
        "video_poster_image_url": "https://i.vimeocdn.com/video/2118007293-96947f003b9f514afcfb7313e243db6ea7b469721a8aa7028ea05b6ee1c59cfd-d_1280x720?&r=pad&region=us"
      }
    } as OnboardingRecommendedContent
  } as StorePlacementQuizResponse

  // const body = {
  //   brand,
  //   answers,
  // }
  // const httpClient = new HttpClient(globalConfig.baseUrl)
  // return httpClient.post<PlacementQuizResponse>(`${baseUrl}`, body)
}
