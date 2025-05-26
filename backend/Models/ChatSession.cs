using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System;
using System.Collections.Generic;

namespace backend.Models
{
    public class ChatSession
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = string.Empty;

        [BsonElement("userId")]
        public string UserId { get; set; } = string.Empty;

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [BsonElement("title")]
        public string Title { get; set; } = string.Empty;

        [BsonElement("messages")]
        public List<ChatMessage> Messages { get; set; } = new List<ChatMessage>();

        [BsonElement("isFavourite")]
        public bool IsFavourite { get; set; } = false;

        [BsonElement("summary")]
        public string Summary { get; set; } = string.Empty;
    }

    public class ChatMessage
    {
        [BsonElement("role")]
        public string Role { get; set; } = string.Empty; // "user" or "llm"

        [BsonElement("content")]
        public string Content { get; set; } = string.Empty;

        [BsonElement("timestamp")]
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }
}
