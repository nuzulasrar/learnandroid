---
id: compose-lists
title: Lists & Grids
part: 3
minutes: 30
summary: Nearly every app shows a scrolling list. Learn LazyColumn, LazyRow and lazy grids, why keys matter, and how to build list items that respond to clicks.
---

:::goals
- Why lazy lists exist and when to use them
- `LazyColumn`, `LazyRow`, `LazyVerticalGrid`
- `items`, `itemsIndexed`, headers and spacing
- Stable **keys** and why they matter
- Clickable list items and updating list state
- Scroll state: jumping to the top and detecting scroll position
:::

## Why "lazy"?

`Column` + `verticalScroll` composes **every** child up front. With 1,000 items that's slow and uses lots of memory. A **lazy** list only composes the items that are **visible** on screen (plus a few extra), and reuses the space as you scroll. It's Compose's equivalent of the old `RecyclerView`, with far less code.

:::tip Rule of thumb
A handful of fixed items (like a settings screen) is fine in a scrollable `Column`. Anything that comes from data, or could grow, belongs in a lazy list.
:::

## `LazyColumn`

```kotlin
@Composable
fun FruitList(fruits: List<String>, modifier: Modifier = Modifier) {
    LazyColumn(modifier = modifier) {
        items(fruits) { fruit ->          // one composable per item
            Text(
                text = fruit,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
            )
            HorizontalDivider()
        }
    }
}
```

The `LazyColumn { }` block isn't normal composable content. It's a small DSL where you describe *items*:

```kotlin
LazyColumn(
    contentPadding = PaddingValues(16.dp),              // padding around the whole list
    verticalArrangement = Arrangement.spacedBy(12.dp)  // gap between items
) {
    item { Text("Header", style = MaterialTheme.typography.titleLarge) }   // single item

    items(recipes, key = { it.id }) { recipe ->         // many items
        RecipeRow(recipe)
    }

    itemsIndexed(tips) { index, tip ->                  // with index
        Text("${index + 1}. $tip")
    }

    item { Text("That's all! 🎉") }                     // footer
}
```

:::warning Use `contentPadding`, not `Modifier.padding`
`Modifier.padding` on a `LazyColumn` clips items at the padded edge while scrolling. `contentPadding` adds space around the content *inside* the scroll area, so items scroll smoothly under the edges.
:::

## Keys: why they matter

By default items are identified by their **position**. If you insert or delete an item at the top, Compose thinks every item changed. That's slower, animations break, and any `remember`ed state inside an item jumps to the wrong row.

Giving each item a **stable, unique key** fixes this:

```kotlin
items(items = recipes, key = { recipe -> recipe.id }) { recipe ->
    RecipeRow(recipe)
}
```

Keys also enable **item animations**. Add `Modifier.animateItem()` to the item's root and rows slide nicely when the list changes:

```kotlin
items(tasks, key = { it.id }) { task ->
    TaskRow(task, modifier = Modifier.animateItem())
}
```

## A complete example: a task list

Here's a small but complete interactive list. Paste it in and run it:

```kotlin title="TaskListScreen.kt"
data class Task(val id: Int, val title: String, val done: Boolean = false)

@Composable
fun TaskListScreen(modifier: Modifier = Modifier) {
    var tasks by remember {
        mutableStateOf(List(20) { i -> Task(id = i, title = "Task #${i + 1}") })
    }

    TaskList(
        tasks = tasks,
        onToggle = { task ->
            tasks = tasks.map { if (it.id == task.id) it.copy(done = !it.done) else it }
        },
        onDelete = { task -> tasks = tasks - task },
        modifier = modifier
    )
}

@Composable
fun TaskList(
    tasks: List<Task>,
    onToggle: (Task) -> Unit,
    onDelete: (Task) -> Unit,
    modifier: Modifier = Modifier
) {
    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        item {
            val remaining = tasks.count { !it.done }
            Text("$remaining tasks left", style = MaterialTheme.typography.titleMedium)
        }
        items(tasks, key = { it.id }) { task ->
            TaskRow(
                task = task,
                onToggle = { onToggle(task) },
                onDelete = { onDelete(task) },
                modifier = Modifier.animateItem()
            )
        }
    }
}

@Composable
fun TaskRow(
    task: Task,
    onToggle: () -> Unit,
    onDelete: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(onClick = onToggle, modifier = modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Checkbox(checked = task.done, onCheckedChange = { onToggle() })
            Text(
                text = task.title,
                modifier = Modifier.weight(1f),
                textDecoration = if (task.done) TextDecoration.LineThrough else null
            )
            IconButton(onClick = onDelete) {
                Icon(Icons.Default.Delete, contentDescription = "Delete ${task.title}")
            }
        }
    }
}
```

:::note Why `remember` and not `rememberSaveable` here?
`rememberSaveable` can only save types Android knows how to put in a `Bundle`. A `List<Task>` of your own data class isn't one of them, and trying it crashes with *"cannot be saved using the current SaveableStateRegistry"*. You could make `Task` `@Parcelize … : Parcelable` (with the `kotlin-parcelize` plugin), but in Part 4 this state moves into a **ViewModel**, which survives rotation anyway. So `remember` is fine for now.
:::

Notice the architecture: `TaskList` and `TaskRow` are **stateless**, and all state lives in `TaskListScreen`. The same UDF pattern from the previous lesson, now with a list.

## `LazyRow` and grids

