
export async function artistOrInstructor(key='artist_name') {
    return `${key}: select(artist->name != null => artist->name, instructor[0]->name)`;
}

export async function artistOrInstructorAsArray(key='artists') {
    return `${key}: select(artist->name != null => [artist->name], instructor[]->name)`;
}