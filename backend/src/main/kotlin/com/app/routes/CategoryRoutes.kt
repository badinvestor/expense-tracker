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
