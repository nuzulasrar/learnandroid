---
id: kotlin-null-safety
title: Null Safety
part: 2
minutes: 20
summary: Kotlin's type system eliminates most NullPointerExceptions, the #1 cause of crashes in older Android apps. Learn nullable types and the operators that make them safe.
---

:::goals
- What `null` is and why it causes crashes
- Nullable (`String?`) vs non-null (`String`) types
- Safe calls `?.`, the Elvis operator `?:` and `let`
- Why `!!` is dangerous
- `lateinit` and when it's used
:::

## The billion-dollar mistake

`null` means "no value". In many languages any variable can secretly be `null`, and calling something on it crashes the program with a **NullPointerException (NPE)**. For years NPEs were the most common crash in Android apps.

Kotlin fixes this in the **type system**: a normal type can *never* be null.

```kotlin
var name: String = "Ada"
name = null        // ❌ compile error: Null can not be a value of a non-null type String
```

To allow `null`, add a `?` to the type:

```kotlin
var nickname: String? = "Addy"
nickname = null    // ✅ fine, String? means "a String or null"
```

The compiler then **forces you to handle** the null case before using the value:

```kotlin
println(nickname.length)   // ❌ compile error: nickname might be null
```

That turns a runtime crash into a compile-time error you fix before shipping. 🎉

## Handling nullable values

### 1. Check with `if`

After checking, Kotlin smart-casts the variable to non-null:

```kotlin runnable
fun main() {
    val nickname: String? = "Addy"
    if (nickname != null) {
        println(nickname.length)   // smart cast: String here
    } else {
        println("No nickname")
    }
}
```

### 2. Safe call `?.`

`a?.b` means "if `a` isn't null, get `b`; otherwise the whole thing is null":

```kotlin runnable
fun main() {
    val present: String? = "Kotlin"
    val missing: String? = null

    println(present?.length)    // 6
    println(missing?.length)    // null, no crash

    // Chains stop at the first null:
    val city: String? = null
    println(city?.trim()?.uppercase()?.length)   // null
}
```

### 3. Elvis operator `?:`

`a ?: b` means "use `a`, but if it's null use `b`". It's named after Elvis's hair when you tilt your head. 🕺

```kotlin runnable
fun main() {
    val input: String? = null
    val name = input ?: "Guest"
    println("Welcome, $name")

    val length = input?.length ?: 0
    println(length)
}
```

Elvis can also `return` or `throw` early, a very common pattern:

```kotlin
fun greet(user: User?) {
    val u = user ?: return          // exit the function if null
    println("Hello ${u.name}")      // u is non-null from here
}

fun requireName(name: String?): String =
    name ?: throw IllegalArgumentException("Name is required")
```

### 4. `let` with safe call

`?.let { }` runs a block only when the value isn't null, with the value available as `it`:

```kotlin runnable
fun main() {
    val email: String? = "ada@example.com"
    email?.let {
        println("Sending welcome email to $it")
    }

    val none: String? = null
    none?.let { println("This never prints") }
}
```

### 5. The not-null assertion `!!` (avoid!)

`a!!` says "I promise this isn't null. Crash if I'm wrong."

```kotlin
val name: String? = null
println(name!!.length)   // 💥 NullPointerException
```

:::danger Treat `!!` as a code smell
Every `!!` is a potential crash. There's almost always a better option: `?.`, `?:`, `let`, or restructuring your code so the value can't be null. Real apps have very few, if any, `!!`.
:::

## Nulls in collections

```kotlin runnable
fun main() {
    val inputs = listOf("4", "x", "15", "", "8")

    // toIntOrNull returns Int? — mapNotNull drops the nulls
    val numbers = inputs.mapNotNull { it.toIntOrNull() }
    println(numbers)               // [4, 15, 8]

    val maybe: List<String?> = listOf("a", null, "b")
    println(maybe.filterNotNull()) // [a, b]
}
```

Note the difference: `List<String?>` is a list that may *contain* nulls; `List<String>?` is a list that may itself *be* null.

## `lateinit`

Sometimes a non-null property can't be set in the constructor but is guaranteed to be set before use. That happens in some Android APIs and in test setups. `lateinit` lets you promise to initialise it later:

```kotlin
class ProfileTest {
    private lateinit var repository: FakeRepository

    @Before
    fun setUp() {
        repository = FakeRepository()   // set before every test
    }
}
```

Accessing a `lateinit` property before setting it throws an exception, so use it sparingly. With Compose and modern architecture you'll rarely need it outside tests.

## Recap

:::recap
- `String` can never be null; `String?` can.
- `?.` safely calls through a nullable; `?:` supplies a fallback; `?.let { }` runs code only when non-null.
- `!!` forces a crash on null, so avoid it.
- Functions like `toIntOrNull`, `firstOrNull`, `getOrNull` return nulls instead of throwing, so pair them with `?:`.
:::

## Practice

:::exercise
1. Write `fun lengthOrZero(s: String?): Int` using a safe call and Elvis.
2. Write `fun parseAge(input: String?): String` that returns `"Age: N"` for a valid number, or `"Invalid age"` if the input is null, empty, or not a number. Don't use `!!` or `if`.
3. Given `val users = mapOf(1 to "Ada", 2 to "Linus")`, print the uppercase name for id 3, falling back to `"UNKNOWN"`.
:::

:::solution Show solutions
```kotlin runnable
fun lengthOrZero(s: String?): Int = s?.length ?: 0

fun parseAge(input: String?): String =
    input?.toIntOrNull()?.let { "Age: $it" } ?: "Invalid age"

fun main() {
    println(lengthOrZero(null))
    println(lengthOrZero("hey"))

    println(parseAge("42"))
    println(parseAge("forty"))
    println(parseAge(null))

    val users = mapOf(1 to "Ada", 2 to "Linus")
    println(users[3]?.uppercase() ?: "UNKNOWN")
}
```
:::

## Check your understanding

```quiz
Q: Which declaration allows the variable to hold null?
- [ ] `val a: String = null`
- [x] `val a: String? = null`
- [ ] `val a: String! = null`
- [ ] `val a = String(null)`
> Only types with `?` can hold null.

Q: What does `val x = s?.length ?: -1` produce when `s` is null?
- [ ] null
- [ ] 0
- [x] -1
- [ ] It crashes
> `s?.length` is null, so the Elvis operator returns the fallback, -1.

Q: Why should `!!` be avoided?
- [ ] It's slower than `?.`
- [ ] It's deprecated
- [x] It throws a NullPointerException if the value is null, bringing back the crashes null safety prevents
- [ ] It converts values to strings
> `!!` is an explicit "crash if null". Safer alternatives almost always exist.

Q: What does `listOf("1", "a", "3").mapNotNull { it.toIntOrNull() }` return?
- [ ] [1, null, 3]
- [x] [1, 3]
- [ ] ["1", "3"]
- [ ] It crashes on "a"
> `toIntOrNull()` returns null for "a", and `mapNotNull` drops nulls.
```
