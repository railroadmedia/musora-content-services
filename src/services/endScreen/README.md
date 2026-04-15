# End Screen Service

Determines what content to show after a user finishes a lesson.

## Functions

| Function | Type | Use case |
|---|---|---|
| `getEndScreen(params)` | async | All content types — lessons, courses, playlists |

---

## Decision Logic

### `getEndScreen`

```
single-song / play-along / jam →  countdown-up-next  +  RecSys recommendation
playlist (not last item)       →  countdown-up-next  +  next item
playlist (last item)           →  course-complete    +  RecSys recommendation
no course                      →  countdown-up-next  +  RecSys recommendation
course (not last lesson)       →  countdown-up-next  +  next lesson
course (last, has next course) →  course-complete    +  first lesson of next course
course (last, no next course)  →  course-complete    +  RecSys recommendation
```

RecSys fallback: if the recommender returns nothing, a default lesson is used (Need to decide with Chris about default lessons).


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
}

// Return value
{
  variant:           'countdown-up-next' | 'course-complete'
  upNext:            object 
  countdownAutoplay: boolean
  ctaLabels:         { primary: string, secondary: string }
}
```

---

## Implementation

### When to call

Call `getEndScreen` **at page load**, not when the video ends. RecSys calls happen in the background while the user watches — by the time the video ends, the result is ready.

### Recommendation for Mobile App (MA)

Use `getEndScreen` for content types (without learning paths):

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

