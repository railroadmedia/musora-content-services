const DEFAULT_FIELDS = [
    "'sanity_id' : _id",
    "'id': railcontent_id",
    'railcontent_id',
    artistOrInstructorName(),
    "artist",
    "title",
    "'image': thumbnail.asset->url",
    "'thumbnail': thumbnail.asset->url",
    "difficulty",
    "difficulty_string",
    "web_url_path",
    "published_on",
    "'type': _type",
    "progress_percent",
    "'length_in_seconds' : coalesce(length_in_seconds, soundslice[0].soundslice_length_in_second)",
    "brand",
    "'genre': genre[]->name",
    'status',
    "'slug' : slug.current",
];

const descriptionField = 'description[0].children[0].text';

const assignmentsField = `"assignments":assignment[]{
    "id": railcontent_id,
        "soundslice_slug": assignment_soundslice,
        "title": assignment_title,
        "sheet_music_image_url": assignment_sheet_music_image,
        "timecode": assignment_timecode,
        "description": assignment_description
},`

const contentWithInstructorsField = {
    'fields': [
        '"instructors": instructor[]->name',
    ]
}

const contentWithSortField = {
    'fields': [
        'sort',
    ]
}
const showsTypes = {
    'drumeo': ['drum-fest-international-2022', 'spotlight', 'the-history-of-electronic-drums', 'backstage-secret', 'quick-tips', 'question-and-answer', 'student-collaboration',
         'live', 'podcast', 'solo', 'boot-camp', 'gear-guide', 'performance', 'in-rhythm', 'challenges', 'on-the-road', 'diy-drum-experiment', 'rhythmic-adventures-of-captain-carson',
        'study-the-greats', 'rhythms-from-another-planet', 'tama', 'paiste-cymbals', 'behind-the-scenes', 'exploring-beats', 'sonor'
    ],
    'pianote': ['student-review', 'question-and-answer'],
    'guitareo': ['student-review', 'question-and-answer', 'archives', 'recording'],
    'singeo': ['student-review', 'question-and-answer']
}

