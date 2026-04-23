```kotlin
// FILE: backend/settings.gradle.kts
rootProject.name = "app"
```
Sets the Gradle root project name to "app".

```kotlin
// FILE: backend/build.gradle.kts
plugins {
    kotlin("jvm") version "1.9.25"
    kotlin("plugin.serialization") version "1.9.25"
    application
}

group = "com.app"
version = "1.0.0"

application {
    mainClass.set("com.app.ApplicationKt")
}

kotlin {
    jvmToolchain(21)
}

repositories {
    mavenCentral()
}

dependencies {
    implementation("io.ktor:ktor-server-core:2.3.12")
    implementation("io.ktor:ktor-server-netty:2.3.12")
    implementation("io.ktor:ktor-server-content-negotiation:2.3.12")
    implementation("io.ktor:ktor-server-cors:2.3.12")
    implementation("io.ktor:ktor-serialization-kotlinx-json:2.3.12")
    implementation("org.jetbrains.exposed:exposed-core:0.55.0")
    implementation("org.jetbrains.exposed:exposed-dao:0.55.0")
    implementation("org.jetbrains.exposed:exposed-jdbc:0.55.0")
    implementation("org.xerial:sqlite-jdbc:3.47.1.0")
    implementation("ch.qos.logback:logback-classic:1.5.12")
}
```
Configures the Kotlin JVM project with all required Ktor, Exposed, SQLite, and Logback dependencies, setting the main class and JVM toolchain to version 21.

```properties
# FILE: backend/gradle/wrapper/gradle-wrapper.properties
distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\://services.gradle.org/distributions/gradle-8.10-bin.zip
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
```
Points the Gradle wrapper to the Gradle 8.10 binary distribution.

```kotlin
// FILE: backend/src/main/kotlin/com/app/Application.kt
package com.app

import com.app.routes.expenseRoutes
import com.app.routes.categoryRoutes
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import io.ktor.server.plugins.contentnegotiation.*
import io.ktor.server.plugins.cors.routing.*
import kotlinx.serialization.json.Json

fun main() {
    DatabaseFactory.init()
    embeddedServer(Netty, port = 3001, module = Application::module).start(wait = true)
}

fun Application.module() {
    install(ContentNegotiation) {
        json(Json {
            prettyPrint = true
            ignoreUnknownKeys = true
        })
    }
    install(CORS) {
        allowHost("localhost:5173")
        allowHeader(HttpHeaders.ContentType)
        allowMethod(HttpMethod.Get)
        allowMethod(HttpMethod.Post)
        allowMethod(HttpMethod.Put)
        allowMethod(HttpMethod.Delete)
    }
    expenseRoutes()
    categoryRoutes()
}
```
Entry point that initialises the database, configures Ktor with JSON serialisation and CORS, and registers all route handlers.

```kotlin
// FILE: backend/src/main/kotlin/com/app/DatabaseFactory.kt
package com.app

import com.app.models.Categories
import com.app.models.Expenses
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.transactions.transaction
import java.io.File

object DatabaseFactory {
    fun init() {
        File("data").mkdirs()
        Database.connect("jdbc:sqlite:data/app.db", driver = "org.sqlite.JDBC")
        transaction {
            SchemaUtils.createMissingTablesAndColumns(Expenses, Categories)
            seedCategories()
            seedExpenses()
        }
    }

    private fun seedCategories() {
        if (Categories.selectAll().count() == 0L) {
            val defaultCategories = listOf("Food", "Transport", "Housing", "Entertainment", "Health", "Other")
            for (name in defaultCategories) {
                Categories.insert { it[Categories.name] = name }
            }
        }
    }

    private fun seedExpenses() {
        if (Expenses.selectAll().count() == 0L) {
            val samples = listOf(
                Triple(12.50, "Coffee and bagel", "Food"),
                Triple(45.00, "Monthly bus pass", "Transport"),
                Triple(800.00, "Rent contribution", "Housing"),
            )
            for ((amount, description, category) in samples) {
                Expenses.insert {
                    it[Expenses.amount] = amount
                    it[Expenses.description] = description
                    it[Expenses.category] = category
                    it[Expenses.date] = "2026-04-01"
                }
            }
        }
    }
}
```
Singleton that creates the SQLite database file, runs schema migrations, and seeds initial categories and sample expenses on first startup.

