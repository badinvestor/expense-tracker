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