const contentMetadata = {
    'drumeo': {
        'coaches': {
            name: 'Coaches',
            icon: 'icon-coach',
            description: "Your drumming journey is unique. You need personalized coaching that helps you reach your goals. Learn from some of the best drummers in the world!",
            allowableFilters: ['difficulty', 'genre', 'essentials', 'theory', 'creativity', 'lifestyle'],
            sortBy: '-published_on',
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
                    value: [''],
                },
                {
                    name: 'Instructors',
                    short_name: 'INSTRUCTORS',
                    is_group_by: true,
                    value: ['instructor'],
                },
                {
                    name: 'Genres',
                    short_name: 'Genres',
                    is_group_by: true,
                    value: ['genre'],
                },
            ],
        },
        'song': {
            name: 'Songs',
            icon: 'icon-songs',
            description: "Play the songs you love with note-for-note transcriptions and handy practice tools.",
            allowableFilters: ['difficulty', 'genre', 'lifestyle', 'instrumentless'],
            sortBy: 'slug',
            tabs: [
                {
                    name: 'Songs',
                    short_name: 'Songs',
                    value: [''],
                },
                {
                    name: 'Artists',
                    short_name: 'ARTISTS',
                    is_group_by: true,
                    value: ['artist'],
                },
                {
                    name: 'Genres',
                    short_name: 'Genres',
                    is_group_by: true,
                    value: ['genre']
                },
            ],
        },
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
                    value: [''],
                },
                {
                    name: 'Instructors',
                    short_name: 'INSTRUCTORS',
                    is_group_by: true,
                    value: ['instructor'],
                },
                {
                    name: 'Genres',
                    short_name: 'Genres',
                    is_group_by: true,
                    value: ['genre'],
                },
            ],
        },
        'rudiments': {
            name: 'Rudiments',
            icon: 'icon-drums',
            description: "The 40 drum rudiments are essential for any drummer, no matter the style, genre, or scenario. You can use the videos below to help you learn, practice, and perfect every single one.",
            allowableFilters: ['difficulty', 'genre', 'gear', 'topic'],
            tabs: [
                {
                    name: 'All',
                    short_name: 'ALL',
                    value: [''],
                },
                {
                    name: 'Drags',
                    short_name: 'DRAGS',
                    is_required_field: true,
                    value: ['topic,drags,string,='],
                },
                {
                    name: 'Flams',
                    short_name: 'FLAMS',
                    is_required_field: true,
                    value: ['topic,flams,string,='],
                },
                {
                    name: 'Paradiddles',
                    short_name: 'PARADIDDLES',
                    is_required_field: true,
                    value: ['topic,paradiddles,string,='],
                },
                {
                    name: 'Rolls',
                    short_name: 'ROLLS',
                    is_required_field: true,
                    value: ['topic,rolls,string,='],
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
                    value: [''],
                },
                {
                    name: 'Instructors',
                    short_name: 'INSTRUCTORS',
                    is_group_by: true,
                    value: ['instructor'],
                },
                {
                    name: 'Genres',
                    short_name: 'Genres',
                    is_group_by: true,
                    value: ['genre'],
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
                    value: [''],
                },
                {
                    name: 'Instructors',
                    short_name: 'INSTRUCTORS',
                    is_group_by: true,
                    value: ['instructor'],
                },
                {
                    name: 'Genres',
                    short_name: 'Genres',
                    is_group_by: true,
                    value: ['genre'],
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
                    value: [''],
                },
                {
                    name: 'Instructors',
                    short_name: 'INSTRUCTORS',
                    is_group_by: true,
                    value: ['instructor'],
                },
                {
                    name: 'Genres',
                    short_name: 'Genres',
                    is_group_by: true,
                    value: ['genre'],
                },
            ],
        },
        'quick-tips': {
            thumbnailUrl: 'https://musora.com/cdn-cgi/imagedelivery/0Hon__GSkIjm-B_W77SWCA/78e68540-2b93-4445-882c-a19eef6b5d00/public',
            name: 'Quick Tips',
            icon: 'icon-shows',
            description: "Only have 10 minutes? These short lessons are designed to inspire you with quick tips and exercises, even if you don’t have lots of time to practice.",
            allowableFilters: ['difficulty', 'genre', 'essentials', 'theory', 'lifestyle', 'creativity'],
            sortBy: '-published_on',
            tabs: [
                {
                    name: 'Lessons',
                    short_name: 'LESSONS',
                    value: [''],
                },
                {
                    name: 'Instructors',
                    short_name: 'INSTRUCTORS',
                    is_group_by: true,
                    value: ['instructor'],
                },
                {
                    name: 'Genres',
                    short_name: 'Genres',
                    is_group_by: true,
                    value: ['genre'],
                },
            ],
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
        'live-stream': {
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
                    value: [''],
                },
                {
                    name: 'Instructors',
                    short_name: 'INSTRUCTORS',
                    is_group_by: true,
                    value: ['instructor'],
                },
                {
                    name: 'Genres',
                    short_name: 'Genres',
                    is_group_by: true,
                    value: ['genre'],
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
                    value: [''],
                },
                {
                    name: 'Instructors',
                    short_name: 'INSTRUCTORS',
                    is_group_by: true,
                    value: ['instructor'],
                },
                {
                    name: 'Genres',
                    short_name: 'Genres',
                    is_group_by: true,
                    value: ['genre'],
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
                    value: [''],
                },
                {
                    name: 'Instructors',
                    short_name: 'INSTRUCTORS',
                    is_group_by: true,
                    value: ['instructor'],
                },
                {
                    name: 'Genres',
                    short_name: 'Genres',
                    is_group_by: true,
                    value: ['genre'],
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
            name: 'Q & A',
            shortname: 'Lessons',
            icon: 'icon-shows',
            description: "Get any drum related question answered by a Drumeo instructor on our weekly Q&A episodes! You can submit as many questions as you like by clicking the button below, and either join us live for the next episode, or check for your answer in the archived videos below!",
            allowableFilters: ['difficulty', 'genre', 'essentials', 'theory'],
            sortBy: '-published_on',
        },
        'student-collaboration': {
            thumbnailUrl: 'https://dpwjbsxqtam5n.cloudfront.net/shows/student-collaborations.jpg',
            name: 'Drumeo Monthly Collaborations',
            shortname: 'Collaborations',
            icon: 'icon-shows',
            description: "Collaborate with the community with Drumeo Monthly Collaborations! Each month a new Play-Along is chosen and members are tasked to submit their videos playing along to the song. At the end of each month, every video is joined together to create a single performance!",
            allowableFilters: [],
            sortBy: '-published_on',
            trailer1: 448684113,
            trailer2: 448684140,
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
                    value: ['']
                },
                {
                    name: 'Rolls',
                    short_name: 'ROLLS',
                    is_required_field: true,
                    value: 'topic == "rolls"'
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
                    value: [''],
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
        'challenge': {
            name: 'Challenges',
            icon: 'icon-courses',
            description: "... ",
            allowableFilters: ['difficulty', 'topic', 'genre'],
            sortBy: '-published_on',
            modalText: 'Challenges are a collection of Workout-style videos that build your skills one step at a time. They help you develop broader musical skills at a manageable pace — usually over a few days.',
        },
        'workout': {
            modalText: 'Workouts are fun play-along lessons that help hone your musical skills. They cover various topics, and have multiple difficulty and duration options — so there’s always a perfect Workout for you. Just pick one, press start, and play along!',
            allowableFilters: ['difficulty', 'genre', 'topic'],
            tabs: [
                {
                    name: 'All',
                    short_name: 'ALL',
                    value: [''],
                },
                {
                    name: '5 Minutes',
                    short_name: '5 MINS',
                    is_required_field: true,
                    value: ['length_in_seconds,450,integer,<,video'],
                },
                {
                    name: '10 Minutes',
                    short_name: '10 MINS',
                    is_required_field: true,
                    value: ['length_in_seconds,451,integer,>,video', 'length_in_seconds,751,integer,<,video'],
                },
                {
                    name: '15+ Minutes',
                    short_name: '15+ MINS',
                    is_required_field: true,
                    value: ['length_in_seconds,750,integer,>,video'],
                },
                {
                    name: 'Instructors',
                    short_name: 'INSTRUCTORS',
                    is_group_by: true,
                    value: ['instructor'],
                },
            ],
        },
        'pack': {
            allowableFilters: ['difficulty', 'genre', 'essentials', 'theory', 'lifestyle'],
        },
    },
    'pianote':{
        'coaches': {
            name: 'Coaches',
            icon: 'icon-coach',
            description: "Your piano journey is unique. You need personalized coaching that helps you reach your goals. Learn from some of the best pianists in the world!",
            allowableFilters: ['difficulty', 'genre', 'essentials', 'theory', 'creativity', 'lifestyle'],
            sortBy: '-published_on',
        },
        'song': {
            name: "Songs",
            thumbnailUrl: 'https://dpwjbsxqtam5n.cloudfront.net/shows/pianote/songs.jpg',
            shortname: 'songs',
            icon: "icon-songs",
            description: "Play the songs you love with note-for-note transcriptions and handy practice tools.",
            amountOfFutureLessonsToShow: 3,
            showFutureLessonAtTopOrBottom: 'bottom',
            allowableFilters: ['difficulty', 'genre', 'lifestyle', 'instrumentless'],
            sortBy: 'slug',
            tabs: [
                {
                    name: 'Songs',
                    short_name: 'Songs',
                    value: [''],
                },
                {
                    name: 'Artists',
                    short_name: 'ARTISTS',
                    is_group_by: true,
                    value: ['artist'],
                },
                {
                    name: 'Genres',
                    short_name: 'Genres',
                    is_group_by: true,
                    value: ['genre'],
                },
            ],
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
                    value: [''],
                },
                {
                    name: 'Instructors',
                    short_name: 'INSTRUCTORS',
                    is_group_by: true,
                    value: ['instructor'],
                },
                {
                    name: 'Genres',
                    short_name: 'Genres',
                    is_group_by: true,
                    value: ['genre'],
                },
            ],
        },
        'quick-tips': {
            name: 'Quick Tips',
            thumbnailUrl: 'https://imagedelivery.net/0Hon__GSkIjm-B_W77SWCA/7979495d-d06a-4f78-161f-2f670f6f9800/public',
            allowableFilters: ['difficulty', 'genre', 'essentials', 'theory', 'creativity', 'lifestyle'],
            sortBy: '-published_on',
            shortname: 'Quick Tips',
            icon: 'fa-lightbulb',
            description: "Only have 10 minutes? These short lessons are designed to inspire you with quick tips and exercises, even if you don’t have lots of time to practice.",
            amountOfFutureLessonsToShow: 3,
            showFutureLessonAtTopOrBottom: 'bottom',
            tabs: [
                {
                    name: 'Lessons',
                    short_name: 'LESSONS',
                    value: [''],
                },
                {
                    name: 'Instructors',
                    short_name: 'INSTRUCTORS',
                    is_group_by: true,
                    value: ['instructor'],
                },
                {
                    name: 'Genres',
                    short_name: 'Genres',
                    is_group_by: true,
                    value: ['genre'],
                },
            ],
        },
        'student-review': {
            name: 'Student Reviews',
            thumbnailUrl: 'https://dpwjbsxqtam5n.cloudfront.net/shows/pianote/student-review.jpg',
            allowableFilters: ['difficulty', 'genre', 'essentials', 'theory', 'creativity', 'lifestyle'],
            shortname: 'Student Reviews',
            icon: 'icon-student-focus',
            description: "Want feedback on your playing? Submit a video for student review. We will watch your submission and then provide helpful encouragement and feedback. This is a great way to build accountability and benefit from the expertise of our teachers.",
            amountOfFutureLessonsToShow: 3,
            showFutureLessonAtTopOrBottom: 'bottom',
            sortBy: '-published_on',
            tabs: [
                {
                    name: 'Lessons',
                    short_name: 'LESSONS',
                    value: [''],
                },
                {
                    name: 'Instructors',
                    short_name: 'INSTRUCTORS',
                    is_group_by: true,
                    value: ['instructor'],
                },
                {
                    name: 'Genres',
                    short_name: 'Genres',
                    is_group_by: true,
                    value: ['genre'],
                },
            ],
        },
        'question-and-answer': {
            thumbnailUrl: 'https://dpwjbsxqtam5n.cloudfront.net/shows/pianote/question-answer.jpg',
            name: 'Q&A',
            allowableFilters: ['difficulty', 'genre', 'essentials', 'theory'],
            sortBy: '-published_on',
            shortname: 'Q&A',
            icon: 'icon-student-focus',
            description: "Each week we go live to answer your questions. Submit your questions in advance using the button below, in the Q&A thread in the forums, or live in the community chat.",
            amountOfFutureLessonsToShow: 3,
            showFutureLessonAtTopOrBottom: 'bottom',
            tabs: [
                {
                    name: 'Lessons',
                    short_name: 'LESSONS',
                    value: [''],
                },
                {
                    name: 'Instructors',
                    short_name: 'INSTRUCTORS',
                    is_group_by: true,
                    value: ['instructor'],
                },
                {
                    name: 'Genres',
                    short_name: 'Genres',
                    is_group_by: true,
                    value: ['genre'],
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
                    value: [''],
                },
                {
                    name: 'Instructors',
                    short_name: 'INSTRUCTORS',
                    is_group_by: true,
                    value: ['instructor'],
                },
                {
                    name: 'Genres',
                    short_name: 'Genres',
                    is_group_by: true,
                    value: ['genre'],
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
                    value: [''],
                },
                {
                    name: 'Instructors',
                    short_name: 'INSTRUCTORS',
                    is_group_by: true,
                    value: ['instructor'],
                },
                {
                    name: 'Genres',
                    short_name: 'Genres',
                    is_group_by: true,
                    value: ['genre'],
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
                    value: [''],
                },
                {
                    name: 'Artists',
                    short_name: 'ARTISTS',
                    is_group_by: true,
                    value: ['artist'],
                },
                {
                    name: 'Genres',
                    short_name: 'Genres',
                    is_group_by: true,
                    value: ['genre'],
                },
            ],
        },
        'workout': {
            allowableFilters: ['difficulty', 'genre', 'topic'],
            tabs: [
                {
                    name: 'All',
                    short_name: 'ALL',
                    value: [''],
                },
                {
                    name: '5 Minutes',
                    short_name: '5 MINS',
                    is_required_field: true,
                    value: ['length_in_seconds,450,integer,<,video'],
                },
                {
                    name: '10 Minutes',
                    short_name: '10 MINS',
                    is_required_field: true,
                    value: ['length_in_seconds,451,integer,>,video', 'length_in_seconds,751,integer,<,video'],
                },
                {
                    name: '15+ Minutes',
                    short_name: '15+ MINS',
                    is_required_field: true,
                    value: ['length_in_seconds,750,integer,>,video'],
                },
                {
                    name: 'Instructors',
                    short_name: 'INSTRUCTORS',
                    is_group_by: true,
                    value: ['instructor'],
                },
            ],
            modalText: 'Workouts are fun play-along lessons that help hone your musical skills. They cover various topics, and have multiple difficulty and duration options — so there’s always a perfect Workout for you. Just pick one, press start, and play along!',
        },
        'challenge-part': {
            name: 'Challenge Part',
            icon: 'icon-courses',
            description: "... ",
            allowableFilters: ['difficulty', 'genre', 'topic'],
            sortBy: '-published_on',
        },
        'challenge': {
            name: 'Challenges',
            icon: 'icon-courses',
            description: "... ",
            allowableFilters: ['difficulty', 'topic', 'genre'],
            sortBy: '-published_on',
            modalText: 'Challenges are a collection of Workout-style videos that build your skills one step at a time. They help you develop broader musical skills at a manageable pace — usually over a few days.',
        },
        'pack': {
            allowableFilters: [],
        },
    },
    'guitareo': {
        'coaches': {
            name: 'Coaches',
            icon: 'icon-coach',
            description: "Tackle your next guitar goal with bite-sized courses from many of the world's best guitarists.",
            allowableFilters: ['difficulty', 'genre', 'essentials', 'theory', 'creativity', 'lifestyle'],
            sortBy: '-published_on',
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
                    value: [''],
                },
                {
                    name: 'Instructors',
                    short_name: 'INSTRUCTORS',
                    is_group_by: true,
                    value: ['instructor'],
                },
                {
                    name: 'Genres',
                    short_name: 'Genres',
                    is_group_by: true,
                    value: ['genre'],
                },
            ],
        },
        'song': {
            name: "Songs",
            icon: "icon-songs",
            description: "Play the songs you love with note-for-note transcriptions and handy practice tools.",
            allowableFilters: ['difficulty', 'genre', 'lifestyle', 'instrumentless'],
            tabs: [
                {
                    name: 'Songs',
                    short_name: 'Songs',
                    value: [''],
                },
                {
                    name: 'Artists',
                    short_name: 'ARTISTS',
                    is_group_by: true,
                    value: ['artist'],
                },
                {
                    name: 'Genres',
                    short_name: 'Genres',
                    is_group_by: true,
                    value: ['genre'],
                },
            ],
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
                    value: [''],
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
                    value: [''],
                },
                {
                    name: 'Instructors',
                    short_name: 'INSTRUCTORS',
                    is_group_by: true,
                    value: ['instructor'],
                },
                {
                    name: 'Genres',
                    short_name: 'Genres',
                    is_group_by: true,
                    value: ['genre'],
                },
            ],
        },
        'quick-tips': {
            thumbnailUrl: 'https://imagedelivery.net/0Hon__GSkIjm-B_W77SWCA/297dc5b4-e878-4238-d5b5-ed0588ee0b00/public',
            name: "Quick Tips",
            shortname: "quick-tips",
            icon: "icon-shows",
            description: "Only have 10 minutes? These short lessons are designed to inspire you with quick tips and exercises, even if you don’t have lots of time to practice.",
            allowableFilters: ['difficulty', 'genre', 'essentials', 'theory', 'lifestyle'],
            tabs: [
                {
                    name: 'Lessons',
                    short_name: 'LESSONS',
                    value: [''],
                },
                {
                    name: 'Instructors',
                    short_name: 'INSTRUCTORS',
                    is_group_by: true,
                    value: ['instructor'],
                },
                {
                    name: 'Genres',
                    short_name: 'Genres',
                    is_group_by: true,
                    value: ['genre'],
                },
            ],
        },
        'question-and-answer': {
            thumbnailUrl: 'https://d1923uyy6spedc.cloudfront.net/question-answer-singeo.png',
            name: "Q&A",
            icon: "fas fa-question-circle",
            description: "Each week we go live to answer your questions. Submit your questions in advance using the button below, in the Q&A thread in the forums, or live in the community chat.",
            allowableFilters: ['difficulty', 'genre', 'essentials', 'theory'],
        },
        'student-review': {
            thumbnailUrl: 'https://d1923uyy6spedc.cloudfront.net/student-reviews-singeo.png',
            name: "Student Reviews",
            icon: "icon-student-focus",
            description: "Want feedback on your playing? Submit a video for student review. We will watch your submission and then provide helpful encouragement and feedback. This is a great way to build accountability and benefit from the expertise of our teachers.",
            allowableFilters: ['difficulty', 'genre', 'essentials', 'theory', 'creativity', 'lifestyle'],
            tabs: [
                {
                    name: 'Lessons',
                    short_name: 'LESSONS',
                    value: [''],
                },
                {
                    name: 'Instructors',
                    short_name: 'INSTRUCTORS',
                    is_group_by: true,
                    value: ['instructor'],
                },
                {
                    name: 'Genres',
                    short_name: 'Genres',
                    is_group_by: true,
                    value: ['genre'],
                },
            ],
        },
        'workout': {
            allowableFilters: ['difficulty', 'genre', 'topic'],
            tabs: [
                {
                    name: 'All',
                    short_name: 'ALL',
                    value: [''],
                },
                {
                    name: '5 Minutes',
                    short_name: '5 MINS',
                    is_required_field: true,
                    value: ['length_in_seconds,450,integer,<,video'],
                },
                {
                    name: '10 Minutes',
                    short_name: '10 MINS',
                    is_required_field: true,
                    value: ['length_in_seconds,451,integer,>,video', 'length_in_seconds,751,integer,<,video'],
                },
                {
                    name: '15+ Minutes',
                    short_name: '15+ MINS',
                    is_required_field: true,
                    value: ['length_in_seconds,750,integer,>,video'],
                },
                {
                    name: 'Instructors',
                    short_name: 'INSTRUCTORS',
                    is_group_by: true,
                    value: ['instructor'],
                },
            ],
            modalText: 'Workouts are fun play-along lessons that help hone your musical skills. They cover various topics, and have multiple difficulty and duration options — so there’s always a perfect Workout for you. Just pick one, press start, and play along!',
        },
        'challenge-part': {
            name: 'Challenge Part',
            icon: 'icon-courses',
            description: "... ",
            allowableFilters: ['difficulty', 'genre', 'topic'],
            sortBy: '-published_on',
        },
        'challenge': {
            name: 'Challenges',
            icon: 'icon-courses',
            description: "... ",
            allowableFilters: ['difficulty', 'topic', 'genre'],
            sortBy: '-published_on',
            modalText: 'Challenges are a collection of Workout-style videos that build your skills one step at a time. They help you develop broader musical skills at a manageable pace — usually over a few days.',
        },
        'pack': {
            allowableFilters: [],
        },
    },
    'singeo':{
        'coaches': {
            name: 'Coaches',
            icon: 'icon-coach',
            description: "Your singing journey is unique. You need personalized coaching that helps you reach your goals. Learn from some of the best singers and vocal coaches in the world!",
            allowableFilters: ['genre', 'focus'],
            sortBy: '-published_on',
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
                    value: [''],
                },
                {
                    name: 'Instructors',
                    short_name: 'INSTRUCTORS',
                    is_group_by: true,
                    value: ['instructor'],
                },
                {
                    name: 'Genres',
                    short_name: 'Genres',
                    is_group_by: true,
                    value: ['genre'],
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
                    value: [''],
                },
                {
                    name: 'Artists',
                    short_name: 'ARTISTS',
                    is_group_by: true,
                    value: ['artist'],
                },
                {
                    name: 'Genres',
                    short_name: 'Genres',
                    is_group_by: true,
                    value: ['genre'],
                },
            ],
        },
        'quick-tips': {
            thumbnailUrl: 'https://imagedelivery.net/0Hon__GSkIjm-B_W77SWCA/8464033e-9b4e-458e-d613-e89fb47e2a00/public',
            name: "Quick Tips",
            icon: "icon-shows",
            description: "Only have 10 minutes? These short lessons are designed to inspire you with quick tips and exercises, even if you don’t have lots of time to practice.",
            allowableFilters: ['difficulty', 'genre', 'essentials', 'theory', 'creativity', 'lifestyle'],
            tabs: [
                {
                    name: 'Lessons',
                    short_name: 'LESSONS',
                    value: [''],
                },
                {
                    name: 'Instructors',
                    short_name: 'INSTRUCTORS',
                    is_group_by: true,
                    value: ['instructor'],
                },
                {
                    name: 'Genres',
                    short_name: 'Genres',
                    is_group_by: true,
                    value: ['genre'],
                },
            ],
        },
        'question-and-answer': {
            thumbnailUrl: 'https://d1923uyy6spedc.cloudfront.net/question-answer.png',
            name: "Q&A",
            icon: "fas fa-question-circle",
            description: "Each week we go live to answer your questions. Submit your questions in advance using the button below, in the Q&A thread in the forums, or live in the community chat.",
            allowableFilters: ['difficulty', 'genre', 'essentials', 'theory'],
            tabs: [
                {
                    name: 'Lessons',
                    short_name: 'LESSONS',
                    value: [''],
                },
                {
                    name: 'Instructors',
                    short_name: 'INSTRUCTORS',
                    is_group_by: true,
                    value: ['instructor'],
                },
                {
                    name: 'Genres',
                    short_name: 'Genres',
                    is_group_by: true,
                    value: ['genre'],
                },
            ],
        },
        'student-review': {
            thumbnailUrl: 'https://d1923uyy6spedc.cloudfront.net/student-reviews.png',
            name: "Student Reviews",
            icon: "icon-student-focus",
            description: "Want feedback on your singing? Submit a video for student review. We will watch your submission and then provide helpful encouragement and feedback. This is a great way to build accountability and benefit from the expertise of our teachers.",
            allowableFilters: ['difficulty', 'genre', 'essentials', 'theory', 'creativity', 'lifestyle'],
            tabs: [
                {
                    name: 'Lessons',
                    short_name: 'LESSONS',
                    value: [''],
                },
                {
                    name: 'Instructors',
                    short_name: 'INSTRUCTORS',
                    is_group_by: true,
                    value: ['instructor'],
                },
                {
                    name: 'Genres',
                    short_name: 'Genres',
                    is_group_by: true,
                    value: ['genre'],
                },
            ],
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
                    value: [''],
                },
            ],
        },
        'workout': {
            allowableFilters: ['difficulty', 'genre', 'topic'],
            tabs: [
                {
                    name: 'All',
                    short_name: 'ALL',
                    value: [''],
                },
                {
                    name: '5 Minutes',
                    short_name: '5 MINS',
                    is_required_field: true,
                    value: ['length_in_seconds,450,integer,<,video'],
                },
                {
                    name: '10 Minutes',
                    short_name: '10 MINS',
                    is_required_field: true,
                    value: ['length_in_seconds,451,integer,>,video', 'length_in_seconds,751,integer,<,video'],
                },
                {
                    name: 'Instructors',
                    short_name: 'INSTRUCTORS',
                    is_group_by: true,
                    value: ['instructor'],
                },
            ],
            modalText: 'Workouts are fun play-along lessons that help hone your musical skills. They cover various topics, and have multiple difficulty and duration options — so there’s always a perfect Workout for you. Just pick one, press start, and play along!',
        },
        'challenge-part': {
            name: 'Challenge Part',
            icon: 'icon-courses',
            description: "... ",
            allowableFilters: ['difficulty', 'genre', 'topic'],
            sortBy: '-published_on',
        },
        'challenge': {
            name: 'Challenges',
            icon: 'icon-courses',
            description: "... ",
            allowableFilters: ['difficulty', 'topic', 'genre'],
            sortBy: '-published_on',
            modalText: 'Challenges are a collection of Workout-style videos that build your skills one step at a time. They help you develop broader musical skills at a manageable pace — usually over a few days.',
        },
        'pack': {
            allowableFilters: [],
        },
    }

};




