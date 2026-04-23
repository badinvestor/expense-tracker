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
