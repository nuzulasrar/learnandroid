---
id: kotlin-collections
title: Collections & Lambdas
part: 2
minutes: 35
summary: Lists, sets and maps, plus lambdas and the collection functions (filter, map, sortedBy, groupBy and more) you'll use in every Android screen.
---

:::goals
- Read-only vs mutable collections
- Lists, sets and maps and when to use each
- What a lambda is and the `it` shorthand
- The essential collection operations: `filter`, `map`, `sortedBy`, `groupBy`, `sumOf`, `first`, `any`…
- Chaining operations into readable pipelines
:::

## Lists

A `List` is an ordered collection that can contain duplicates.

```kotlin runnable
fun main() {
    val colors = listOf("red", "green", "blue")   // read-only
    println(colors[0])          // "red"
    println(colors.size)        // 3
    println(colors.first())     // "red"
    println(colors.last())      // "blue"
    println("green" in colors)  // true
    println(colors.indexOf("blue")) // 2

    val shopping = mutableListOf("milk", "eggs")   // mutable
    shopping.add("bread")
    shopping.remove("milk")
    shopping[0] = "free-range eggs"
    println(shopping)
}
```

:::tip Read-only by default
`listOf` gives a **read-only** `List`: no `add` or `remove`. Use `mutableListOf` only when you need to change it. In Android you'll typically *replace* lists with new ones (e.g. `list + newItem`) rather than mutating them. That makes UI updates predictable, as you'll see in Compose.
:::

```kotlin runnable
fun main() {
    val a = listOf(1, 2, 3)
    val b = a + 4          // new list [1, 2, 3, 4]; a is unchanged
    val c = b - 1          // new list [2, 3, 4]
    println(a)
    println(b)
    println(c)
}
```

## Sets

A `Set` has **no duplicates** and is great for "is X in here?" checks.

```kotlin runnable
fun main() {
    val tags = setOf("kotlin", "android", "kotlin")
    println(tags)            // [kotlin, android]
    println(tags.size)       // 2

    val selected = mutableSetOf<Int>()
    selected.add(3)
    selected.add(3)          // ignored, already present
    selected.add(7)
    println(selected)
}
```

## Maps

A `Map` stores **key → value** pairs. Keys are unique.

```kotlin runnable
fun main() {
    val capitals = mapOf(
        "France" to "Paris",
        "Japan" to "Tokyo",
        "Kenya" to "Nairobi"
    )
    println(capitals["Japan"])          // Tokyo
    println(capitals["Mars"])           // null (not found)
    println(capitals.getOrDefault("Mars", "Unknown"))

    for ((country, city) in capitals) {
        println("$city is the capital of $country")
    }

    val stock = mutableMapOf("apples" to 5)
    stock["pears"] = 3                  // add
    stock["apples"] = stock.getValue("apples") - 1  // update
    println(stock)
}
```

## Lambdas

A **lambda** is a function without a name that you can store in a variable or pass to another function. It's written in braces:

```kotlin runnable
fun main() {
    val double = { x: Int -> x * 2 }
    val greet = { name: String -> "Hi, $name" }
    val sayHello = { println("Hello!") }     // no parameters

    println(double(21))
    println(greet("Ada"))
    sayHello()
}
```

- Parameters go before the arrow `->`, the body after it.
- The **last expression** in the lambda is its return value. No `return` keyword.

### `it`: the single-parameter shorthand

If a lambda has exactly one parameter, you can skip declaring it and refer to it as `it`:

```kotlin
val double: (Int) -> Int = { it * 2 }
```

### Trailing lambdas

If a function's **last** parameter is a lambda, you can move it outside the parentheses, and drop the parentheses entirely if it's the only argument:

```kotlin
numbers.filter({ it > 3 })   // valid, but nobody writes this
numbers.filter() { it > 3 }  // better
numbers.filter { it > 3 }    // ✅ idiomatic
```

:::note This is exactly how Compose looks
`Column { Text("Hi") }` is just a function call to `Column` whose last parameter is a lambda. Once you understand trailing lambdas, Compose code stops looking like magic.
:::

## Collection operations

These functions take lambdas and return **new** collections. They're the bread and butter of Kotlin.

```kotlin runnable
data class Product(val name: String, val price: Double, val category: String, val inStock: Boolean)

fun main() {
    val products = listOf(
        Product("Laptop", 1200.0, "Tech", true),
        Product("Mouse", 25.0, "Tech", true),
        Product("Desk", 300.0, "Furniture", false),
        Product("Chair", 150.0, "Furniture", true),
        Product("Monitor", 280.0, "Tech", false)
    )

    // filter: keep items matching a condition
    val available = products.filter { it.inStock }
    println(available.map { it.name })

    // map: transform each item
    val names = products.map { it.name.uppercase() }
    println(names)

    // sortedBy / sortedByDescending
    println(products.sortedBy { it.price }.map { it.name })

    // first / firstOrNull / find
    println(products.first { it.price > 500 }.name)
    println(products.firstOrNull { it.price > 5000 })   // null instead of crash

    // any / all / none / count
    println(products.any { !it.inStock })               // true
    println(products.all { it.price > 10 })             // true
    println(products.count { it.category == "Tech" })   // 3

    // sumOf / maxByOrNull / average
    println(products.sumOf { it.price })
    println(products.maxByOrNull { it.price }?.name)
    println(products.map { it.price }.average())

    // groupBy: Map<Key, List<Item>>
    val byCategory = products.groupBy { it.category }
    println(byCategory.mapValues { (_, items) -> items.size })

    // associateBy: Map<Key, Item>
    val byName = products.associateBy { it.name }
    println(byName["Chair"]?.price)

    // partition: split into two lists
    val (cheap, expensive) = products.partition { it.price < 200 }
    println("${cheap.size} cheap, ${expensive.size} expensive")
}
```