let contentTypeConfig = {
    'song': {
        'fields': [
            'album',
            'soundslice',
            'instrumentless',
        ],
        'relationships': {
            'artist': {
                isOneToOne: true
            }
        },
        'slug':'songs',
    },
    'song-tutorial': {
        'fields': [
            '"lesson_count": child_count',
        ],
        'slug':'song-tutorials',
    },
    'challenge':{
        'fields': [
            'enrollment_start_time',
            'enrollment_end_time',
            'registration_url',
            '"lesson_count": child_count',
            '"primary_cta_text": select(dateTime(published_on) > dateTime(now()) && dateTime(enrollment_start_time) > dateTime(now()) => "Notify Me", "Start Challenge")',
            'challenge_state',
            'challenge_state_text',
            `"description": ${descriptionField}`,
            'total_xp',
            'xp',
            '"instructors": instructor[]->name',
            '"header_image_url": thumbnail.asset->url',
            '"logo_image_url": logo_image_url.asset->url',
        ]
    },
    'course': {
        'fields': [
            '"lesson_count": child_count',
            '"instructors": instructor[]->name',
            `"description": ${descriptionField}`,
            'resource',
            'xp',
            'total_xp',
            `"lessons": child[]->{
                "id": railcontent_id,
                title,
                "image": thumbnail.asset->url,
                "instructors": instructor[]->name,
                length_in_seconds,
            }`,
        ],
        'slug':'courses',
    },
    'method': {
        'fields': [
            `"description": ${descriptionField}`,
            'hide_from_recsys',
            '"image": thumbnail.asset->url',
            '"instructors":instructor[]->name',
            '"lesson_count": child_count',
            'length_in_seconds',
            'permission',
            'popularity',
            'published_on',
            'railcontent_id',
            '"thumbnail_logo": logo_image_url.asset->url',
            'title',
            'total_xp',
            '"type": _type',
            '"url": web_url_path',
            'xp',
        ]
    },
    'workout': {
        'fields': [
            artistOrInstructorNameAsArray(),
        ],
        'slug':'workouts',
    },
    'play-along': {
        'fields': [
            '"style": genre[]->name',
            'mp3_no_drums_no_click_url',
            'mp3_yes_drums_yes_click_url',
            'mp3_no_drums_yes_click_url',
            'mp3_yes_drums_no_click_url',
            'bpm',
        ],
        'slug':'play-alongs',
    },
    'pack': {
        'fields': [
            '"lesson_count": child_count',
            'xp',
            `"description": ${descriptionField}`,
            '"instructors": instructor[]->name',
            '"logo_image_url": logo_image_url.asset->url',
            'total_xp'
        ],
    },
    'rudiment': {
        'fields': [
            'sheet_music_thumbnail_url',
        ],
        'slug':'rudiments',
    },
    'routine':{
        'fields': [
            `"description": ${descriptionField}`,
            'high_soundslice_slug',
            'low_soundslice_slug'
        ],
        'slug':'routines',
    },
    'pack-children': {
        'fields': [
            'child_count',
            `"children": child[]->{
                "description": ${descriptionField},
                ${getFieldsForContentType()}
            }`,
            '"resources": resource',
            '"image": logo_image_url.asset->url',
            '"thumbnail": thumbnail.asset->url',
            '"light_logo": light_mode_logo_url.asset->url',
            '"dark_logo": dark_mode_logo_url.asset->url',
            `"description": ${descriptionField}`,
            'total_xp',
        ]
    },
    'foundation': {
        'fields': [
            `"description": ${descriptionField}`,
            `"instructors":instructor[]->name`,
            `"units": child[]->{
                "id": railcontent_id,
                published_on,
                child_count,
                difficulty,
                difficulty_string,
                "thumbnail_url": thumbnail.asset->url,
                "instructor": instructor[]->{name},
                title,
                "type": _type,
                "description": ${descriptionField},
                "url": web_url_path,
                xp,
            }`
        ]
    },
    'instructor': {
        'fields': [
            '"coach_top_banner_image": coach_top_banner_image.asset->url',
            '"coach_bottom_banner_image": coach_bottom_banner_image.asset->url',
            '"coach_card_image": coach_card_image.asset->url',
            '"coach_featured_image": coach_featured_image.asset->url',
            '"coach_top_banner_image": coach_top_banner_image.asset->url',
            'focus',
            'focus_text',
            'forum_thread_id',
            'long_bio',
            'name',
            'short_bio',
            'bands',
            'endorsements',
        ]
    },
    // content with just the added 'instructors' Field
    'student-focus': contentWithInstructorsField,
    'quick-tips': contentWithInstructorsField,
    'drum-fest-international-2022': contentWithInstructorsField,
    'spotlight': contentWithInstructorsField,
    'the-history-of-electronic-drums': contentWithInstructorsField,
    'backstage-secret': contentWithInstructorsField,
    'question-and-answer': contentWithInstructorsField,
    'student-collaboration': contentWithInstructorsField,
    'live': { ...contentWithInstructorsField, 'slug': 'live-streams' },
    'solo': { ...contentWithInstructorsField, 'slug': 'solos' },
    'boot-camp': contentWithInstructorsField,
    'gear-guids': contentWithInstructorsField,
    'performance': contentWithInstructorsField,
    'challenges': contentWithInstructorsField,
    'on-the-road': contentWithInstructorsField,
    // content with just the added 'sort' field
    'podcast': contentWithSortField,
    'in-rhythm': contentWithSortField,
    'diy-drum-experiment': contentWithSortField,
    'rhythmic-adventures-of-captain-carson': contentWithSortField,
    'study-the-greats': contentWithSortField,
    'rhythms-from-another-planet': contentWithSortField,
    'paiste-cymbals': contentWithInstructorsField,
    'behind-the-scenes': contentWithSortField,
    'exploring-beats': contentWithSortField,
    'sonor': contentWithSortField,
}

