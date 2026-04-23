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
