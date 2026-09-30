---
id: kotlin-classes
title: Classes, Objects & Interfaces
part: 2
minutes: 40
summary: Model your app's data and behaviour with classes. Covers constructors, properties, inheritance, interfaces, and Kotlin's special data, enum, sealed and object declarations.
---

:::goals
- Classes, constructors and properties
- Visibility modifiers (`private`, `internal`…)
- Inheritance with `open` and `override`, abstract classes and interfaces
- **Data classes** for holding data (used constantly in Android)
- **Enum** and **sealed** classes for fixed sets of options and UI states
- `object`, companion objects and singletons
:::

## Classes and constructors

A **class** is a blueprint; an **object** (instance) is something built from it.

```kotlin runnable
class Dog(val name: String, var age: Int) {     // primary constructor + properties
    fun bark() = println("$name says Woof!")

    fun haveBirthday() {
        age++
        println("$name is now $age")
    }
}

fun main() {
    val rex = Dog("Rex", 3)     // no "new" keyword in Kotlin
    rex.bark()
    rex.haveBirthday()
    println(rex.name)
}
```

- `val`/`var` in the constructor declares **properties** directly.
- Functions inside a class are called **methods** (or member functions).

### `init` blocks and extra properties

```kotlin runnable
class Rectangle(val width: Double, val height: Double) {
    val area = width * height            // computed once, at construction
    val isSquare: Boolean
        get() = width == height           // computed every time it's read

    init {
        require(width > 0 && height > 0) { "Sides must be positive" }
        println("Created a ${width}x$height rectangle")
    }
}

fun main() {
    val r = Rectangle(3.0, 3.0)
    println(r.area)
    println(r.isSquare)
}
```

`require(condition) { message }` throws an `IllegalArgumentException` if the condition is false. It's a handy way to validate input.

## Visibility modifiers

| Modifier | Visible to |
|---|---|
| `public` (default) | Everyone |
| `internal` | Code in the same module |
| `protected` | The class and its subclasses |
| `private` | Only inside the class (or file, for top-level declarations) |

A common Android pattern is to keep a *mutable* property private and expose a *read-only* view:

```kotlin runnable
class Counter {
    private var _count = 0          // only this class can change it
    val count: Int get() = _count   // everyone can read it

    fun increment() { _count++ }
}

fun main() {
    val c = Counter()
    c.increment(); c.increment()
    println(c.count)
    // c._count = 100   // ❌ compile error: private
}
```

You'll see exactly this pattern (with `_uiState` and `uiState`) in every ViewModel in Part 4.

## Inheritance

Classes are **final by default** in Kotlin. To allow subclassing, mark them `open`. Methods that may be overridden must also be `open`.

```kotlin runnable
open class Animal(val name: String) {
    open fun sound() = "..."
    fun describe() = "$name says ${sound()}"
}

class Cat(name: String) : Animal(name) {
    override fun sound() = "Meow"
}

class Cow(name: String) : Animal(name) {
    override fun sound() = "Moo"
}

fun main() {
    val animals: List<Animal> = listOf(Cat("Tom"), Cow("Daisy"))
    animals.forEach { println(it.describe()) }
}
```

### Abstract classes

An `abstract` class can't be instantiated and can declare members without implementations that subclasses *must* provide:

```kotlin
abstract class Shape {
    abstract fun area(): Double
    fun describe() = "Area: ${"%.2f".format(area())}"
}

class Circle(val r: Double) : Shape() {
    override fun area() = Math.PI * r * r
}
```

## Interfaces

An **interface** defines a *contract*: what something can do, not how. A class can implement many interfaces (but extend only one class).

```kotlin runnable
interface Clickable {
    fun click()
    fun showOff() = println("I'm clickable!")   // default implementation
}

interface Focusable {
    fun focus()
}

class Button(val label: String) : Clickable, Focusable {
    override fun click() = println("$label clicked")
    override fun focus() = println("$label focused")
}

fun main() {
    val b = Button("OK")
    b.click()
    b.focus()
    b.showOff()
}
```

