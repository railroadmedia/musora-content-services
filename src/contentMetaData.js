

// Metadata is taken from the 'common' element and then merged with the <brand> metadata.
// Brand values are prioritized and will override the same property in the 'common' element.

const contentMetadata = {
    'common' :{
        'coaches': {
            name: 'Coaches',
            icon: 'icon-coach',
            allowableFilters: ['genre', 'focus'],
            sortBy: '-published_on',
        },
        'challenge': {
            name: 'Challenges',
            icon: 'icon-courses',
            description: "... ",
            allowableFilters: ['difficulty', 'topic', 'genre'],
            sortBy: '-published_on',
            modalText: 'Challenges are a collection of Workout-style videos that build your skills one step at a time. They help you develop broader musical skills at a manageable pace — usually over a few days.',
            tabs: [
                {
                    name: 'All',
                    short_name: 'All',
                    value: '',
                },
                {
                    name: 'Skill Level',
                    short_name: 'SKILL LEVEL',
                    is_group_by: true,
                    value: 'difficulty_string',
                },
                {
                    name: 'Genres',
                    short_name: 'Genres',
                    is_group_by: true,
                    value: 'genre',
                },
                {
                    name: 'Completed',
                    short_name: 'COMPLETED',
                    is_group_by: true,
                    value: 'completed'
                },
                {
                    name: 'Owned Challenges',
                    short_name: 'OWNED CHALLENGES',
                    is_group_by: true,
                    value: 'owned',
                },
            ],
        },
        'challenge-part': {
            name: 'Challenge Part',
            icon: 'icon-courses',
            description: "... ",
            allowableFilters: ['difficulty', 'genre', 'topic'],
            sortBy: '-published_on',
        },
        'pack': {
            allowableFilters: [],
        },
        'student-review': {
            name: "Student Reviews",
            icon: "icon-student-focus",
            allowableFilters: ['difficulty', 'genre', 'essentials', 'theory', 'creativity', 'lifestyle'],
            sortBy: '-published_on',
            tabs: [
                {
                    name: 'Lessons',
                    short_name: 'LESSONS',
                    value: '',
                },
                {
                    name: 'Instructors',
                    short_name: 'INSTRUCTORS',
                    is_group_by: true,
                    value: 'instructor',
                },
                {
                    name: 'Genres',
                    short_name: 'Genres',
                    is_group_by: true,
                    value: 'genre',
                },
            ],
        },
        'song': {
            name: "Songs",
            icon: "icon-songs",
            description: "Play the songs you love with note-for-note transcriptions and handy practice tools.",
            allowableFilters: ['difficulty', 'genre', 'instrumentless'],
            tabs: [
                {
                    name: 'Songs',
                    short_name: 'Songs',
                    value: '',
                },
                {
                    name: 'Artists',
                    short_name: 'ARTISTS',
                    is_group_by: true,
                    value: 'artist',
                },
                {
                    name: 'Genres',
                    short_name: 'Genres',
                    is_group_by: true,
                    value: 'genre',
                },
            ],
        },
        'quick-tips': {
            name: 'Quick Tips',
            icon: 'icon-shows',
            description: "Only have 10 minutes? These short lessons are designed to inspire you with quick tips and exercises, even if you don’t have lots of time to practice.",
            allowableFilters: ['difficulty', 'genre', 'essentials', 'theory', 'lifestyle', 'creativity'],
            sortBy: '-published_on',
            tabs: [
                {
                    name: 'Lessons',
                    short_name: 'LESSONS',
                    value: '',
                },
                {
                    name: 'Instructors',
                    short_name: 'INSTRUCTORS',
                    is_group_by: true,
                    value: 'instructor',
                },
                {
                    name: 'Genres',
                    short_name: 'Genres',
                    value: 'genre',
                },
            ],
        },
        'question-and-answer': {
            name: 'Q&A',
            description: "Each week we go live to answer your questions. Submit your questions in advance using the button below, in the Q&A thread in the forums, or live in the community chat.",
            allowableFilters: ['difficulty', 'genre', 'essentials', 'theory'],
            sortBy: '-published_on',
        },
        'workout': {
            allowableFilters: ['difficulty', 'genre', 'topic'],
            tabs: [
                {
                    name: 'All',
                    short_name: 'ALL',
                    value: '',
                },
                {
                    name: '5 Minutes',
                    short_name: '5 MINS',
                    is_required_field: true,
                    value: 'length_in_seconds < 450',
                },
                {
                    name: '10 Minutes',
                    short_name: '10 MINS',
                    is_required_field: true,
                    value: 'length_in_seconds > 450 && length_in_seconds < 750',
                },
                {
                    name: 'Instructors',
                    short_name: 'INSTRUCTORS',
                    is_group_by: true,
                    value: 'instructor',
                },
            ],
            modalText: 'Workouts are fun play-along lessons that help hone your musical skills. They cover various topics, and have multiple difficulty and duration options — so there’s always a perfect Workout for you. Just pick one, press start, and play along!',
        },
    },

    'drumeo': {
        'coaches': {
            description: "Your drumming journey is unique. You need personalized coaching that helps you reach your goals. Learn from some of the best drummers in the world!",
        },
        'course': {
            name: 'Courses',
            icon: 'icon-courses',
            description: "Tackle your next drumming goal with bite-sized courses from many of the world's best drummers.",
            allowableFilters: ['difficulty', 'genre', 'essentials', 'theory', 'lifestyle', 'creativity'],
            sortBy: '-published_on',
            tabs: [
                {
                    name: 'Courses',
                    short_name: 'COURSES',
                    value: '',
                },
                {
                    name: 'Instructors',
                    short_name: 'INSTRUCTORS',
                    is_group_by: true,
                    value: 'instructor',
                },
                {
                    name: 'Genres',
                    short_name: 'Genres',
                    is_group_by: true,
                    value: 'genre',
                },
            ],
        },
        'song': {
            sortBy: 'slug',
        },
        'student-review' : null,
        'student-focus': {
            name: 'Student Focus',
            icon: 'icon-student-focus',
            description: "Submit your playing for personalized and direct feedback, or look at the archive to see what challenges our instructors have already addressed.",
            allowableFilters: ['difficulty', 'genre', 'essentials', 'theory', 'creativity', 'lifestyle'],
            sortBy: '-published_on',
            tabs: [
                {
                    name: 'Lessons',
                    short_name: 'LESSONS',
                    value: '',
                },
                {
                    name: 'Instructors',
                    short_name: 'INSTRUCTORS',
                    is_group_by: true,
                    value: 'instructor',
                },
                {
                    name: 'Genres',
                    short_name: 'Genres',
                    is_group_by: true,
                    value: 'genre',
                },
            ],
        },
        'rudiment': {
            name: 'Rudiments',
            icon: 'icon-drums',
            description: "The 40 drum rudiments are essential for any drummer, no matter the style, genre, or scenario. You can use the videos below to help you learn, practice, and perfect every single one.",
            allowableFilters: ['difficulty', 'genre', 'gear', 'topic'],
            tabs: [
                {
                    name: 'All',
                    short_name: 'ALL',
                    value: '',
                },
                {
                    name: 'Drags',
                    short_name: 'DRAGS',
                    is_required_field: true,
                    value: 'topic[]->name match "drags"',
                },
                {
                    name: 'Flams',
                    short_name: 'FLAMS',
                    is_required_field: true,
                    value: 'topic[]->name match "flams"',
                },
                {
                    name: 'Paradiddles',
                    short_name: 'PARADIDDLES',
                    is_required_field: true,
                    value: 'topic[]->name match "paradiddles"',
                },
                {
                    name: 'Rolls',
                    short_name: 'ROLLS',
                    is_required_field: true,
                    value: 'topic[]->name match "rolls"',
                },
            ],
            sortBy: 'sort',
        },
        'gear-guide': {
            thumbnailUrl: 'https://dpwjbsxqtam5n.cloudfront.net/shows/gear.jpg',
            name: 'Gear Guides',
            icon: 'icon-shows',
            description: "Drummers love their gear - and in here you will find videos on gear demos, reviews, maintenance, tuning tips and much more.",
            allowableFilters: ['difficulty', 'genre'],
            sortBy: '-published_on',
            tabs: [
                {
                    name: 'Lessons',
                    short_name: 'LESSONS',
                    value: '',
                },
                {
                    name: 'Instructors',
                    short_name: 'INSTRUCTORS',
                    is_group_by: true,
                    value: 'instructor',
                },
                {
                    name: 'Genres',
                    short_name: 'Genres',
                    is_group_by: true,
                    value: 'genre',
                },
            ],
        },
        'challenges': {
            thumbnailUrl: 'https://dpwjbsxqtam5n.cloudfront.net/shows/challenges.jpg',
            name: 'Challenges',
            icon: 'icon-shows',
            description: "Like drumming puzzles, our challenges are lessons that will take a little more brain power and practice to get down. They are a great way to motivate you to get behind the kit or pad to practice, and cover the entire gamut of drumming skill level.",
            allowableFilters: ['difficulty', 'genre'],
            sortBy: '-published_on',
            tabs: [
                {
                    name: 'Lessons',
                    short_name: 'LESSONS',
                    value: '',
                },
                {
                    name: 'Instructors',
                    short_name: 'INSTRUCTORS',
                    is_group_by: true,
                    value: 'instructor',
                },
                {
                    name: 'Genres',
                    short_name: 'Genres',
                    is_group_by: true,
                    value: 'genre',
                },
            ],
        },
        'boot-camp': {
            thumbnailUrl: 'https://dpwjbsxqtam5n.cloudfront.net/shows/bootcamps.jpg',
            name: 'Boot Camps',
            icon: 'icon-shows',
            description: "Grab your sticks and practice along while watching a lesson! These boot camps are designed like workout videos so you can follow along and push your drumming at the same time.",
            allowableFilters: ['difficulty', 'genre', 'essentials'],
            sortBy: '-published_on',
            tabs: [
                {
                    name: 'Lessons',
                    short_name: 'LESSONS',
                    value: '',
                },
                {
                    name: 'Instructors',
                    short_name: 'INSTRUCTORS',
                    is_group_by: true,
                    value: 'instructor',
                },
                {
                    name: 'Genres',
                    short_name: 'Genres',
                    is_group_by: true,
                    value: 'genre',
                },
            ],
        },
        'quick-tips': {
            thumbnailUrl: 'https://musora.com/cdn-cgi/imagedelivery/0Hon__GSkIjm-B_W77SWCA/78e68540-2b93-4445-882c-a19eef6b5d00/public',
        },
        'podcast': {
            thumbnailUrl: 'https://dpwjbsxqtam5n.cloudfront.net/shows/show-podcast.jpg',
            name: 'The Drumeo Podcast',
            shortname: 'Episodes',
            icon: 'icon-shows',
            description: "Enjoy our official Drumeo Podcasts in video form! Whether it be discussions about drum topics or interviews with the greats you are looking for, these are an entertaining and educational way to pass the time.",
            allowableFilters: [],
            sortBy: '-sort',
        },
        'on-the-road': {
            thumbnailUrl: 'https://dpwjbsxqtam5n.cloudfront.net/shows/on-the-road.jpg',
            name: 'On The Road',
            shortname: 'Episodes',
            icon: 'icon-shows',
            description: "See Drumeo in action outside of the studio! This is your backstage pass to some of the biggest drum/music events in the world, as well as factory tours of your favorite drum brands.",
            allowableFilters: [],
            sortBy: '-published_on',
        },
        'behind-the-scenes': {
            thumbnailUrl: 'https://dpwjbsxqtam5n.cloudfront.net/shows/behind-the-scenes.jpg',
            name: 'Behind the Scenes',
            shortname: 'Episodes',
            icon: 'icon-shows',
            description: "Have you ever wondered what it’s like to work at the Drumeo office? This is your behind the scenes look at what we do and all the shenanigans that happen day to day.",
            allowableFilters: [],
            sortBy: '-sort',
        },
        'study-the-greats': {
            thumbnailUrl: 'https://dpwjbsxqtam5n.cloudfront.net/shows/study-the-greats.jpg',
            name: 'Study the Greats',
            shortname: 'Episodes',
            icon: 'icon-shows',
            description: "Study the greats with Austin Burcham! These lessons break down the beats, licks, and ideas of some of the most famous drummers we have had out on Drumeo.",
            allowableFilters: [],
            sortBy: 'sort',
        },
        'live': {
            thumbnailUrl: 'https://dpwjbsxqtam5n.cloudfront.net/shows/show-live.jpg',
            name: 'Live',
            shortname: 'Live Lessons',
            icon: 'icon-shows',
            description: "Practice sessions, Q&A, celebrations, and more are available during Drumeo live lessons. Subscribe to an event or the whole calendar, so you don’t miss out!",
            allowableFilters: ['difficulty', 'genre', 'essentials', 'theory'],
            sortBy: '-published_on',
            tabs: [
                {
                    name: 'Lessons',
                    short_name: 'LESSONS',
                    value: '',
                },
                {
                    name: 'Instructors',
                    short_name: 'INSTRUCTORS',
                    is_group_by: true,
                    value: 'instructor',
                },
                {
                    name: 'Genres',
                    short_name: 'Genres',
                    is_group_by: true,
                    value: 'genre',
                },
            ],
        },
        'solo': {
            thumbnailUrl: 'https://dpwjbsxqtam5n.cloudfront.net/shows/solos.jpg',
            name: 'Solos',
            icon: 'icon-shows',
            description: "Watch drum solos performed by the many different artists we have had out on Drumeo! A great way to be entertained, motivated, and to learn through amazing performances.",
            allowableFilters: ['difficulty', 'genre'],
            sortBy: '-published_on',
            tabs: [
                {
                    name: 'Lessons',
                    short_name: 'LESSONS',
                    value: '',
                },
                {
                    name: 'Instructors',
                    short_name: 'INSTRUCTORS',
                    is_group_by: true,
                    value: 'instructor',
                },
                {
                    name: 'Genres',
                    short_name: 'Genres',
                    is_group_by: true,
                    value: 'genre',
                },
            ],
        },
        'performance': {
            thumbnailUrl: 'https://dpwjbsxqtam5n.cloudfront.net/shows/performances.jpg',
            name: 'Performances',
            icon: 'icon-shows',
            description: "Watch the world's best drummers perform songs, duets, and other inspirational pieces. Sit back, relax, and get ready to be inspired by these amazing performances!",
            allowableFilters: ['difficulty', 'genre'],
            sortBy: '-published_on',
            tabs: [
                {
                    name: 'Lessons',
                    short_name: 'LESSONS',
                    value: '',
                },
                {
                    name: 'Instructors',
                    short_name: 'INSTRUCTORS',
                    is_group_by: true,
                    value: 'instructor',
                },
                {
                    name: 'Genres',
                    short_name: 'Genres',
                    is_group_by: true,
                    value: 'genre',
                },
            ],
        },
        'exploring-beats': {
            thumbnailUrl: 'https://dpwjbsxqtam5n.cloudfront.net/shows/exploring-beats.jpg',
            name: 'Exploring Beats',
            icon: 'icon-shows',
            description: "Join Carson and his extraterrestrial roommate Gary as they travel through time and space exploring some of earth's greatest hip-hop beats and delicious snacks.",
            allowableFilters: [],
            sortBy: 'sort',
        },
        'sonor': {
            thumbnailUrl: 'https://dpwjbsxqtam5n.cloudfront.net/shows/sonor-drums.jpg',
            name: 'Sonor Drums: A Drumeo Documentary',
            shortname: 'Videos',
            icon: 'icon-shows',
            description: "Take a closer look at Sonor Drums with Jared as he explores the Sonor Factory in Bad Berleburg Germany and interviews the people behind the amazing brand.",
            allowableFilters: [],
            sortBy: 'published_on',
        },
        'paiste-cymbals': {
            thumbnailUrl: 'https://dpwjbsxqtam5n.cloudfront.net/shows/paiste-cymbals.jpg',
            name: 'Paiste Cymbals: A Drumeo Documentary',
            shortname: 'Videos',
            icon: 'icon-shows',
            description: "Take a closer look at Paiste Cymbals with Jared as he explores the Paiste factory in Switzerland and interviews the people behind the amazing brand.",
            allowableFilters: [],
            sortBy: 'published_on',
        },
        'rhythms-from-another-planet': {
            thumbnailUrl: 'https://dpwjbsxqtam5n.cloudfront.net/shows/rythms-from-another-planet.jpg',
            name: 'Rhythms From Another Planet',
            shortname: 'Videos',
            icon: 'icon-shows',
            description: "Flying Saucers Over Canada! Aliens from the Horsehead Nebula are here glitching humans! Aaron assembles an assortment of numerically nimble nerds to save the day! Tag along for the adventure, Glitchings, Quintuplet Panteradies, and save the world to learn some phenomenally fancy fives!",
            allowableFilters: [],
            sortBy: 'sort',
        },
        'tama': {
            thumbnailUrl: 'https://dpwjbsxqtam5n.cloudfront.net/shows/tama-drums.jpg',
            name: 'Tama Drums',
            shortname: 'Episodes',
            icon: 'icon-shows',
            description: "Take a closer look at Tama Drums with Jared as he explores the Tama factory in Japan, learns about Japanese Culture, experiments with traditional Taiko drummers, and interviews the people behind the amazing brand.",
            allowableFilters: [],
            sortBy: 'published_on',
        },
        'question-and-answer': {
            thumbnailUrl: 'https://dpwjbsxqtam5n.cloudfront.net/shows/question-answer.jpg',
            shortname: 'Lessons',
            icon: 'icon-shows',
            description: "Get any drum related question answered by a Drumeo instructor on our weekly Q&A episodes! You can submit as many questions as you like by clicking the button below, and either join us live for the next episode, or check for your answer in the archived videos below!",
        },
        'student-collaboration': {
            thumbnailUrl: 'https://dpwjbsxqtam5n.cloudfront.net/shows/student-collaborations.jpg',
            name: 'Drumeo Monthly Collaborations',
            shortname: 'Collaborations',
            icon: 'icon-shows',
            description: "Collaborate with the community with Drumeo Monthly Collaborations! Each month a new Play-Along is chosen and members are tasked to submit their videos playing along to the song. At the end of each month, every video is joined together to create a single performance!",
            allowableFilters: [],
            sortBy: '-published_on',
            trailer1: {
                vimeo_video_id: 448684113,
                video_playback_endpoints: [
                    {
                        file: "https://player.vimeo.com/progressive_redirect/playback/448684113/rendition/240p/file.mp4?loc=external&oauth2_token_id=1284792283&signature=7f75733de09ec3266322845bdd2dd9a0e740c916b9a824710d6272b8d51793ae",
                        width: 426,
                        height: 240
                    },
                    {
                        file: "https://player.vimeo.com/progressive_redirect/playback/448684113/rendition/360p/file.mp4?loc=external&oauth2_token_id=1284792283&signature=c55155a36018e86d6f008d905075bb749f2ee5fb12989845a3d2e5a9c28141e6",
                        width: 640,
                        height: 360
                    },
                    {
                        file: "https://player.vimeo.com/progressive_redirect/playback/448684113/rendition/540p/file.mp4?loc=external&oauth2_token_id=1284792283&signature=d71e1f8771e78e398c17ee0167611c1619ef11f90b0287b6dff1678279cb67a3",
                        width: 960,
                        height: 540
                    },
                    {
                        file: "https://player.vimeo.com/progressive_redirect/playback/448684113/rendition/720p/file.mp4?loc=external&oauth2_token_id=1284792283&signature=538b5eec06dd01591f156a96c4108e217bd7ad8903e5084e8fb3428e0f8a69a6",
                        width: 1280,
                        height: 720
                    },
                    {
                        file: "https://player.vimeo.com/progressive_redirect/playback/448684113/rendition/1080p/file.mp4?loc=external&oauth2_token_id=1284792283&signature=589537c220ca4c99e746a2d24e2dad8017da016d195485a17a2c8409b3ea8c60",
                        width: 1920,
                        height: 1080
                    },
                    {
                        file: "https://player.vimeo.com/progressive_redirect/playback/448684113/rendition/1440p/file.mp4?loc=external&oauth2_token_id=1284792283&signature=dda9240afee2489dbedda42499d432ebc1454e5ff2bb615bf2af8b8a298d6044",
                        width: 2560,
                        height: 1440
                    },
                    {
                        file: "https://player.vimeo.com/progressive_redirect/playback/448684113/rendition/2160p/file.mp4?loc=external&oauth2_token_id=1284792283&signature=92997d941ff58b9cf8e17d6cf8ec07b332bcf61138e8ea0805fba091501e0e7c",
                        width: 3840,
                        height: 2160
                    }
                ],
                length_in_seconds: 53,
                hlsManifestUrl: "https://player.vimeo.com/external/448684113.m3u8?s=dfb6ad351fcc3f2e5d98c7e7fac7303fa2b0a416&oauth2_token_id=1284792283",
            },
            trailer2: {
                vimeo_video_id: 448684140,
                video_playback_endpoints: [
                    {
                        file: "https://player.vimeo.com/progressive_redirect/playback/448684140/rendition/240p/file.mp4?loc=external&oauth2_token_id=1284792283&signature=1c9adb344eaf45a1f854a209e62616e19feea57516c37f5eb1f884cac928fb06",
                        width: 426,
                        height: 240
                    },
                    {
                        file: "https://player.vimeo.com/progressive_redirect/playback/448684140/rendition/360p/file.mp4?loc=external&oauth2_token_id=1284792283&signature=cde9f4fb028217960e5a2612688d8d18550db81964f1bf21f003fced6b9f63dd",
                        width: 640,
                        height: 360
                    },
                    {
                        file: "https://player.vimeo.com/progressive_redirect/playback/448684140/rendition/540p/file.mp4?loc=external&oauth2_token_id=1284792283&signature=eb870305e3c2719aad514b07026030d7738b5a107693794d0745574e5392fd12",
                        width: 960,
                        height: 540
                    },
                    {
                        file: "https://player.vimeo.com/progressive_redirect/playback/448684140/rendition/720p/file.mp4?loc=external&oauth2_token_id=1284792283&signature=309527ab8047731ace6a103a24536f952a5dc3bd8be2c5c2529385cc2377f8f6",
                        width: 1280,
                        height: 720
                    },
                    {
                        file: "https://player.vimeo.com/progressive_redirect/playback/448684140/rendition/1080p/file.mp4?loc=external&oauth2_token_id=1284792283&signature=f93e002d6d73facf146a3cdcb2d74d8b42677897282d0f89abb02871c664d6d4",
                        width: 1920,
                        height: 1080
                    },
                    {
                        file: "https://player.vimeo.com/progressive_redirect/playback/448684140/rendition/1440p/file.mp4?loc=external&oauth2_token_id=1284792283&signature=4b83c2a73161532bbe36dfae5a1203aa4b6475c60554117533dcd303e76cb67b",
                        width: 2560,
                        height: 1440
                    },
                    {
                        file: "https://player.vimeo.com/progressive_redirect/playback/448684140/rendition/2160p/file.mp4?loc=external&oauth2_token_id=1284792283&signature=3108a1db7e86bd133fe01fd4384980ffaa62e854af5588d94a7f8befb92db563",
                        width: 3840,
                        height: 2160
                    }
                ],
                length_in_seconds: 106,
                hlsManifestUrl: "https://player.vimeo.com/external/448684140.m3u8?s=06db72bb51f3bc10cde8367452c3cb19ed8834b2&oauth2_token_id=1284792283",
            }
        },
        'diy-drum-experiment': {
            thumbnailUrl: 'https://dpwjbsxqtam5n.cloudfront.net/shows/diy-drum-experiments.jpg',
            name: 'DIY Drum Experiments',
            shortname: 'Episodes',
            icon: 'icon-shows',
            description: "Step into David Raouf’s workshop where he will show you how to repurpose old and broken drum gear into usable and functional items! Whether you are a handyman or not, this show will give you unique and creative ideas and drum hacks that you have never seen before!",
            allowableFilters: [],
            sortBy: 'sort',
        },
        'rhythmic-adventures-of-captain-carson': {
            thumbnailUrl: 'https://dpwjbsxqtam5n.cloudfront.net/shows/raocc-showcard.jpg',
            name: 'Rhythmic Adventures of Captain Carson',
            shortname: 'Episodes',
            icon: 'icon-shows',
            description: "In The Rhythmic Adventures of Captain Carson, kids will join Captain Carson and his best friends Ricky (the robot) and Gary (the alien) as they fly through space and learn fun musical grooves. But they’ve got to be quick, because the tricky Groove Troll is trying to steal their groove!",
            allowableFilters: [],
            sortBy: 'sort',
        },
        'in-rhythm': {
            thumbnailUrl: 'https://dpwjbsxqtam5n.cloudfront.net/shows/in-rhythm-show-card.jpg',
            name: 'In Rhythm',
            shortname: 'Episodes',
            icon: 'icon-shows',
            description: "Witness a day in the life of a professional touring drummer on the road! “In Rhythm” gives you an inside look into professional drummers, what they do on the road outside of performing, and how they warm-up and prepare for the big stage!",
            allowableFilters: [],
            sortBy: 'sort',
        },
        'backstage-secret': {
            thumbnailUrl: 'https://www.musora.com/musora-cdn/image/width=500,height=500,quality=95,fit=cover/https://d1923uyy6spedc.cloudfront.net/RushDoc-Neil-02.jpg',
            name: 'Backstage Secrets',
            shortname: 'Episodes',
            icon: 'icon-shows',
            description: "Join the roadies of Rush and get a firsthand look at what it's like to be part of one of our favorite bands. You’re going on an exciting, behind-the-scenes journey to their 2008 Snakes & Arrows Concert Tour - an exclusive invitation to witness the reveal of all of the band’s backstage secrets. Roadies are the unsung heroes of any band - and being a roadie with a top-rated, world-famous rock and roll band is a highly coveted job. It may appear to be all glamour and adventure, but it can be a grueling marathon of 18-hour workdays!",
            allowableFilters: [],
            sortBy: 'sort',
        },
        'the-history-of-electronic-drums': {
            thumbnailUrl: 'https://imagedelivery.net/0Hon__GSkIjm-B_W77SWCA/31847ba4-02d4-4c6a-4507-32b40284a000/width=500,height=500,quality=95,fit=cover',
            name: 'The History Of Electronic Drums',
            shortname: 'Episodes',
            icon: 'icon-shows',
            description: "The music industry is dominated by electronic music and electronic drums. For the first time ever, we’ve gathered 14 of the most innovative electronic drum kits to learn more about how they were made, how they work, and most importantly, how they sound.",
            allowableFilters: [],
            sortBy: 'sort',
            amountOfFutureLessonsToShow: 10,
            showFutureLessonAtTopOrBottom: 'bottom',
        },
        'drum-fest-international-2022': {
            thumbnailUrl: 'https://musora.com/cdn-cgi/imagedelivery/0Hon__GSkIjm-B_W77SWCA/2c12c9ae-5a67-4767-f257-d1fa3693bd00/public',
            name: '2022 Drum Fest International',
            shortname: 'Episodes',
            icon: 'icon-shows',
            description: "In 2022, Drumeo had the exclusive honor of filming Ralph Angelillo’s Drum Fest International. It was an incredible gathering of some of the best drummers in the world. Tune in to see a spectrum of unforgettable performances - from Greyson Nekrutman’s show-stopping jazz, to Simon Phillips’ fancy fusion work, these are videos you do not want to miss.",
            allowableFilters: [],
            sortBy: 'sort'
        },
        'spotlight': {
            thumbnailUrl: 'https://imagedelivery.net/0Hon__GSkIjm-B_W77SWCA/0b67bd7f-220f-41f3-1797-8c6883a00a00/width=500,height=500,quality=95,fit=cover',
            name: 'Spotlight',
            shortname: 'Spotlight',
            icon: 'icon-shows',
            description: "We're standing on the shoulders of giants. Those who came before us paved the way for everyone who came after by developing most of what we take for granted today, in the world of drum-set playing. Learning about these giants and their contributions to our craft is essential to fully appreciate and understand what we do as musicians. This is the journey Todd Sucherman is inviting you to take on with him, as he navigates the incredible world of Spotlight.",
            allowableFilters: [],
            sortBy: 'sort',
            tabs: [
                {
                    name: 'All Spotlights',
                    short_name: 'ALL',
                    value: ''
                },
            ]
        },
        'play-along': {
            name: "Play Alongs",
            icon: "icon-play-alongs",
            description: "Add your drumming to high-quality drumless play-along tracks - with handy playback tools to help you create the perfect performance.",
            allowableFilters: ['difficulty', 'genre', 'bpm'],
            tabs: [
                {
                    name: 'All Play-Alongs',
                    short_name: 'ALL',
                    value: '',
                },
            ],
        },
        'pack': {
            allowableFilters: ['difficulty', 'genre', 'essentials', 'theory', 'lifestyle'],
        },
    },
    'pianote':{
        'coaches': {
            description: "Your piano journey is unique. You need personalized coaching that helps you reach your goals. Learn from some of the best pianists in the world!",
        },
        'song': {
            thumbnailUrl: 'https://dpwjbsxqtam5n.cloudfront.net/shows/pianote/songs.jpg',
            shortname: 'songs',
            amountOfFutureLessonsToShow: 3,
            showFutureLessonAtTopOrBottom: 'bottom',
            sortBy: 'slug',
        },
        'course': {
            name: "Courses",
            thumbnailUrl: 'https://dpwjbsxqtam5n.cloudfront.net/shows/pianote/courses.jpg',
            allowableFilters: ['difficulty', 'genre', 'essentials', 'theory', 'creativity', 'lifestyle'],
            sortBy: '-published_on',
            shortname: 'Courses',
            icon: "icon-courses",
            description: "Tackle your next piano goal with bite-sized courses from many of the world's best pianists.",
            amountOfFutureLessonsToShow: 3,
            showFutureLessonAtTopOrBottom: 'bottom',
            tabs: [
                {
                    name: 'Courses',
                    short_name: 'COURSES',
                    value: '',
                },
                {
                    name: 'Instructors',
                    short_name: 'INSTRUCTORS',
                    is_group_by: true,
                    value: 'instructor',
                },
                {
                    name: 'Genres',
                    short_name: 'Genres',
                    is_group_by: true,
                    value: 'genre',
                },
            ],
        },
        'quick-tips': {
            thumbnailUrl: 'https://imagedelivery.net/0Hon__GSkIjm-B_W77SWCA/7979495d-d06a-4f78-161f-2f670f6f9800/public',
            shortname: 'Quick Tips',
            icon: 'fa-lightbulb',
            amountOfFutureLessonsToShow: 3,
            showFutureLessonAtTopOrBottom: 'bottom',
        },
        'student-review': {
            thumbnailUrl: 'https://dpwjbsxqtam5n.cloudfront.net/shows/pianote/student-review.jpg',
            shortname: 'Student Reviews',
            description: "Want feedback on your playing? Submit a video for student review. We will watch your submission and then provide helpful encouragement and feedback. This is a great way to build accountability and benefit from the expertise of our teachers.",
            amountOfFutureLessonsToShow: 3,
            showFutureLessonAtTopOrBottom: 'bottom',
        },
        'question-and-answer': {
            thumbnailUrl: 'https://dpwjbsxqtam5n.cloudfront.net/shows/pianote/question-answer.jpg',
            shortname: 'Q&A',
            icon: 'icon-student-focus',
            description: "Each week we go live to answer your questions. Submit your questions in advance using the button below, in the Q&A thread in the forums, or live in the community chat.",
            amountOfFutureLessonsToShow: 3,
            showFutureLessonAtTopOrBottom: 'bottom',
            tabs: [
                {
                    name: 'Lessons',
                    short_name: 'LESSONS',
                    value: '',
                },
                {
                    name: 'Instructors',
                    short_name: 'INSTRUCTORS',
                    is_group_by: true,
                    value: 'instructor',
                },
                {
                    name: 'Genres',
                    short_name: 'Genres',
                    is_group_by: true,
                    value: 'genre',
                },
            ],
        },
        'boot-camp': {
            thumbnailUrl: 'https://dpwjbsxqtam5n.cloudfront.net/shows/pianote/bootcamps.jpg',
            name: 'Bootcamps',
            allowableFilters: ['difficulty', 'genre', 'essentials'],
            sortBy: '-published_on',
            shortname: 'Bootcamps',
            icon: 'icon-chords-scales-icon',
            description: "These bootcamps deliver results, but they also require commitment. Select a topic that you want to become an expert in, and get ready to learn!",
            amountOfFutureLessonsToShow: 3,
            showFutureLessonAtTopOrBottom: 'bottom',
            tabs: [
                {
                    name: 'Lessons',
                    short_name: 'LESSONS',
                    value: '',
                },
                {
                    name: 'Instructors',
                    short_name: 'INSTRUCTORS',
                    is_group_by: true,
                    value: 'instructor',
                },
                {
                    name: 'Genres',
                    short_name: 'Genres',
                    is_group_by: true,
                    value: 'genre',
                },
            ],
        },
        'podcast': {
            thumbnailUrl: 'https://dpwjbsxqtam5n.cloudfront.net/shows/pianote/podcast.png',
            name: 'The Pianote Podcast',
            allowableFilters: ['difficulty', 'genre'],
            sortBy: '-published_on',
            shortname: 'Podcast',
            icon: 'icon-podcast',
            description: "Join Lisa in her quest to unify piano players around the world, build community, and make playing the piano cool!",
            amountOfFutureLessonsToShow: 3,
            showFutureLessonAtTopOrBottom: 'bottom',
            tabs: [
                {
                    name: 'Lessons',
                    short_name: 'LESSONS',
                    value: '',
                },
                {
                    name: 'Instructors',
                    short_name: 'INSTRUCTORS',
                    is_group_by: true,
                    value: 'instructor',
                },
                {
                    name: 'Genres',
                    short_name: 'Genres',
                    is_group_by: true,
                    value: 'genre',
                },
            ],
        },
        'song-tutorial': {
            name: "Song Tutorials",
            thumbnailUrl: 'https://dpwjbsxqtam5n.cloudfront.net/shows/pianote/songs.jpg',
            allowableFilters: ['difficulty', 'genre'],
            sortBy: '-published_on',
            shortname: 'song tutorials',
            icon: "play-progress",
            description: "",
            amountOfFutureLessonsToShow: 3,
            showFutureLessonAtTopOrBottom: 'bottom',
            tabs: [
                {
                    name: 'Lessons',
                    short_name: 'Lessons',
                    value: '',
                },
                {
                    name: 'Artists',
                    short_name: 'ARTISTS',
                    is_group_by: true,
                    value: 'artist',
                },
                {
                    name: 'Genres',
                    short_name: 'Genres',
                    is_group_by: true,
                    value: 'genre',
                },
            ],
        },
    },
    'guitareo': {
        'coaches': {
            description: "Tackle your next guitar goal with bite-sized courses from many of the world's best guitarists.",
        },
        'courses': {
            name: "Courses",
            icon: "icon-courses",
            description: "These jam-packed training courses cover various lesson topics in detail. Find one that suits your guitar goals, and get started!",
            allowableFilters: ['difficulty', 'genre', 'essentials', 'theory', 'creativity', 'lifestyle'],
            tabs: [
                {
                    name: 'Courses',
                    short_name: 'COURSES',
                    value: '',
                },
                {
                    name: 'Instructors',
                    short_name: 'INSTRUCTORS',
                    is_group_by: true,
                    value: 'instructor',
                },
                {
                    name: 'Genres',
                    short_name: 'Genres',
                    is_group_by: true,
                    value: 'genre',
                },
            ],
        },
        'challenge': {
            tabs: [
                {
                    name: 'All',
                    short_name: 'All',
                    value: '',
                },
                {
                    name: 'Completed',
                    short_name: 'COMPLETED',
                    is_group_by: true,
                    value: 'completed'
                },
                {
                    name: 'Owned Challenges',
                    short_name: 'OWNED CHALLENGES',
                    is_group_by: true,
                    value: 'owned',
                },
            ],
        },
        'song': {
            allowableFilters: ['difficulty', 'genre', 'lifestyle', 'instrumentless'],
        },
        'play-along': {
            name: "Play Alongs",
            icon: "icon-play-alongs",
            description: "Our play-along feature teaches you chords, strumming patterns, riffs, and song layouts -- with handy playback tools to help you create the perfect performance.",
            allowableFilters: ['difficulty', 'genre', 'essentials', 'theory', 'lifestyle'],
            tabs: [
                {
                    name: 'All Play-Alongs',
                    short_name: 'ALL',
                    value: '',
                },
            ],
        },
        'recording': {
            name: "Archives",
            shortname: "Lessons",
            icon: "icon-library",
            description: "Miss a live event or just want to watch a particular episode again? This is the place to do it. All of the Guitareo live broadcasts are archived here for you to watch at your leisure. If you have any questions or want to discuss the topics mentioned in the videos you can always post in the forum.",
            allowableFilters: ['difficulty', 'genre'],
            tabs: [
                {
                    name: 'Lessons',
                    short_name: 'LESSONS',
                    value: '',
                },
                {
                    name: 'Instructors',
                    short_name: 'INSTRUCTORS',
                    is_group_by: true,
                    value: 'instructor',
                },
                {
                    name: 'Genres',
                    short_name: 'Genres',
                    is_group_by: true,
                    value: 'genre',
                },
            ],
        },
        'quick-tips': {
            thumbnailUrl: 'https://imagedelivery.net/0Hon__GSkIjm-B_W77SWCA/297dc5b4-e878-4238-d5b5-ed0588ee0b00/public',
            shortname: "quick-tips",
            icon: "icon-shows",
            allowableFilters: ['difficulty', 'genre', 'essentials', 'theory', 'lifestyle'],
        },
        'question-and-answer': {
            icon: "fas fa-question-circle",
            description: "Each week we go live to answer your questions. Submit your questions in advance using the button below, in the Q&A thread in the forums, or live in the community chat.",
            allowableFilters: ['difficulty', 'genre', 'essentials', 'theory'],
        },
        'student-review': {
            thumbnailUrl: 'https://d1923uyy6spedc.cloudfront.net/student-reviews-singeo.png',
            description: "Want feedback on your playing? Submit a video for student review. We will watch your submission and then provide helpful encouragement and feedback. This is a great way to build accountability and benefit from the expertise of our teachers.",
        },
    },
    'singeo':{
        'coaches': {
            description: "Your singing journey is unique. You need personalized coaching that helps you reach your goals. Learn from some of the best singers and vocal coaches in the world!",
        },
        'courses': {
            name: "Courses",
            icon: "icon-courses",
            description: "Tackle your next singing goal with bite-sized courses from many of the world's best vocalists.",
            allowableFilters: ['difficulty', 'genre', 'essentials', 'theory', 'creativity', 'lifestyle'],
            tabs: [
                {
                    name: 'Courses',
                    short_name: 'COURSES',
                    value: '',
                },
                {
                    name: 'Instructors',
                    short_name: 'INSTRUCTORS',
                    is_group_by: true,
                    value: 'instructor',
                },
                {
                    name: 'Genres',
                    short_name: 'Genres',
                    is_group_by: true,
                    value: 'genre',
                },
            ],
        },
        'quick-tips': {
            thumbnailUrl: 'https://imagedelivery.net/0Hon__GSkIjm-B_W77SWCA/8464033e-9b4e-458e-d613-e89fb47e2a00/public',
            icon: "icon-shows",
        },
        'challenge': {
            tabs: [
                {
                    name: 'All',
                    short_name: 'All',
                    value: '',
                },
                {
                    name: 'Completed',
                    short_name: 'COMPLETED',
                    is_group_by: true,
                    value: 'completed'
                },
                {
                    name: 'Owned Challenges',
                    short_name: 'OWNED CHALLENGES',
                    is_group_by: true,
                    value: 'owned',
                },
            ],
        },
        'question-and-answer': {
            thumbnailUrl: 'https://d1923uyy6spedc.cloudfront.net/question-answer.png',
            icon: "fas fa-question-circle",
            tabs: [
                {
                    name: 'Lessons',
                    short_name: 'LESSONS',
                    value: '',
                },
                {
                    name: 'Instructors',
                    short_name: 'INSTRUCTORS',
                    is_group_by: true,
                    value: 'instructor',
                },
                {
                    name: 'Genres',
                    short_name: 'Genres',
                    is_group_by: true,
                    value: 'genre',
                },
            ],
        },
        'student-review': {
            thumbnailUrl: 'https://d1923uyy6spedc.cloudfront.net/student-reviews.png',
            icon: "icon-student-focus",
            description: "Want feedback on your singing? Submit a video for student review. We will watch your submission and then provide helpful encouragement and feedback. This is a great way to build accountability and benefit from the expertise of our teachers.",
        },
        'routine': {
            name: "Routines",
            icon: "icon-shows",
            description: "Warm up your voice for any occasion with our bite-sized routines - ranging from 5 to 20 minutes - perfect for busy days or when you need motivation.",
            allowableFilters: ['difficulty', 'genre', 'type'],
            tabs: [
                {
                    name: 'All Routines',
                    short_name: 'ALL ROUTINES',
                    value: '',
                },
            ],
            trailer: {
                vimeo_video_id: 578243377,
                video_playback_endpoints: [
                    {
                        file: "https://player.vimeo.com/progressive_redirect/playback/578243377/rendition/360p/file.mp4?loc=external&oauth2_token_id=1284792283&signature=9eff053636a9b8abc19a0e44ae437f7fa50a0cf0a83c39373e8ae29b50dff9b6",
                        width: 640,
                        height: 360
                    },
                    {
                        file: "https://player.vimeo.com/progressive_redirect/playback/578243377/rendition/540p/file.mp4?loc=external&oauth2_token_id=1284792283&signature=f8a01157cd5707e6ade5f84a867edbd4f549f091c6c284c5352ec290b9db7bf7",
                        width: 960,
                        height: 540
                    },
                    {
                        file: "https://player.vimeo.com/progressive_redirect/playback/578243377/rendition/720p/file.mp4?loc=external&oauth2_token_id=1284792283&signature=8ccd1473aae48a510d44d38df2312a72c254e210e230f79cc0c3efae7b82f6b6",
                        width: 1280,
                        height: 720
                    },
                    {
                        file: "https://player.vimeo.com/progressive_redirect/playback/578243377/rendition/1080p/file.mp4?loc=external&oauth2_token_id=1284792283&signature=a3b326c9c79746ddf4915133220f70e4f9498e5fb089ebba0361583d2a55376d",
                        width: 1920,
                        height: 1080
                    },
                    {
                        file: "https://player.vimeo.com/progressive_redirect/playback/578243377/rendition/1440p/file.mp4?loc=external&oauth2_token_id=1284792283&signature=c0309249419ce7f80d9bbc89c63851fbb194e623fca6046b7e685611627eceac",
                        width: 2560,
                        height: 1440
                    },
                    {
                        file: "https://player.vimeo.com/progressive_redirect/playback/578243377/rendition/2160p/file.mp4?loc=external&oauth2_token_id=1284792283&signature=6ea971d1165f0f1df7af46ccdc33041a70e917028d1c1cd7af4279edd2ef9550",
                        width: 3840,
                        height: 2160
                    }
                ],
                length_in_seconds: 82,
                hlsManifestUrl: "https://player.vimeo.com/external/578243377.m3u8?s=3def726f48a4a300420f793090e4913a48c8d1f9&oauth2_token_id=1284792283"
            }
        },
    }
};

function processMetadata(brand, type, withFilters = false) {
    let commonMetaData = contentMetadata['common']?.[type];
    // If the type is explicitly defined as null or the brand doesn't exist return null
    // Specifically this is for drumeo.student-review
    if (contentMetadata[brand]?.[type] === null) {
        return null;
    }

    let metadataElement = contentMetadata[brand]?.[type];
    metadataElement = {...commonMetaData, ...metadataElement};
    if (!metadataElement) {
        return null;
    }
    const processedData = {
        type,
        thumbnailUrl: metadataElement.thumbnailUrl || null,
        name: metadataElement.name || null,
        description: metadataElement.description || null
    };

    if (withFilters) {
        Object.keys(metadataElement).forEach(key => {
            if (!['thumbnailUrl', 'name', 'description'].includes(key)) {
                processedData[key] = metadataElement[key];
            }
        });
    }

    return processedData;
}

module.exports = {
    processMetadata,
}
