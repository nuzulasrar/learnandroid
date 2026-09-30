---
id: images-media
title: Images from the Web & the Photo Picker
part: 6
minutes: 25
summary: Load and cache images from URLs with Coil, show placeholders and errors, and let users pick photos from their gallery with the privacy-friendly photo picker.
---

:::goals
- Loading network images with Coil's `AsyncImage`
- Placeholders, error images, crossfade and shapes
- Letting users pick photos with the Photo Picker (no permission needed!)
- Keeping access to picked photos across app restarts
- Taking a photo with the camera (overview)
:::

## Why you need an image library

Loading an image from a URL involves downloading it on a background thread, decoding it at the right size (a 4000×3000 photo in a 100 dp thumbnail wastes memory), caching it in memory and on disk, and cancelling the request when the item scrolls away. **Coil** (*Coroutine Image Loader*) does all that in one composable.

## Setup

```toml title="gradle/libs.versions.toml"
[versions]
coil = "3.6.3"

[libraries]
coil-compose = { group = "io.coil-kt.coil3", name = "coil-compose", version.ref = "coil" }
coil-network-okhttp = { group = "io.coil-kt.coil3", name = "coil-network-okhttp", version.ref = "coil" }
```

```kts title="app/build.gradle.kts"
implementation(libs.coil.compose)
implementation(libs.coil.network.okhttp)    // Coil 3 needs a network module to load URLs
```

And of course the `INTERNET` permission in your manifest.

## `AsyncImage`

```kotlin
AsyncImage(
    model = "https://cdn.dummyjson.com/recipe-images/1.webp",
    contentDescription = "Classic Margherita Pizza",
    contentScale = ContentScale.Crop,
    modifier = Modifier
        .fillMaxWidth()
        .aspectRatio(16f / 9f)
        .clip(RoundedCornerShape(16.dp))
)
```

That's it: downloading, resizing, memory + disk caching and cancellation are handled for you.

### Placeholders, errors and crossfade

```kotlin
AsyncImage(
    model = ImageRequest.Builder(LocalContext.current)
        .data(recipe.imageUrl)
        .crossfade(true)                               // fade in when loaded
        .build(),
    placeholder = painterResource(R.drawable.placeholder_food),
    error = painterResource(R.drawable.ic_broken_image),
    contentDescription = recipe.name,
    contentScale = ContentScale.Crop,
    modifier = Modifier.size(96.dp).clip(RoundedCornerShape(12.dp))
)
```

For full control over each state (e.g. a shimmer while loading), use `SubcomposeAsyncImage`:

```kotlin
SubcomposeAsyncImage(
    model = url,
    contentDescription = null,
    loading = { Box(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.surfaceVariant)) },
    error = { Icon(Icons.Default.BrokenImage, contentDescription = null) }   // material-icons-extended
)
```

:::tip Performance in lists
`AsyncImage` in a `LazyColumn` is efficient: requests are cancelled when items scroll off screen, and Coil resizes images to the composable's size. Just make sure the image has a **bounded size** (e.g. `size(96.dp)` or `aspectRatio`) so Coil knows how big to decode.
:::

## The Photo Picker

To let users choose images from their gallery, use the system **Photo Picker**. It requires **no permissions**: the user explicitly picks photos, and your app gets access only to those.

```kotlin title="PickPhotoScreen.kt"
@Composable
fun PickPhotoScreen() {
    var selectedUri by rememberSaveable { mutableStateOf<Uri?>(null) }

    val pickMedia = rememberLauncherForActivityResult(
        ActivityResultContracts.PickVisualMedia()
    ) { uri ->
        if (uri != null) selectedUri = uri     // null if the user cancelled
    }

    Column(Modifier.padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Button(onClick = {
            pickMedia.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
        }) {
            Text("Choose a photo")
        }

        selectedUri?.let { uri ->
            Spacer(Modifier.height(16.dp))
            AsyncImage(                           // Coil can load content:// URIs too
                model = uri,
                contentDescription = "Selected photo",
                contentScale = ContentScale.Crop,
                modifier = Modifier.size(240.dp).clip(RoundedCornerShape(16.dp))
            )
        }
    }
}
```

