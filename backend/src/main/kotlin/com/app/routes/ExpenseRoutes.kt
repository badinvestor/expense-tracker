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
