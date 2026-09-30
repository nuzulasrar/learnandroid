---
id: room
title: Local Database with Room
part: 5
minutes: 40
summary: Store structured data on the device with Room, Android's SQLite library. Define entities and DAOs, observe data with Flow, and handle schema migrations.
---

:::goals
- When to use a local database
- Room's three parts: **Entity**, **DAO**, **Database**
- Writing queries, inserts, updates and deletes
- Observing data reactively with `Flow`
- Relations and type converters (overview)
- Schema versions and **migrations**
:::

## Why a local database?

Use a database when you need to store **structured data** that should survive app restarts: notes, tasks, favourites, cached API responses for offline use. Android includes **SQLite**, a small, fast SQL database engine. **Room** is a Jetpack library on top of it that:

- checks your SQL queries **at compile time** (typos become build errors, not crashes),
- maps rows to Kotlin objects automatically,
- supports `suspend` functions and `Flow`, so the UI updates automatically when data changes.

## Setup

Room uses KSP to generate code (set up KSP as in Lesson 22).

```toml title="gradle/libs.versions.toml"
[versions]
room = "2.8.5"

[libraries]
androidx-room-runtime = { group = "androidx.room", name = "room-runtime", version.ref = "room" }
androidx-room-ktx = { group = "androidx.room", name = "room-ktx", version.ref = "room" }
androidx-room-compiler = { group = "androidx.room", name = "room-compiler", version.ref = "room" }
```

```kts title="app/build.gradle.kts"
plugins {
    alias(libs.plugins.ksp)
}

dependencies {
    implementation(libs.androidx.room.runtime)
    implementation(libs.androidx.room.ktx)
    ksp(libs.androidx.room.compiler)
}
```

We'll build the data layer for a **notes app**.

## 1. Entity: a table

```kotlin title="data/local/NoteEntity.kt"
@Entity(tableName = "notes")
data class NoteEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,   // 0 = "let Room assign an id"
    val title: String,
    val content: String,
    @ColumnInfo(name = "is_pinned") val isPinned: Boolean = false,
    @ColumnInfo(name = "created_at") val createdAt: Long = System.currentTimeMillis()
)
```

Each property becomes a column. Every entity needs a `@PrimaryKey`.

## 2. DAO: how you access the table

A **DAO** (Data Access Object) is an interface of functions. Room generates the implementation:

```kotlin title="data/local/NoteDao.kt"
@Dao
interface NoteDao {

    // Observable query: emits a new list whenever the table changes
    @Query("SELECT * FROM notes ORDER BY is_pinned DESC, created_at DESC")
    fun observeAll(): Flow<List<NoteEntity>>

    @Query("SELECT * FROM notes WHERE id = :id")
    fun observeById(id: Long): Flow<NoteEntity?>

    @Query("SELECT * FROM notes WHERE title LIKE '%' || :query || '%' OR content LIKE '%' || :query || '%'")
    fun search(query: String): Flow<List<NoteEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(note: NoteEntity): Long          // returns the new row id

    @Update
    suspend fun update(note: NoteEntity)

    @Upsert                                              // insert or update
    suspend fun upsert(note: NoteEntity)

    @Delete
    suspend fun delete(note: NoteEntity)

    @Query("DELETE FROM notes WHERE id = :id")
    suspend fun deleteById(id: Long)

    @Query("SELECT COUNT(*) FROM notes")
    suspend fun count(): Int
}
```

- Functions returning **`Flow`** are *observable*: Room re-runs the query and emits a fresh result every time the table changes. Don't mark them `suspend`.
- One-shot operations are **`suspend`**: Room runs them on a background thread for you.
- `:id` in a query refers to the function parameter `id`.

:::note A little SQL goes a long way
You'll mostly write `SELECT … FROM … WHERE … ORDER BY …`. The [SQLite tutorial](https://www.sqlitetutorial.net/) is a good reference. Android Studio highlights and autocompletes SQL inside `@Query`, and flags errors while you type.
:::

## 3. Database: ties it together

```kotlin title="data/local/AppDatabase.kt"
@Database(
    entities = [NoteEntity::class],
    version = 1,
    exportSchema = true
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun noteDao(): NoteDao
}
```