- Use `PickMultipleVisualMedia(maxItems = 5)` to allow several photos.
- Media types: `ImageOnly`, `VideoOnly`, `ImageAndVideo`.

### Keeping access after restart

The URI you receive only works temporarily. To store it (e.g. in Room, as a recipe photo) and use it later, either **take persistable permission**:

```kotlin
context.contentResolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
```

…or, more robustly, **copy the file into your app's private storage**:

```kotlin
suspend fun copyToAppStorage(context: Context, uri: Uri): File = withContext(Dispatchers.IO) {
    val file = File(context.filesDir, "photo_${System.currentTimeMillis()}.jpg")
    context.contentResolver.openInputStream(uri)!!.use { input ->
        file.outputStream().use { output -> input.copyTo(output) }
    }
    file
}
```

(Save `file.absolutePath` in your database, and Coil can load `File` objects directly.)

## Taking a photo (overview)

The `TakePicture` contract opens the camera app and writes the photo to a URI you provide. Because another app writes the file, you share a URI via a **FileProvider**:

1. Declare a `FileProvider` in the manifest with an `xml/file_paths.xml` resource.
2. Create a file in `cacheDir` and get its URI with `FileProvider.getUriForFile(...)`.
3. Launch `rememberLauncherForActivityResult(ActivityResultContracts.TakePicture())` with that URI; the callback tells you if it succeeded.

For an in-app camera preview (barcode scanning, custom capture), use the **CameraX** library, which is well worth exploring after this course.

## Recap

:::recap
- Coil's `AsyncImage(model = url)` loads, sizes, caches and cancels images for you.
- Add placeholders/error images and `crossfade(true)` for polish.
- The Photo Picker (`PickVisualMedia`) needs no permissions.
- Persist access with `takePersistableUriPermission` or copy into app storage.
:::

:::exercise
1. Build a grid (`LazyVerticalGrid`, 2 columns) of 20 recipe images using URLs `https://cdn.dummyjson.com/recipe-images/1.webp` … `20.webp`, each with rounded corners and crossfade.
2. Add a profile avatar: a circular image that defaults to an icon, and when tapped opens the photo picker and shows the chosen image.
:::

:::solution Show solution for task 1
```kotlin
@Composable
fun RecipeImageGrid() {
    LazyVerticalGrid(
        columns = GridCells.Fixed(2),
        contentPadding = PaddingValues(12.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        items((1..20).toList(), key = { it }) { id ->
            AsyncImage(
                model = ImageRequest.Builder(LocalContext.current)
                    .data("https://cdn.dummyjson.com/recipe-images/$id.webp")
                    .crossfade(true)
                    .build(),
                contentDescription = "Recipe $id",
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .aspectRatio(1f)
                    .clip(RoundedCornerShape(16.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant)
            )
        }
    }
}
```
:::

## Check your understanding

```quiz
Q: Why use Coil rather than downloading images yourself?
- [ ] Android can't download images
- [x] It handles background loading, resizing, memory/disk caching and cancellation for you
- [ ] It's required for Compose
- [ ] It makes images smaller on the server
> Image loading is deceptively complex; Coil solves it with one composable.

Q: Which permission does the Photo Picker require?
- [ ] READ_EXTERNAL_STORAGE
- [ ] READ_MEDIA_IMAGES
- [x] None
- [ ] CAMERA
> The user grants access to exactly the items they pick.

Q: In Coil 3, what extra dependency do you need to load images from URLs?
- [ ] coil-gif
- [x] A network module such as coil-network-okhttp
- [ ] Retrofit
- [ ] Nothing extra
> Coil 3 split networking into separate artifacts.
```
