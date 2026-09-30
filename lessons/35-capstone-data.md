---
id: capstone-data
title: "Capstone 2: The Data Layer"
part: 8
minutes: 45
summary: Build RecipeBox's data layer. The app model, the Retrofit API, the Room database with favourites, an offline-first repository, settings with DataStore, and the Hilt modules that tie it all together.
---

:::goals
- Modelling the API response and the app's own `Recipe` model
- A Room database with a recipes cache and a favourites table
- An offline-first `RecipeRepository`
- A DataStore-backed `SettingsRepository`
- Hilt modules for network, database and repositories
:::

## The data flow

<div class="diagram"><div class="flow">
<div>DummyJSON API<small>RecipeDto</small></div><div class="arrow">→ refresh() →</div>
<div class="hl">Room<small>RecipeEntity · FavoriteEntity</small></div><div class="arrow">→ Flow →</div>
<div>Repository<small>maps to Recipe</small></div><div class="arrow">→</div>
<div class="hl">ViewModels</div>
</div></div>

Three model types, one per layer: `RecipeDto` (network), `RecipeEntity` (database), `Recipe` (what the UI uses).

## 1. The app model

```kotlin title="data/model/Recipe.kt"
package com.example.recipebox.data.model

data class Recipe(
    val id: Int,
    val name: String,
    val imageUrl: String,
    val cuisine: String,
    val difficulty: String,
    val prepMinutes: Int,
    val cookMinutes: Int,
    val servings: Int,
    val caloriesPerServing: Int,
    val rating: Double,
    val tags: List<String>,
    val ingredients: List<String>,
    val instructions: List<String>
) {
    val totalMinutes: Int get() = prepMinutes + cookMinutes
}
```

## 2. Network: DTOs and API