:::note Why interfaces matter so much in Android
Architecture relies on them. A screen depends on an interface such as `RecipeRepository`, not on a concrete class. In the real app you plug in an implementation that talks to the network; in tests you plug in a fake. You'll do exactly this in Parts 4, 5 and 7.
:::

## Data classes ⭐

Most classes in an app just **hold data**: a user, a message, a recipe. Mark them `data` and Kotlin generates useful functions for you:

```kotlin runnable
data class User(val id: Int, val name: String, val email: String)

fun main() {
    val a = User(1, "Ada", "ada@example.com")
    val b = User(1, "Ada", "ada@example.com")

    println(a)            // toString(): User(id=1, name=Ada, email=ada@example.com)
    println(a == b)       // equals(): true, compares contents

    // copy(): make a modified copy (the original stays unchanged)
    val renamed = a.copy(name = "Ada Lovelace")
    println(renamed)

    // destructuring
    val (id, name) = a
    println("$id → $name")
}
```

Data classes give you `equals`, `hashCode`, `toString`, `copy` and destructuring for free. `copy` is especially important: in Compose and ViewModels you'll update state with `state.copy(isLoading = false)` rather than mutating objects.

## Enum classes

An **enum** is a type with a fixed set of values:

```kotlin runnable
enum class Difficulty(val label: String, val stars: Int) {
    EASY("Easy", 1),
    MEDIUM("Medium", 2),
    HARD("Hard", 3);

    fun display() = "$label ${"★".repeat(stars)}"
}

fun main() {
    val d = Difficulty.MEDIUM
    println(d.display())
    println(Difficulty.entries.map { it.name })   // all values
    println(Difficulty.valueOf("HARD").stars)

    val advice = when (d) {        // no else needed: the compiler knows all cases
        Difficulty.EASY -> "Great for beginners"
        Difficulty.MEDIUM -> "Some experience needed"
        Difficulty.HARD -> "For experts"
    }
    println(advice)
}
```

## Sealed classes & interfaces ⭐

A **sealed** type is like an enum on steroids: a fixed set of *subclasses*, each of which can hold different data. It's the standard way to model **UI state** and **results** in Android:

```kotlin runnable
sealed interface UiState {
    data object Loading : UiState
    data class Success(val items: List<String>) : UiState
    data class Error(val message: String) : UiState
}

fun render(state: UiState): String = when (state) {   // exhaustive: no else needed
    UiState.Loading -> "⏳ Loading…"
    is UiState.Success -> "✅ ${state.items.size} items: ${state.items}"
    is UiState.Error -> "❌ ${state.message}"
}

fun main() {
    println(render(UiState.Loading))
    println(render(UiState.Success(listOf("Pasta", "Curry"))))
    println(render(UiState.Error("No internet")))
}
```

Because the compiler knows every possible subtype, `when` is **exhaustive**. If you later add a new state (say `Empty`), every `when` that doesn't handle it becomes a compile error, so you can't forget to handle it in the UI.

## `object`: singletons

`object` declares a class with exactly **one instance**, created lazily the first time it's used:

```kotlin runnable
object AppConfig {
    const val API_URL = "https://dummyjson.com/"
    var darkMode = false
}

fun main() {
    println(AppConfig.API_URL)
    AppConfig.darkMode = true
    println(AppConfig.darkMode)
}
```

### Companion objects

A `companion object` holds members that belong to the class itself rather than to instances. These are similar to `static` in Java. It's often used for constants and factory functions:

```kotlin runnable
class Temperature private constructor(val celsius: Double) {
    companion object {
        const val ABSOLUTE_ZERO = -273.15
        fun fromFahrenheit(f: Double) = Temperature((f - 32) * 5 / 9)
        fun fromCelsius(c: Double) = Temperature(c)
    }
}

fun main() {
    val t = Temperature.fromFahrenheit(212.0)
    println(t.celsius)
    println(Temperature.ABSOLUTE_ZERO)
}
```

