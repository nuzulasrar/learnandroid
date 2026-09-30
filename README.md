# Learn Android

A self-paced course website that teaches native Android development with Kotlin and Jetpack Compose, from the very basics to building and publishing a complete app.

- **37 lessons in 8 parts** (~20 hours): Getting Started → Kotlin → Compose UI → Architecture → Data & Networking → Platform → Quality & Shipping → Capstone
- **Capstone project:** *RecipeBox*, an offline-first recipe app with Retrofit, Room, DataStore, Hilt, Navigation, Coil and tests
- Practice tasks with hidden solutions, a quiz at the end of every lesson, and **▶ Try it** buttons that run Kotlin examples in the browser
- Progress tracking, search, dark mode, keyboard navigation (← →), mobile friendly

## Open it

Just open `index.html` in your browser. No server or install needed.

(Progress is saved in your browser's local storage. The **Try it** buttons and web fonts need an internet connection; everything else works offline.)

## Project structure

```
learnandroid/
├── index.html            the single-page app shell
├── css/style.css         all styles (light + dark theme)
├── js/
│   ├── app.js            routing, sidebar, progress, quizzes, playground
│   ├── markdown.js       renders lesson markdown (callouts, quizzes, code blocks)
│   ├── highlight.js      tiny syntax highlighter (Kotlin, XML, TOML, bash, JSON)
│   └── course-data.js    GENERATED from lessons/ by build.js
├── lessons/
│   ├── course.json       the list of parts
│   └── NN-name.md        one file per lesson
└── build.js              bundles lessons/*.md → js/course-data.js
```

## Editing or adding lessons

1. Edit or create a file in `lessons/`, e.g. `38-my-topic.md`. Files are ordered by their number prefix.
2. Start it with frontmatter:

   ```
   ---
   id: my-topic
   title: My Topic
   part: 8
   minutes: 20
   summary: One sentence shown under the title.
   ---
   ```

3. Rebuild the data file (requires Node.js):

   ```bash
   node build.js           # once
   node build.js --watch   # rebuild automatically while you edit
   ```

### Lesson markdown extras

Standard markdown (headings, lists, tables, links, `code`, **bold**, *italic*) plus:

````
```kotlin title="MainActivity.kt"      code block with a file name
```kotlin runnable                     adds a "Try it" button (needs fun main())

:::tip Optional title                  callouts: goals, tip, note, warning,
Content with **markdown**.             danger, analogy, exercise, recap
:::

:::solution Show solution              collapsible solution
...
:::

```quiz
Q: Question text?
- [ ] wrong answer
- [x] right answer
> Explanation shown after answering.
```

[[Ctrl]] + [[C]]                       keyboard keys
- [ ] checklist item                   interactive checklist
````

Lines that start with an HTML tag are passed through as-is (used for the diagrams).