function getNewReleasesTypes(brand) {
    const baseNewTypes = ["student-review", "student-review", "student-focus", "coach-stream", "live", "question-and-answer", "boot-camps", "quick-tips", "workout", "challenge", "challenge-part", "podcasts", "pack", "song", "learning-path-level", "play-along", "course", "unit"];
    switch(brand) {        
        case 'drumeo':
            return [...baseNewTypes, "drum-fest-international-2022", "spotlight", "the-history-of-electronic-drums", "backstage-secrets", "student-collaborations", "live-streams", "solos", "gear-guides", "performances", "in-rhythm", "challenges", "on-the-road", "diy-drum-experiments", "rhythmic-adventures-of-captain-carson", "study-the-greats", "rhythms-from-another-planet", "tama-drums", "paiste-cymbals", "behind-the-scenes", "exploring-beats", "sonor"];
        case 'guitareo': 
            return [...baseNewTypes, "archives", "recording", "chords-and-scales"];
        case 'pianote':    
        case 'singeo':
        default:
            return baseNewTypes
        }
}

function getUpcomingEventsTypes(brand) {
    const baseLiveTypes = ["student-review", "student-review", "student-focus", "coach-stream", "live", "question-and-answer", "boot-camps", "quick-tips", "recording", "pack-bundle-lesson"];
    switch(brand) {
        case 'drumeo': 
            return [...baseLiveTypes, "drum-fest-international-2022", "spotlight", "the-history-of-electronic-drums", "backstage-secrets", "student-collaborations", "live-streams", "podcasts", "solos", "gear-guides", "performances", "in-rhythm", "challenges", "on-the-road", "diy-drum-experiments", "rhythmic-adventures-of-captain-carson", "study-the-greats", "rhythms-from-another-planet", "tama-drums", "paiste-cymbals", "behind-the-scenes", "exploring-beats", "sonor"];
        case 'guitareo':
            return [...baseLiveTypes, "archives"];
        case 'pianote':
        case 'singeo':
        default:
            return baseLiveTypes;
  }
}