Open [dummyjson.com/recipes/1](https://dummyjson.com/recipes/1) in your browser and compare it with the DTO:

```kotlin title="data/remote/RecipeDto.kt"
package com.example.recipebox.data.remote

import kotlinx.serialization.Serializable

@Serializable
data class RecipeDto(
    val id: Int,
    val name: String,
    val ingredients: List<String> = emptyList(),
    val instructions: List<String> = emptyList(),
    val prepTimeMinutes: Int = 0,
    val cookTimeMinutes: Int = 0,
    val servings: Int = 0,
    val difficulty: String = "",
    val cuisine: String = "",
    val caloriesPerServing: Int = 0,
    val tags: List<String> = emptyList(),
    val image: String = "",
    val rating: Double = 0.0
)

@Serializable
data class RecipeListResponse(
    val recipes: List<RecipeDto>,
    val total: Int = 0
)
```

Default values make the parser tolerant of missing fields, and `ignoreUnknownKeys` (next section) ignores fields we don't need, like `reviewCount`.

```kotlin title="data/remote/RecipeApi.kt"
package com.example.recipebox.data.remote

import retrofit2.http.GET
import retrofit2.http.Query

interface RecipeApi {
    /** limit = 0 returns all recipes (the API has ~50). */
    @GET("recipes")
    suspend fun getRecipes(@Query("limit") limit: Int = 0): RecipeListResponse
}
```

## 3. Local: entities, converters, DAO, database

```kotlin title="data/local/RecipeEntity.kt"
package com.example.recipebox.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "recipes")
data class RecipeEntity(
    @PrimaryKey val id: Int,
    val name: String,
    val imageUrl: String,
    val cuisine: String,
    val difficulty: String,
    val prepMinutes: Int,
    val cookMinutes: Int,
    val servings: Int,
    val caloriesPerServing: Int,
    val rating: Double,
    val tags: List<String>,
    val ingredients: List<String>,
    val instructions: List<String>
)

@Entity(tableName = "favorites")
data class FavoriteEntity(
    @PrimaryKey val recipeId: Int,
    val addedAt: Long = System.currentTimeMillis()
)
```

Favourites live in their **own table**, storing only the recipe id. Refreshing the recipe cache never touches the user's favourites.

```kotlin title="data/local/Converters.kt"
package com.example.recipebox.data.local

import androidx.room.TypeConverter
import kotlinx.serialization.encodeToString
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.json.Json

class Converters {
    @TypeConverter
    fun fromStringList(value: List<String>): String = Json.encodeToString(value)

    @TypeConverter
    fun toStringList(value: String): List<String> = Json.decodeFromString(value)
}
```

(If Android Studio greys out the `encodeToString`/`decodeFromString` imports as unused, your serialization version has them built in, so you can delete them.)

```kotlin title="data/local/RecipeDao.kt"
package com.example.recipebox.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

@Dao
interface RecipeDao {

    /** An empty query matches everything, since LIKE '%%' is always true. */
    @Query(
        """
        SELECT * FROM recipes
        WHERE name LIKE '%' || :query || '%'
           OR cuisine LIKE '%' || :query || '%'
           OR tags LIKE '%' || :query || '%'
        ORDER BY rating DESC
        """
    )
    fun searchRecipes(query: String): Flow<List<RecipeEntity>>

    @Query("SELECT * FROM recipes WHERE id = :id")
    fun observeRecipe(id: Int): Flow<RecipeEntity?>

    @Upsert
    suspend fun upsertRecipes(recipes: List<RecipeEntity>)

    @Query(
        """
        SELECT recipes.* FROM recipes
        INNER JOIN favorites ON recipes.id = favorites.recipeId
        ORDER BY favorites.addedAt DESC
        """
    )
    fun observeFavorites(): Flow<List<RecipeEntity>>

    @Query("SELECT recipeId FROM favorites")
    fun observeFavoriteIds(): Flow<List<Int>>

    @Query("SELECT EXISTS(SELECT 1 FROM favorites WHERE recipeId = :recipeId)")
    suspend fun isFavorite(recipeId: Int): Boolean

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun addFavorite(favorite: FavoriteEntity)

    @Query("DELETE FROM favorites WHERE recipeId = :recipeId")
    suspend fun removeFavorite(recipeId: Int)

    /** Check-then-write inside one transaction so rapid taps can't race. */
    @Transaction
    suspend fun toggleFavorite(recipeId: Int) {
        if (isFavorite(recipeId)) removeFavorite(recipeId) else addFavorite(FavoriteEntity(recipeId))
    }
}
```

```kotlin title="data/local/RecipeDatabase.kt"
package com.example.recipebox.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.TypeConverters

@Database(
    entities = [RecipeEntity::class, FavoriteEntity::class],
    version = 1,
    exportSchema = false      // set up schema export before your first release (Lesson 24)
)
@TypeConverters(Converters::class)
abstract class RecipeDatabase : RoomDatabase() {
    abstract fun recipeDao(): RecipeDao
}
```

## 4. Mappers

Put these at the bottom of the files they convert *from*, or in a `Mappers.kt` file in `data`:

```kotlin title="data/Mappers.kt"
package com.example.recipebox.data

import com.example.recipebox.data.local.RecipeEntity
import com.example.recipebox.data.model.Recipe
import com.example.recipebox.data.remote.RecipeDto

fun RecipeDto.toEntity() = RecipeEntity(
    id = id,
    name = name,
    imageUrl = image,
    cuisine = cuisine,
    difficulty = difficulty,
    prepMinutes = prepTimeMinutes,
    cookMinutes = cookTimeMinutes,
    servings = servings,
    caloriesPerServing = caloriesPerServing,
    rating = rating,
    tags = tags,
    ingredients = ingredients,
    instructions = instructions
)

fun RecipeEntity.toRecipe() = Recipe(
    id = id,
    name = name,
    imageUrl = imageUrl,
    cuisine = cuisine,
    difficulty = difficulty,
    prepMinutes = prepMinutes,
    cookMinutes = cookMinutes,
    servings = servings,
    caloriesPerServing = caloriesPerServing,
    rating = rating,
    tags = tags,
    ingredients = ingredients,
    instructions = instructions
)
```

## 5. The repository

```kotlin title="data/repository/RecipeRepository.kt"
package com.example.recipebox.data.repository

import com.example.recipebox.data.model.Recipe
import kotlinx.coroutines.flow.Flow

interface RecipeRepository {
    fun observeRecipes(query: String): Flow<List<Recipe>>
    fun observeRecipe(id: Int): Flow<Recipe?>
    fun observeFavorites(): Flow<List<Recipe>>
    fun observeFavoriteIds(): Flow<Set<Int>>
    suspend fun refresh(): Result<Unit>
    suspend fun toggleFavorite(recipeId: Int)
}
```

```kotlin title="data/repository/OfflineFirstRecipeRepository.kt"
package com.example.recipebox.data.repository

import com.example.recipebox.data.local.RecipeDao
import com.example.recipebox.data.model.Recipe
import com.example.recipebox.data.remote.RecipeApi
import com.example.recipebox.data.toEntity
import com.example.recipebox.data.toRecipe
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.serialization.SerializationException
import retrofit2.HttpException
import java.io.IOException
import javax.inject.Inject

class OfflineFirstRecipeRepository @Inject constructor(
    private val api: RecipeApi,
    private val dao: RecipeDao
) : RecipeRepository {

    override fun observeRecipes(query: String): Flow<List<Recipe>> =
        dao.searchRecipes(query.trim()).map { list -> list.map { it.toRecipe() } }

    override fun observeRecipe(id: Int): Flow<Recipe?> =
        dao.observeRecipe(id).map { it?.toRecipe() }

    override fun observeFavorites(): Flow<List<Recipe>> =
        dao.observeFavorites().map { list -> list.map { it.toRecipe() } }

    override fun observeFavoriteIds(): Flow<Set<Int>> =
        dao.observeFavoriteIds().map { it.toSet() }

    override suspend fun refresh(): Result<Unit> = try {
        val remote = api.getRecipes().recipes
        dao.upsertRecipes(remote.map { it.toEntity() })
        Result.success(Unit)
    } catch (e: IOException) {
        Result.failure(e)
    } catch (e: HttpException) {
        Result.failure(e)
    } catch (e: SerializationException) {
        Result.failure(e)
    }

    override suspend fun toggleFavorite(recipeId: Int) = dao.toggleFavorite(recipeId)
}
```

Every read is a `Flow` from Room, and `refresh()` only *writes* to Room. That's the offline-first pattern from Lesson 26.

## 6. Settings with DataStore

This is the settings code from Lesson 25, adapted for RecipeBox:

```kotlin title="data/settings/SettingsRepository.kt"
package com.example.recipebox.data.settings

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.emptyPreferences
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.map
import java.io.IOException
import javax.inject.Inject
import javax.inject.Singleton

private val Context.settingsDataStore: DataStore<Preferences> by preferencesDataStore(name = "settings")

enum class ThemeMode { SYSTEM, LIGHT, DARK }

data class UserSettings(
    val themeMode: ThemeMode = ThemeMode.SYSTEM,
    val dynamicColor: Boolean = true
)

@Singleton
class SettingsRepository @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private object Keys {
        val THEME = stringPreferencesKey("theme_mode")
        val DYNAMIC_COLOR = booleanPreferencesKey("dynamic_color")
    }

    val settings: Flow<UserSettings> = context.settingsDataStore.data
        .catch { e -> if (e is IOException) emit(emptyPreferences()) else throw e }
        .map { prefs ->
            UserSettings(
                themeMode = prefs[Keys.THEME]
                    ?.let { runCatching { ThemeMode.valueOf(it) }.getOrNull() }
                    ?: ThemeMode.SYSTEM,
                dynamicColor = prefs[Keys.DYNAMIC_COLOR] ?: true
            )
        }

    suspend fun setThemeMode(mode: ThemeMode) {
        context.settingsDataStore.edit { it[Keys.THEME] = mode.name }
    }

    suspend fun setDynamicColor(enabled: Boolean) {
        context.settingsDataStore.edit { it[Keys.DYNAMIC_COLOR] = enabled }
    }
}
```

## 7. Hilt modules

```kotlin title="di/NetworkModule.kt"
package com.example.recipebox.di

import com.example.recipebox.BuildConfig
import com.example.recipebox.data.remote.RecipeApi
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    private const val BASE_URL = "https://dummyjson.com/"

    @Provides
    @Singleton
    fun provideJson(): Json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
    }

    @Provides
    @Singleton
    fun provideOkHttpClient(): OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .addInterceptor(
            HttpLoggingInterceptor().apply {
                level = if (BuildConfig.DEBUG) HttpLoggingInterceptor.Level.BASIC
                        else HttpLoggingInterceptor.Level.NONE
            }
        )
        .build()

    @Provides
    @Singleton
    fun provideRetrofit(client: OkHttpClient, json: Json): Retrofit = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .client(client)
        .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
        .build()

    @Provides
    @Singleton
    fun provideRecipeApi(retrofit: Retrofit): RecipeApi = retrofit.create(RecipeApi::class.java)
}
```

```kotlin title="di/DatabaseModule.kt"
package com.example.recipebox.di

import android.content.Context
import androidx.room.Room
import com.example.recipebox.data.local.RecipeDao
import com.example.recipebox.data.local.RecipeDatabase
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): RecipeDatabase =
        Room.databaseBuilder(context, RecipeDatabase::class.java, "recipebox.db").build()

    @Provides
    fun provideRecipeDao(database: RecipeDatabase): RecipeDao = database.recipeDao()
}
```

```kotlin title="di/RepositoryModule.kt"
package com.example.recipebox.di

import com.example.recipebox.data.repository.OfflineFirstRecipeRepository
import com.example.recipebox.data.repository.RecipeRepository
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {

    @Binds
    @Singleton
    abstract fun bindRecipeRepository(impl: OfflineFirstRecipeRepository): RecipeRepository
}
```

`SettingsRepository` has an `@Inject constructor` and `@Singleton`, so it needs no module.

## 8. Build to check

Run **Build → Make Project** ([[Cmd]]/[[Ctrl]] + [[F9]]). KSP generates the Room and Hilt code. If there are errors:

- **Room**: "There is a problem with the query…". Check column names in your SQL against the entity.
- **Room**: "Cannot figure out how to save this field into database". The `@TypeConverters` annotation is missing on the database.
- **Hilt**: "…cannot be provided without an @Inject constructor or an @Provides-annotated method". A binding is missing; check the modules above.

Nothing uses this code yet, so there's nothing to see when running the app. That comes next lesson. But a successful build means your whole data layer compiles and Hilt's graph is complete. 💪

:::exercise Stretch goals
1. Add a `lastRefreshed` timestamp to DataStore and skip network refreshes that happen within 15 minutes of the previous one (unless forced by pull-to-refresh).
2. Add a `getRecipe(id)` endpoint (`@GET("recipes/{id}")`) and use it in `refreshRecipe(id)` so the detail screen can load a single recipe if it isn't cached yet.
:::

## Check your understanding

```quiz
Q: Why are favourites stored in a separate `favorites` table instead of an `isFavorite` column on `recipes`?
- [ ] Room doesn't support Boolean columns
- [x] So refreshing and overwriting cached recipes from the network never erases the user's favourites
- [ ] It's faster to query
- [ ] Hilt requires it
> Separating user data from cached server data keeps each safe from the other.

Q: What does `searchRecipes("")` return?
- [ ] Nothing
- [x] All recipes, because `LIKE '%%'` matches any value
- [ ] An error
- [ ] Only favourites
> Concatenating an empty query gives '%%', which matches every row.

Q: Why is `toggleFavorite` marked `@Transaction`?
- [ ] It makes it run on the main thread
- [x] The check and the insert/delete happen atomically, so two quick taps can't produce an inconsistent result
- [ ] Transactions are required for all DAO functions
- [ ] It enables Flow
> Wrapping read-then-write logic in a transaction avoids race conditions.
```