```kotlin
// Horizontal carousel
LazyRow(
    contentPadding = PaddingValues(horizontal = 16.dp),
    horizontalArrangement = Arrangement.spacedBy(12.dp)
) {
    items(categories, key = { it }) { category ->
        AssistChip(onClick = { }, label = { Text(category) })
    }
}

// Grid with a fixed number of columns
LazyVerticalGrid(
    columns = GridCells.Fixed(2),
    contentPadding = PaddingValues(16.dp),
    horizontalArrangement = Arrangement.spacedBy(12.dp),
    verticalArrangement = Arrangement.spacedBy(12.dp)
) {
    items(photos, key = { it.id }) { photo -> PhotoCard(photo) }
}

// Adaptive grid: as many columns as fit, each at least 160.dp wide
LazyVerticalGrid(columns = GridCells.Adaptive(minSize = 160.dp)) { /* ... */ }
```

`GridCells.Adaptive` is great for supporting phones, tablets and foldables with one layout. There's also `LazyVerticalStaggeredGrid` for Pinterest-style layouts.

## Scroll state

Pass a `LazyListState` to control or observe scrolling:

```kotlin
@Composable
fun LongList(items: List<String>) {
    val listState = rememberLazyListState()
    val scope = rememberCoroutineScope()

    // derivedStateOf: only recompose when the *result* changes, not on every pixel scrolled
    val showScrollToTop by remember {
        derivedStateOf { listState.firstVisibleItemIndex > 5 }
    }

    Box {
        LazyColumn(state = listState) {
            items(items) { Text(it, Modifier.padding(16.dp)) }
        }
        if (showScrollToTop) {
            SmallFloatingActionButton(
                onClick = { scope.launch { listState.animateScrollToItem(0) } },
                modifier = Modifier.align(Alignment.BottomEnd).padding(16.dp)
            ) {
                Icon(Icons.Default.KeyboardArrowUp, contentDescription = "Scroll to top")
            }
        }
    }
}
```

## Recap

:::recap
- Use `LazyColumn`/`LazyRow`/`LazyVerticalGrid` for data-driven or long lists. They only compose visible items.
- Describe content with `item { }`, `items(list) { }` and `itemsIndexed`.
- Always provide a stable `key` for lists that can change.
- Use `contentPadding` and `Arrangement.spacedBy` for spacing.
- `rememberLazyListState()` lets you observe and control scrolling.
:::

## Practice

:::exercise
1. Extend the task list with an `OutlinedTextField` + **Add** button at the top that appends a new task with a unique id.
2. Add `FilterChip`s for **All / Active / Done** that filter which tasks are shown. (Hint: keep the filter in state and derive the visible list.)
3. Show an empty-state message ("Nothing to do 🎉") when the visible list is empty.
:::

:::solution Show solution
```kotlin
enum class Filter { ALL, ACTIVE, DONE }

@Composable
fun TaskListScreen(modifier: Modifier = Modifier) {
    var tasks by remember { mutableStateOf(listOf<Task>()) }
    var newTitle by rememberSaveable { mutableStateOf("") }
    var filter by rememberSaveable { mutableStateOf(Filter.ALL) }
    var nextId by rememberSaveable { mutableIntStateOf(0) }

    val visible = when (filter) {                   // derived, not stored
        Filter.ALL -> tasks
        Filter.ACTIVE -> tasks.filter { !it.done }
        Filter.DONE -> tasks.filter { it.done }
    }

    Column(modifier.padding(16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            OutlinedTextField(
                value = newTitle,
                onValueChange = { newTitle = it },
                label = { Text("New task") },
                singleLine = true,
                modifier = Modifier.weight(1f)
            )
            Spacer(Modifier.width(8.dp))
            Button(
                onClick = {
                    tasks = tasks + Task(id = nextId++, title = newTitle.trim())
                    newTitle = ""
                },
                enabled = newTitle.isNotBlank()
            ) { Text("Add") }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Filter.entries.forEach { f ->
                FilterChip(
                    selected = filter == f,
                    onClick = { filter = f },
                    label = { Text(f.name.lowercase().replaceFirstChar { it.uppercase() }) }
                )
            }
        }
        if (visible.isEmpty()) {
            Text("Nothing to do 🎉", Modifier.padding(top = 32.dp))
        } else {
            TaskList(
                tasks = visible,
                onToggle = { t -> tasks = tasks.map { if (it.id == t.id) it.copy(done = !it.done) else it } },
                onDelete = { t -> tasks = tasks - t }
            )
        }
    }
}
```
:::

## Check your understanding

```quiz
Q: Why use LazyColumn instead of Column for 1,000 items?
- [ ] LazyColumn has nicer default styling
- [x] LazyColumn only composes the items currently visible, saving time and memory
- [ ] Column can't scroll
- [ ] Column supports at most 100 children
> Lazy layouts compose on demand as items scroll into view.

Q: What's the purpose of `key = { it.id }` in `items()`?
- [ ] To sort the list
- [ ] To encrypt the data
- [x] To give each item a stable identity so Compose can track it when the list changes
- [ ] It's required, or the list won't compile
> Stable keys keep item state attached to the right item and enable animations.

Q: Which grid adapts its number of columns to the screen width?
- [ ] `GridCells.Fixed(2)`
- [x] `GridCells.Adaptive(minSize = 160.dp)`
- [ ] `LazyRow`
- [ ] `GridCells.Auto`
> Adaptive fits as many columns as possible, each at least minSize wide.

Q: Why wrap `listState.firstVisibleItemIndex > 5` in `derivedStateOf`?
- [ ] It's required to read scroll state
- [x] So the composable only recomposes when the Boolean result changes, not every time the scroll position changes
- [ ] To make scrolling faster
- [ ] To save it across rotation
> derivedStateOf avoids unnecessary recompositions when a frequently changing input maps to a rarely changing result.
```