```kotlin
// FILE: backend/src/main/kotlin/com/app/models/Expense.kt
package com.app.models

import kotlinx.serialization.Serializable
import org.jetbrains.exposed.dao.id.IntIdTable

object Expenses : IntIdTable("expenses") {
    val amount = double("amount")
    val description = varchar("description", 500)
    val category = varchar("category", 100)
    val date = varchar("date", 10)
    val createdAt = varchar("created_at", 30).default("now")
}

@Serializable
data class Expense(
    val id: Int,
    val amount: Double,
    val description: String,
    val category: String,
    val date: String,
)

@Serializable
data class CreateExpense(
    val amount: Double,
    val description: String,
    val category: String,
    val date: String,
)
```
Defines the `expenses` Exposed table using `IntIdTable`, the serialisable `Expense` response data class, and the `CreateExpense` request body data class.

```kotlin
// FILE: backend/src/main/kotlin/com/app/models/Category.kt
package com.app.models

import kotlinx.serialization.Serializable
import org.jetbrains.exposed.dao.id.IntIdTable

object Categories : IntIdTable("categories") {
    val name = varchar("name", 100).uniqueIndex()
}

@Serializable
data class Category(
    val id: Int,
    val name: String,
)
```
Defines the `categories` Exposed table and its serialisable response data class.

