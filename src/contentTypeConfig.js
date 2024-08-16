let contentTypeConfig = {
    'song': {
        'fields': [
            '"artist_name": artist->name',
            'soundslice',
            'instrumentless',
        ],
        'relationships': {
            'artist': {
                isOneToOne: true
            }
        }
    },
    'challenge':{
        'fields':[
            'enrollment_start_time',
            'enrollment_end_time',
            'registration_url',
            '"lesson_count": child_count',
            '"primary_cta_text": select(dateTime(published_on) > dateTime(now()) && dateTime(enrollment_start_time) > dateTime(now()) => "Notify Me", "Start Challenge")',
            'challenge_state',
            'challenge_state_text',
        ]
    },
    'course': {
        'fields': [
            '"lesson_count": child_count',
            '"instructors": instructor[]->name'
        ]
    },
}


module.exports = {
    contentTypeConfig
}