## Recap

:::recap
- `class Name(val prop: Type)` declares a class and its properties in one line.
- Classes are final by default; use `open`/`override` for inheritance. Prefer interfaces for contracts.
- **Data classes** hold data and give you `copy`, `equals`, `toString`.
- **Enums** are fixed sets of values; **sealed** types are fixed sets of subtypes, perfect for UI state.
- `object` makes singletons; `companion object` holds class-level members.
:::

## Practice

:::exercise
1. Create a `data class Book(val title: String, val author: String, val pages: Int, val read: Boolean = false)`. Make a list of four books, then use `copy` to mark one as read, and print how many pages you've read in total.
2. Create a sealed interface `PaymentResult` with `Success(val amount: Double)`, `Declined(val reason: String)` and `data object Pending`. Write a function that returns a user-friendly message for each using `when`.
3. Create an interface `Shape` with `fun area(): Double` and implement it with `Circle` and `Square`. Print the total area of a list of shapes.
:::

:::solution Show solutions
```kotlin runnable
data class Book(val title: String, val author: String, val pages: Int, val read: Boolean = false)

sealed interface PaymentResult {
    data class Success(val amount: Double) : PaymentResult
    data class Declined(val reason: String) : PaymentResult
    data object Pending : PaymentResult
}

fun message(r: PaymentResult) = when (r) {
    is PaymentResult.Success -> "Paid $${r.amount}. Thank you!"
    is PaymentResult.Declined -> "Payment declined: ${r.reason}"
    PaymentResult.Pending -> "Payment is processing…"
}

interface Shape { fun area(): Double }
class Circle(val r: Double) : Shape { override fun area() = Math.PI * r * r }
class Square(val side: Double) : Shape { override fun area() = side * side }

fun main() {
    val books = listOf(
        Book("Dune", "Herbert", 412, read = true),
        Book("Kotlin in Action", "Jemerov", 360),
        Book("Clean Code", "Martin", 464),
        Book("The Hobbit", "Tolkien", 310)
    )
    val updated = books.map { if (it.title == "The Hobbit") it.copy(read = true) else it }
    println("Pages read: ${updated.filter { it.read }.sumOf { it.pages }}")

    println(message(PaymentResult.Success(9.99)))
    println(message(PaymentResult.Declined("Insufficient funds")))
    println(message(PaymentResult.Pending))

    val shapes = listOf(Circle(1.0), Square(2.0))
    println("Total area: ${"%.2f".format(shapes.sumOf { it.area() })}")
}
```
:::

## Check your understanding

```quiz
Q: Which is NOT generated automatically for a data class?
- [ ] `copy()`
- [ ] `equals()`
- [ ] `toString()`
- [x] `save()`
> Data classes generate equals, hashCode, toString, copy and componentN (destructuring).

Q: Why do we write `open class Animal`?
- [ ] To make it public
- [x] Because Kotlin classes are final by default and can't be subclassed otherwise
- [ ] To allow it to be instantiated
- [ ] To make its properties mutable
> Without `open`, trying to extend the class is a compile error.

Q: What's the main advantage of a sealed interface for UI state?
- [ ] It uses less memory
- [ ] It can be saved to a database automatically
- [x] `when` expressions become exhaustive, so the compiler makes you handle every state
- [ ] It makes properties private
> The compiler knows every subtype, so forgetting to handle one is a compile error.

Q: What does `user.copy(name = "Grace")` do?
- [ ] Changes `user.name` to "Grace"
- [x] Returns a new object with the same values except `name`, leaving `user` unchanged
- [ ] Creates an empty user named Grace
- [ ] Copies the user to the clipboard
> `copy` creates a new instance. The original is untouched, which suits immutable state.
```