Create it **once** for the whole app (it's expensive). With Hilt:

```kotlin title="di/DatabaseModule.kt"
@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {
    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): AppDatabase =
        Room.databaseBuilder(context, AppDatabase::class.java, "notes.db").build()

    @Provides
    fun provideNoteDao(db: AppDatabase): NoteDao = db.noteDao()
}
```

:::tip Schema export
With `exportSchema = true`, Room writes a JSON description of each database version. Tell it where: add `ksp { arg("room.schemaLocation", "$projectDir/schemas") }` to `app/build.gradle.kts`, and commit the `schemas/` folder. You'll need it for migrations and migration tests.
:::

## 4. Repository and ViewModel

```kotlin title="data/NoteRepository.kt"
data class Note(val id: Long, val title: String, val content: String, val isPinned: Boolean)

fun NoteEntity.toNote() = Note(id, title, content, isPinned)

class NoteRepository @Inject constructor(private val dao: NoteDao) {
    fun observeNotes(): Flow<List<Note>> = dao.observeAll().map { list -> list.map { it.toNote() } }

    suspend fun addNote(title: String, content: String) {
        dao.insert(NoteEntity(title = title, content = content))
    }

    suspend fun togglePin(note: Note) {
        dao.update(NoteEntity(note.id, note.title, note.content, isPinned = !note.isPinned))
    }

    suspend fun delete(id: Long) = dao.deleteById(id)
}
```

```kotlin title="ui/notes/NotesViewModel.kt"
data class NotesUiState(val notes: List<Note> = emptyList(), val isLoading: Boolean = true)

@HiltViewModel
class NotesViewModel @Inject constructor(
    private val repository: NoteRepository
) : ViewModel() {

    val uiState: StateFlow<NotesUiState> = repository.observeNotes()
        .map { NotesUiState(notes = it, isLoading = false) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), NotesUiState())

    fun addNote(title: String, content: String) {
        viewModelScope.launch { repository.addNote(title, content) }
    }

    fun togglePin(note: Note) {
        viewModelScope.launch { repository.togglePin(note) }
    }

    fun delete(note: Note) {
        viewModelScope.launch { repository.delete(note.id) }
    }
}
```

Look closely: after `addNote`, **nothing** updates `uiState` manually. The insert changes the table → Room's `Flow` emits the new list → `uiState` updates → Compose recomposes. That's the reactive loop, and it's delightful. ✨

<div class="diagram"><div class="flow">
<div>UI event<small>addNote()</small></div><div class="arrow">→</div>
<div>DAO insert</div><div class="arrow">→</div>
<div class="hl">Table changes</div><div class="arrow">→</div>
<div>Flow emits new list</div><div class="arrow">→</div>
<div class="hl">UI recomposes</div>
</div></div>

## Type converters

Room stores only simple types (numbers, strings, booleans, byte arrays). For others, like `List<String>` or `Instant`, write a **TypeConverter**:

```kotlin
class Converters {
    @TypeConverter
    fun fromList(value: List<String>): String = Json.encodeToString(value)

    @TypeConverter
    fun toList(value: String): List<String> = Json.decodeFromString(value)
}

@Database(entities = [NoteEntity::class], version = 1)
@TypeConverters(Converters::class)
abstract class AppDatabase : RoomDatabase() { /* … */ }
```

## Relations (overview)

For one-to-many data (a notebook has many notes), store the parent id in the child and use `@Relation`:

```kotlin
@Entity data class NotebookEntity(@PrimaryKey val id: Long, val name: String)

@Entity(foreignKeys = [ForeignKey(NotebookEntity::class, ["id"], ["notebookId"], onDelete = ForeignKey.CASCADE)],
        indices = [Index("notebookId")])
data class PageEntity(@PrimaryKey val id: Long, val notebookId: Long, val text: String)

data class NotebookWithPages(
    @Embedded val notebook: NotebookEntity,
    @Relation(parentColumn = "id", entityColumn = "notebookId") val pages: List<PageEntity>
)

@Dao interface NotebookDao {
    @Transaction
    @Query("SELECT * FROM NotebookEntity")
    fun observeNotebooksWithPages(): Flow<List<NotebookWithPages>>
}
```

## Migrations

When you change an entity (add a column, rename a table), you must bump the database `version`. Existing users already have the old schema on their phones, so you must tell Room how to **migrate** their data:

```kotlin
val MIGRATION_1_2 = object : Migration(1, 2) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL("ALTER TABLE notes ADD COLUMN color INTEGER NOT NULL DEFAULT 0")
    }
}

Room.databaseBuilder(context, AppDatabase::class.java, "notes.db")
    .addMigrations(MIGRATION_1_2)
    .build()
```

For simple changes (adding a column or table), Room can write the migration for you: `@Database(version = 2, autoMigrations = [AutoMigration(from = 1, to = 2)])`, which requires exported schemas.

:::danger `fallbackToDestructiveMigration()`
This deletes and recreates the database when no migration exists, **wiping all user data**. It's OK during early development before release (or for pure caches), never for user-created data in a published app.
:::

## Inspecting the database

Run the app, then open **App Inspection → Database Inspector** in Android Studio. You can browse tables, run SQL queries and even see live updates as your app writes data. Great for debugging.

## Recap

:::recap
- **Entity** = table, **DAO** = queries, **Database** = holder. Create the database once (singleton).
- Observable queries return `Flow`; one-shot operations are `suspend`.
- Writes update observers automatically, so you never manually refresh the UI.
- Bump `version` and add a **migration** whenever the schema changes.
- Use the Database Inspector to debug.
:::

## Practice

:::exercise
Build the **Notes app** UI on top of the code above:

1. A `NotesScreen` with a `LazyColumn` of notes (pinned ones show a 📌), a FAB that opens an `AlertDialog` with title/content fields to add a note.
2. Tapping the pin icon toggles pinning (watch the list re-sort by itself).
3. Swipe-to-delete or a delete `IconButton` on each note.
4. Close and reopen the app: your notes are still there. Check them in the Database Inspector.
:::

:::solution Show solution (screen)
```kotlin
@Composable
fun NotesRoute(viewModel: NotesViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    NotesScreen(uiState, viewModel::addNote, viewModel::togglePin, viewModel::delete)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotesScreen(
    uiState: NotesUiState,
    onAdd: (String, String) -> Unit,
    onTogglePin: (Note) -> Unit,
    onDelete: (Note) -> Unit
) {
    var showDialog by rememberSaveable { mutableStateOf(false) }

    Scaffold(
        topBar = { TopAppBar(title = { Text("Notes") }) },
        floatingActionButton = {
            FloatingActionButton(onClick = { showDialog = true }) {
                Icon(Icons.Default.Add, contentDescription = "Add note")
            }
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier.padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(uiState.notes, key = { it.id }) { note ->
                Card(Modifier.fillMaxWidth().animateItem()) {
                    Row(Modifier.padding(start = 16.dp), verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f).padding(vertical = 12.dp)) {
                            Text(note.title, style = MaterialTheme.typography.titleMedium)
                            Text(note.content, maxLines = 2, overflow = TextOverflow.Ellipsis)
                        }
                        IconButton(onClick = { onTogglePin(note) }) {
                            Text(if (note.isPinned) "📌" else "📍")
                        }
                        IconButton(onClick = { onDelete(note) }) {
                            Icon(Icons.Default.Delete, contentDescription = "Delete ${note.title}")
                        }
                    }
                }
            }
        }
    }

    if (showDialog) {
        var title by rememberSaveable { mutableStateOf("") }
        var content by rememberSaveable { mutableStateOf("") }
        AlertDialog(
            onDismissRequest = { showDialog = false },
            title = { Text("New note") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(title, { title = it }, label = { Text("Title") })
                    OutlinedTextField(content, { content = it }, label = { Text("Content") })
                }
            },
            confirmButton = {
                TextButton(
                    onClick = { onAdd(title, content); showDialog = false },
                    enabled = title.isNotBlank()
                ) { Text("Save") }
            },
            dismissButton = { TextButton(onClick = { showDialog = false }) { Text("Cancel") } }
        )
    }
}
```
:::

## Check your understanding

```quiz
Q: What are the three main components of Room?
- [ ] Table, Query, Cursor
- [x] Entity, DAO, Database
- [ ] Model, View, Controller
- [ ] Repository, ViewModel, Activity
> Entities define tables, DAOs define access, and the Database class ties them together.

Q: Why does a DAO function return `Flow<List<NoteEntity>>` without `suspend`?
- [ ] It's a mistake; all DAO functions must suspend
- [x] Flows are observed over time. Room emits a new list whenever the table changes, and collecting already happens in a coroutine
- [ ] Flow functions run on the main thread
- [ ] To make it faster
> Observable queries return Flow; one-shot operations are suspend functions.

Q: You add a new column to an entity in version 2 of your published app. What must you do?
- [ ] Nothing
- [ ] Uninstall the app on all devices
- [x] Increase the database version and provide a migration (manual or auto)
- [ ] Rename the database
> Without a migration, Room crashes on upgrade (or wipes data if destructive migration is enabled).

Q: After inserting a note, how does the list on screen update?
- [ ] You must call `loadNotes()` again
- [x] Room's Flow emits the new list automatically, which flows through the ViewModel's StateFlow to Compose
- [ ] The Activity restarts
- [ ] It doesn't until the app restarts
> This reactive pattern keeps the UI in sync with the database with no manual refresh.
```
