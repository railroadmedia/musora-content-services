let contentTypeConfig = {
    'song': {
        'fields': [
            '"artist_name": artist->name',
            'soundslice',
            'instrumentless'
        ],
        'relationships': {
            'artist': {
                isOneToOne: true
            }
        }
    }
}


module.exports = {
    contentTypeConfig
}