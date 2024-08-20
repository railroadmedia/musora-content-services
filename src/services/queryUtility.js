
export function artistOrInstructor(key='artist_name') {
    return `${key}: select(artist->name != null => artist->name, instructor[0]->name)`;
}

export function artistOrInstructorAsArray(key='artists') {
    return `${key}: select(artist->name != null => [artist->name], instructor[]->name)`;
}

export function defaultContentTypeFields(asString = false) {
    let fields = [
        "'sanity_id' : _id",
        "railcontent_id",
        "title",
        "'image': thumbnail.asset->url",
        "'thumbnail': thumbnail.asset->url",
        artistOrInstructor(),
        "difficulty",
        "difficulty_string",
        "web_url_path",
        "published_on",
        "'type': _type",
        "progress_percent",
        "'length_in_seconds' : soundslice[0].soundslice_length_in_second",
        "brand",
        "'slug' : slug.current",
        ];
    return asString ? fields.toString() : fields;
}