function artistOrInstructorName(key='artist_name') {
    return `'${key}': coalesce(artist->name, instructor[0]->name)`;
}

function artistOrInstructorNameAsArray(key='artists') {
    return `'${key}': select(artist->name != null => [artist->name], instructor[]->name)`;
}

function getFieldsForContentType(contentType, asQueryString=true) {
    const fields = contentType ? DEFAULT_FIELDS.concat(contentTypeConfig?.[contentType]?.fields ?? []) : DEFAULT_FIELDS;
    return asQueryString ? fields.toString() + ',' : fields;
}
/**
 * Takes the included fields array and returns a string that can be used in a groq query.
 * @param {Array<string>} filters - An array of strings that represent applied filters. This should be in the format of a key,value array. eg. ['difficulty,Intermediate',
 *     'genre,rock']
 * @returns {string} - A string that can be used in a groq query
 */
function filtersToGroq(filters) {
    const groq = filters.map(field => {
            let [key, value] = field.split(',');
            if(key && value && field.split(',').length === 2){
                switch (key) {
                    case 'difficulty':
                      return `&& difficulty_string == "${value}"`;
                    case 'genre':
                      return `&& genre[]->name match "${value}"`;
                    case 'topic':
                      return `&& topic[]->name match "${value}"`;
                    case 'instrumentless':
                      return `&& instrumentless == ${value}`;
                    case 'creativity':
                      return `&& creativity[]->name match "${value}"`;
                    case 'theory':
                      return `&& theory[]->name match "${value}"`;
                    case 'essentials':
                      return `&& essential[]->name match "${value}"`;
                    case 'lifestyle':
                      return `&& lifestyle[]->name match "${value}"`;
                    default:
                      return `&& ${key} == ${/^\d+$/.test(value) ? value : `"$${value}"`}`;
                  }
            }
            
            return `&& ${field}`;
        }).join(' ');
    return groq;
}

module.exports = {
    contentTypeConfig,
    descriptionField,
    artistOrInstructorName,
    artistOrInstructorNameAsArray,
    getFieldsForContentType,
    DEFAULT_FIELDS,
    assignmentsField,
    filtersToGroq,
    getNewReleasesTypes,
    getUpcomingEventsTypes,
    showsTypes,
    contentMetadata
}
