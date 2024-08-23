
function artistOrInstructorName(key='artist_name') {
    return `'${key}': select(artist->name != null => artist->name, instructor[0]->name)`;
}

function artistOrInstructorNameAsArray(key='artists') {
    return `'${key}': select(artist->name != null => [artist->name], instructor[]->name)`;
}

let defaultContentTypeFields = [
    "'sanity_id' : _id",
    "'id': railcontent_id",
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
    "'length_in_seconds' : soundslice[0].soundslice_length_in_second",
    "brand",
    "genre",
    "'slug' : slug.current",
];
function defaultContentTypeFieldsAsString() {
    return defaultContentTypeFields.toString()
}

module.exports = {
    artistOrInstructor: artistOrInstructorName,
    artistOrInstructorAsArray: artistOrInstructorNameAsArray,
    defaultContentTypeFields,
    defaultContentTypeFieldsAsString,
}