### Chaining

Combine operations into a pipeline that reads like a sentence:

```kotlin runnable
fun main() {
    val words = listOf("kotlin", "is", "a", "concise", "and", "expressive", "language")

    val result = words
        .filter { it.length > 3 }        // keep long words
        .map { it.replaceFirstChar(Char::uppercase) }  // capitalise
        .sortedBy { it.length }          // shortest first
        .joinToString(separator = " · ")

    println(result)
}
```

### Quick reference

| Function | Returns | Use it to… |
|---|---|---|
| `filter { }` | List | keep matching items |
| `map { }` | List | transform each item |
| `mapNotNull { }` | List | transform and drop nulls |
| `flatMap { }` | List | map each item to a list and flatten |
| `sortedBy { }` | List | sort by a key |
| `first { }` / `firstOrNull { }` | Item | find the first match |
| `any` / `all` / `none` | Boolean | test a condition |
| `count { }` | Int | count matches |
| `sumOf { }` | Number | add up values |
| `groupBy { }` | Map of lists | group items by a key |
| `associateBy { }` | Map | index items by a key |
| `distinct()` / `distinctBy { }` | List | remove duplicates |
| `take(n)` / `drop(n)` | List | first n / skip n |
| `chunked(n)` / `windowed(n)` | List of lists | split into groups |
| `forEach { }` | Unit | do something for each item |
| `joinToString()` | String | make a string |

## Recap

:::recap
- `List` (ordered), `Set` (unique), `Map` (key→value). Each has a `mutable…` version.
- Prefer read-only collections; create new ones with `+`, `-`, `map`, `filter`.
- A lambda is `{ params -> body }`; its last expression is the result. `it` names a single parameter.
- If a lambda is the last argument it can go outside the parentheses (a *trailing lambda*).
:::

## Practice

:::exercise
Given this list of students:

```kotlin
data class Student(val name: String, val grade: Int, val house: String)

val students = listOf(
    Student("Amara", 88, "Red"), Student("Ben", 72, "Blue"),
    Student("Chen", 95, "Red"), Student("Dara", 64, "Green"),
    Student("Eli", 79, "Blue"), Student("Fay", 91, "Green")
)
```

1. Print the names of students with a grade of 80 or more, sorted alphabetically.
2. Print the average grade, rounded to one decimal place (hint: `"%.1f".format(x)`).
3. Print each house with the name of its best student.
4. Print `true` if any student failed (grade below 65).
:::

:::solution Show solution
```kotlin runnable
data class Student(val name: String, val grade: Int, val house: String)

fun main() {
    val students = listOf(
        Student("Amara", 88, "Red"), Student("Ben", 72, "Blue"),
        Student("Chen", 95, "Red"), Student("Dara", 64, "Green"),
        Student("Eli", 79, "Blue"), Student("Fay", 91, "Green")
    )

    // 1
    println(students.filter { it.grade >= 80 }.map { it.name }.sorted())

    // 2
    println("%.1f".format(students.map { it.grade }.average()))

    // 3
    students.groupBy { it.house }.forEach { (house, members) ->
        println("$house: ${members.maxBy { it.grade }.name}")
    }

    // 4
    println(students.any { it.grade < 65 })
}
```
:::

## Check your understanding

```quiz
Q: What does `listOf(1, 2, 3, 4).filter { it % 2 == 0 }.map { it * 10 }` return?
- [ ] [10, 20, 30, 40]
- [x] [20, 40]
- [ ] [2, 4]
- [ ] [10, 30]
> filter keeps 2 and 4; map multiplies each by 10.

Q: Which collection guarantees there are no duplicate elements?
- [ ] List
- [x] Set
- [ ] Array
- [ ] MutableList
> Sets ignore attempts to add an element that's already present.

Q: What is `it` inside a lambda?
- [ ] A keyword meaning "iterator"
- [x] The implicit name of the lambda's single parameter
- [ ] The previous result
- [ ] The list being processed
> When a lambda has exactly one parameter you can omit its declaration and call it `it`.

Q: You want the first product costing more than $1000, but there might not be one. Which is safest?
- [ ] `products.first { it.price > 1000 }`
- [x] `products.firstOrNull { it.price > 1000 }`
- [ ] `products[0]`
- [ ] `products.filter { it.price > 1000 }[0]`
> `first` throws an exception when nothing matches. `firstOrNull` returns null instead.
```
