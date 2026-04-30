# End Screen Service

Determines what content to show after a user finishes a lesson.

## Functions

| Function | Type | Use case |
|---|---|---|
| `getEndScreen(params)` | async | All content types — lessons, courses, playlists, learning paths |
| `getLearningPathEndScreen(params)` | sync | Learning paths only, when reactive updates are needed (FE) |

---

## Decision Logic

### `getEndScreen`

```
learning path provided         →  delegates to getLearningPathEndScreen
single-song / play-along / jam →  countdown-up-next  +  RecSys recommendation
playlist (not last item)       →  countdown-up-next  +  next item
playlist (last item)           →  course-complete    +  RecSys recommendation
no course                      →  countdown-up-next  +  RecSys recommendation
course (not last lesson)       →  countdown-up-next  +  next lesson
course (last, has next course) →  course-complete    +  first lesson of next course
course (last, no next course)  →  course-complete    +  RecSys recommendation
```

RecSys fallback: if the recommender returns nothing, a default lesson is used (Need to decide with Chris about default lessons).

### `getLearningPathEndScreen`

```
all lessons completed  +  not previously completed  →  path-complete
active LP  +  dailies not done                      →  what-to-do-today   (next daily)
active LP  +  all dailies done                      →  countdown-up-next  (next in path)
non-active LP                                       →  countdown-up-next  (next in array or first)
```

---

## Variants

| Variant | `countdownAutoplay` | When |
|---|---|---|
| `countdown-up-next` | `true` | Next lesson available — autoplays |
| `course-complete` | `false` | Course or playlist finished |
| `path-complete` | `false` | All lessons in learning path completed |
| `what-to-do-today` | `true` | Active LP, daily session not yet complete — shows next daily |

---

## API Reference

### `getEndScreen(params): Promise<EndScreenResult>`

```typescript
// Parameters
{
  lesson:      { id: number, type?: string }          // required
  brand:       string                                  // required
  course?:     { id: number, children?: ContentItem[] }
  collection?: { id: number, type: string, children?: { id: number, children?: ContentItem[] }[] }
  playlist?:   { id: number, items?: ContentItem[] }
  learningPath?: {
    children?:                          { id: number, progressStatus?: string }[]
    is_active_learning_path:            boolean
    learning_path_dailies?:             { id: number, progressStatus?: string }[]
    previous_learning_path_dailies?:    { id: number, progressStatus?: string }[]
    next_learning_path_dailies?:        { id: number, progressStatus?: string }[]
  }
  lessonWasPreviouslyCompleted?: boolean  // used with learningPath, default false
}

// Return value
{
  variant:           'countdown-up-next' | 'course-complete' | 'path-complete' | 'what-to-do-today'
  upNext:            object | null  // null only for path-complete
  countdownAutoplay: boolean
  ctaLabels:         { primary: string, secondary: string }
}
```

### `getLearningPathEndScreen(params): EndScreenResult`

Same return type. Parameters are a subset of `getEndScreen`:

```typescript
{
  lesson:                      { id: number }
  learningPath:                {
    children?,
    is_active_learning_path,
    learning_path_dailies?,
    previous_learning_path_dailies?,
    next_learning_path_dailies?
  }
  lessonWasPreviouslyCompleted?: boolean
}
```

---

## Implementation

### When to call

Call `getEndScreen` **at page load**, not when the video ends. RecSys calls happen in the background while the user watches — by the time the video ends, the result is ready.

### Recommendation for Mobile App (MA)

Use `getEndScreen` for all content types including learning paths:

```typescript
// On page load, after lesson data is available:
const endScreen = await getEndScreen({
  lesson:      { id: lesson.id, type: lesson.type },
  brand:       currentBrand,
  course:      course ?? null,
  collection:  collection ?? null,
})

// When video ends, use the stored result:
showEndScreen(endScreen)
```

For learning paths, re-call `getLearningPathEndScreen` after any progress update (e.g. lesson completed from sidebar):

```typescript
const endScreen = getLearningPathEndScreen({
  lesson:                      { id: lesson.id },
  learningPath:                learningPathData,  // must have up-to-date progressStatus values
  lessonWasPreviouslyCompleted: wasAlreadyCompleted,
})
```

### Recommendation for Web Platform (FE)

For lessons, courses and playlists use `getEndScreen` in a `watch`:

```typescript
watch(lesson, async (newLesson) => {
  if (!newLesson) return
  endScreenData.value = await getEndScreen({
    lesson: { id: newLesson.id, type: newLesson.type },
    brand:  currentBrand.value,
    course: course.value ?? null,
  })
})
```

For learning paths use `getLearningPathEndScreen` in a `computed` — this automatically re-evaluates when lesson progress changes:

```typescript
const endScreenVariant = computed(() => {
  if (!learningPathData.value || !lesson.value) return null
  return getLearningPathEndScreen({
    lesson:                      lesson.value,
    learningPath:                learningPathData.value,
    lessonWasPreviouslyCompleted: originalCompletionStatus.value,
  }).variant
})
```

---

## Notes

- `upNext` is `null` only for `path-complete` and `method-session-complete` — no next lesson to show
- For all other variants, `upNext` is always populated:
  - Learning paths fall back to the first incomplete lesson if the current lesson is last in the path
  - RecSys paths fall back to a default lesson if no recommendations are available
- `brand` is always required, even when `learningPath` is provided