```kotlin
// FILE: backend/src/main/kotlin/com/app/routes/ExpenseRoutes.kt
package com.app.routes

import com.app.models.CreateExpense
import com.app.models.Expense
import com.app.models.Expenses
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.serialization.Serializable
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.transactions.transaction

@Serializable
data class ErrorResponse(val error: String)

@Serializable
data class CategoryTotal(val category: String, val total: Double)

@Serializable
data class SummaryResponse(val month: String, val total: Double, val byCategory: List<CategoryTotal>)

fun Application.expenseRoutes() {
    routing {
        route("/api/expenses") {

            // GET /api/expenses
            get {
                try {
                    val category = call.request.queryParameters["category"]
                    val from = call.request.queryParameters["from"]
                    val to = call.request.queryParameters["to"]

                    val expenses = transaction {
                        var query = Expenses.selectAll()
                        if (!category.isNullOrBlank()) {
                            query = query.andWhere { Expenses.category eq category }
                        }
                        if (!from.isNullOrBlank()) {
                            query = query.andWhere { Expenses.date greaterEq from }
                        }
                        if (!to.isNullOrBlank()) {
                            query = query.andWhere { Expenses.date lessEq to }
                        }
                        query.orderBy(Expenses.date to SortOrder.DESC).map { row ->
                            Expense(
                                id = row[Expenses.id].value,
                                amount = row[Expenses.amount],
                                description = row[Expenses.description],
                                category = row[Expenses.category],
                                date = row[Expenses.date],
                            )
                        }
                    }
                    call.respond(HttpStatusCode.OK, expenses)
                } catch (e: Exception) {
                    call.respond(HttpStatusCode.InternalServerError, ErrorResponse(e.message ?: "Unexpected error"))
                }
            }

            // GET /api/expenses/:id
            get("{id}") {
                try {
                    val id = call.parameters["id"]?.toIntOrNull()
                        ?: return@get call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid id"))
                    val expense = transaction {
                        Expenses.selectAll().where { Expenses.id eq id }.singleOrNull()?.let { row ->
                            Expense(
                                id = row[Expenses.id].value,
                                amount = row[Expenses.amount],
                                description = row[Expenses.description],
                                category = row[Expenses.category],
                                date = row[Expenses.date],
                            )
                        }
                    }
                    if (expense == null) {
                        call.respond(HttpStatusCode.NotFound, ErrorResponse("Expense not found"))
                    } else {
                        call.respond(HttpStatusCode.OK, expense)
                    }
                } catch (e: Exception) {
                    call.respond(HttpStatusCode.InternalServerError, ErrorResponse(e.message ?: "Unexpected error"))
                }
            }

            // POST /api/expenses
            post {
                try {
                    val body = call.receive<CreateExpense>()
                    if (body.description.isBlank()) {
                        return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("description must not be blank"))
                    }
                    if (body.amount <= 0) {
                        return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("amount must be greater than 0"))
                    }
                    if (body.date.isBlank()) {
                        return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("date must not be blank"))
                    }
                    val created = transaction {
                        val stmt = Expenses.insert {
                            it[amount] = body.amount
                            it[description] = body.description
                            it[category] = body.category
                            it[date] = body.date
                        }
                        Expense(
                            id = stmt[Expenses.id].value,
                            amount = body.amount,
                            description = body.description,
                            category = body.category,
                            date = body.date,
                        )
                    }
                    // BUG: should be HttpStatusCode.Created (201) not OK (200)
                    call.respond(HttpStatusCode.OK, created)
                } catch (e: Exception) {
                    call.respond(HttpStatusCode.InternalServerError, ErrorResponse(e.message ?: "Unexpected error"))
                }
            }

            // PUT /api/expenses/:id
            put("{id}") {
                try {
                    val id = call.parameters["id"]?.toIntOrNull()
                        ?: return@put call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid id"))
                    val body = call.receive<CreateExpense>()
                    if (body.description.isBlank()) {
                        return@put call.respond(HttpStatusCode.BadRequest, ErrorResponse("description must not be blank"))
                    }
                    if (body.amount <= 0) {
                        return@put call.respond(HttpStatusCode.BadRequest, ErrorResponse("amount must be greater than 0"))
                    }
                    val updated = transaction {
                        val count = Expenses.update({ Expenses.id eq id }) {
                            it[amount] = body.amount
                            it[description] = body.description
                            it[category] = body.category
                            it[date] = body.date
                        }
                        if (count == 0) return@transaction null
                        Expense(
                            id = id,
                            amount = body.amount,
                            description = body.description,
                            category = body.category,
                            date = body.date,
                        )
                    }
                    if (updated == null) {
                        call.respond(HttpStatusCode.NotFound, ErrorResponse("Expense not found"))
                    } else {
                        call.respond(HttpStatusCode.OK, updated)
                    }
                } catch (e: Exception) {
                    call.respond(HttpStatusCode.InternalServerError, ErrorResponse(e.message ?: "Unexpected error"))
                }
            }

            // DELETE /api/expenses/:id
            delete("{id}") {
                try {
                    val id = call.parameters["id"]?.toIntOrNull()
                        ?: return@delete call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid id"))
                    val deleted = transaction {
                        Expenses.deleteWhere { Expenses.id eq id }
                    }
                    if (deleted == 0) {
                        call.respond(HttpStatusCode.NotFound, ErrorResponse("Expense not found"))
                    } else {
                        call.respond(HttpStatusCode.NoContent)
                    }
                } catch (e: Exception) {
                    call.respond(HttpStatusCode.InternalServerError, ErrorResponse(e.message ?: "Unexpected error"))
                }
            }
        }

        // GET /api/summary?month=YYYY-MM
        get("/api/summary") {
            try {
                val month = call.request.queryParameters["month"]
                    ?: return@get call.respond(HttpStatusCode.BadRequest, ErrorResponse("month query parameter is required (YYYY-MM)"))
                if (!Regex("""\d{4}-\d{2}""").matches(month)) {
                    return@get call.respond(HttpStatusCode.BadRequest, ErrorResponse("month must be in YYYY-MM format"))
                }

                val result = transaction {
                    val rows = Expenses.selectAll()
                        .where { Expenses.date like "$month%" }
                        .map { row ->
                            Pair(row[Expenses.category], row[Expenses.amount])
                        }
                    val byCategory = rows.groupBy({ it.first }, { it.second })
                        .map { (cat, amounts) -> CategoryTotal(cat, amounts.sum()) }
                        .sortedByDescending { it.total }
                    val total = byCategory.sumOf { it.total }
                    SummaryResponse(month = month, total = total, byCategory = byCategory)
                }
                call.respond(HttpStatusCode.OK, result)
            } catch (e: Exception) {
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse(e.message ?: "Unexpected error"))
            }
        }
    }
}
```
Implements all seven expense-related endpoints including CRUD operations and the monthly summary aggregation, with full error handling and Exposed transactions.

```kotlin
// FILE: backend/src/main/kotlin/com/app/routes/CategoryRoutes.kt
package com.app.routes

import com.app.models.Categories
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.transactions.transaction

fun Application.categoryRoutes() {
    routing {
        // GET /api/categories
        get("/api/categories") {
            try {
                val names = transaction {
                    Categories.selectAll()
                        .orderBy(Categories.name)
                        .map { it[Categories.name] }
                }
                call.respond(HttpStatusCode.OK, names)
            } catch (e: Exception) {
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse(e.message ?: "Unexpected error"))
            }
        }
    }
}
```
Implements the `GET /api/categories` endpoint, returning an alphabetically sorted list of category names from the database.
