using Microsoft.AspNetCore.Mvc;
using GiftGPT.Models;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using System.Buffers;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using backend.Models;
using System.Security.Claims;

namespace GiftGPT.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ChatController : ControllerBase
    {
        private readonly ILogger<ChatController> _logger;
        private readonly IMongoDatabase _database;

        public ChatController(ILogger<ChatController> logger, IMongoDatabase database)
        {
            _logger = logger;
            _database = database;
        }

        [HttpPost("text-sync")]
        public async Task<IActionResult> Post([FromBody] ChatRequest request)
        {
            _logger.LogInformation("Received text-sync request: {Message}", request.Message);
            if (string.IsNullOrEmpty(request.Message) || string.IsNullOrEmpty(request.ApiKey))
                return BadRequest(new { error = "Missing required fields." });

            string responseText = "[Model response placeholder]";

            // Only support OpenAI gpt-4o audio
            using var client = new HttpClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", request.ApiKey);
            var payload = new
            {
                model = "gpt-4o",
                messages = new[] { new { role = "user", content = request.Message } }
            };
            var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
            using var openAiResponse = await client.PostAsync("https://api.openai.com/v1/chat/completions", content);
            var openAiJson = await openAiResponse.Content.ReadAsStringAsync();
            // TODO: Parse openAiJson to extract the actual response text
            responseText = openAiJson;

            _logger.LogInformation("OpenAI response: {Response}", responseText);
            return Ok(new ChatResponse { Text = responseText, AudioCapable = true });
        }

        [HttpPost("text-stream")]
        public async Task PostStream([FromBody] ChatRequest request)
        {
            _logger.LogInformation("Received text-stream request: {Message}", request.Message);
            if (string.IsNullOrEmpty(request.Message) || string.IsNullOrEmpty(request.ApiKey))
            {
                Response.StatusCode = 400;
                await Response.WriteAsync("Missing required fields.");
                _logger.LogWarning("Missing required fields in text-stream request");
                return;
            }

            Response.ContentType = "text/event-stream";
            using var client = new HttpClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", request.ApiKey);
            var payload = new
            {
                model = "gpt-4o",
                messages = new[] { new { role = "user", content = request.Message } },
                stream = true
            };
            var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
            _logger.LogInformation("Sending request to OpenAI chat/completions endpoint");
            using var openAiResponse = await client.PostAsync("https://api.openai.com/v1/chat/completions", content);
            _logger.LogInformation("OpenAI response status: {StatusCode}", openAiResponse.StatusCode);
            if (!openAiResponse.IsSuccessStatusCode)
            {
                var errorContent = await openAiResponse.Content.ReadAsStringAsync();
                _logger.LogError("OpenAI error response: {Error}", errorContent);
                Response.StatusCode = (int)openAiResponse.StatusCode;
                await Response.WriteAsync(errorContent);
                return;
            }
            var stream = await openAiResponse.Content.ReadAsStreamAsync();
            using var reader = new StreamReader(stream);
            int lineCount = 0;
            while (!reader.EndOfStream)
            {
                var line = await reader.ReadLineAsync();
                lineCount++;
                _logger.LogInformation("[Line {LineNum}] Raw line from OpenAI: {Line}", lineCount, line);
                if (string.IsNullOrWhiteSpace(line) || !line.StartsWith("data:")) continue;
                var json = line.Substring(5).Trim();
                if (json == "[DONE]") break;
                try
                {
                    using var doc = JsonDocument.Parse(json);
                    var contentToken = doc.RootElement
                        .GetProperty("choices")[0]
                        .GetProperty("delta")
                        .TryGetProperty("content", out var contentElem) ? contentElem.GetString() : null;
                    if (!string.IsNullOrEmpty(contentToken))
                    {
                        await Response.WriteAsync(contentToken);
                        await Response.Body.FlushAsync();
                        _logger.LogInformation("Streamed token: {Token}", contentToken);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error parsing OpenAI stream response. Raw JSON: {Json}", json);
                }
            }
            _logger.LogInformation("Completed text-stream request");
        }

        [HttpPost("audio-stream")]
        public async Task AudioStream()
        {
            _logger.LogInformation("Received audio-stream request");
            if (!Request.HasFormContentType)
            {
                Response.StatusCode = 400;
                await Response.WriteAsync("Content-Type must be multipart/form-data");
                _logger.LogWarning("Missing multipart/form-data in audio-stream request");
                return;
            }
            var form = await Request.ReadFormAsync();
            var apiKey = form["apiKey"].ToString();
            if (string.IsNullOrEmpty(apiKey))
            {
                Response.StatusCode = 400;
                await Response.WriteAsync("Missing API key");
                _logger.LogWarning("Missing API key in audio-stream request");
                return;
            }
            var audioFile = form.Files["audio"];
            var userText = form["text"].ToString(); // Optional text message
            if (audioFile == null && string.IsNullOrEmpty(userText))
            {
                Response.StatusCode = 400;
                await Response.WriteAsync("Missing audio or text input");
                _logger.LogWarning("Missing audio or text input in audio-stream request");
                return;
            }

            using var client = new HttpClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
            client.DefaultRequestHeaders.Add("OpenAI-Version", "2024-12-17");

            var openAiRequest = new MultipartFormDataContent();
            if (audioFile != null)
            {
                var stream = audioFile.OpenReadStream();
                openAiRequest.Add(new StreamContent(stream), "audio", audioFile.FileName);
            }
            if (!string.IsNullOrEmpty(userText))
            {
                openAiRequest.Add(new StringContent(userText), "text");
            }
            // Add required parameters for OpenAI audio chat
            openAiRequest.Add(new StringContent("gpt-4o"), "model");
            openAiRequest.Add(new StringContent("true"), "stream");
            // You can add more fields as needed (e.g., system prompt, etc.)

            var openAiResponse = await client.PostAsync("https://api.openai.com/v1/audio/chat/completions", openAiRequest);
            _logger.LogInformation("OpenAI audio response status: {StatusCode}", openAiResponse.StatusCode);
            Response.ContentType = openAiResponse.Content.Headers.ContentType?.ToString() ?? "audio/mpeg";
            using var responseStream = await openAiResponse.Content.ReadAsStreamAsync();
            await responseStream.CopyToAsync(Response.Body);
            await Response.Body.FlushAsync();
            _logger.LogInformation("Completed audio-stream request");
        }

        [HttpGet("sessions")]
        public async Task<IActionResult> GetUserChatSessions()
        {
            // TODO: Replace with actual user id from authentication
            var userId = "demo-user-id";
            var collection = _database.GetCollection<ChatSession>("ChatSessions");
            var sessions = await collection.Find(s => s.UserId == userId)
                .Project(s => new { s.Id, s.Summary, s.CreatedAt })
                .SortByDescending(s => s.CreatedAt)
                .ToListAsync();
            return Ok(sessions);
        }

        [HttpPost("session")]
        public async Task<IActionResult> SaveChatSession([FromBody] ChatSession session)
        {
            // TODO: Replace with actual user id from authentication
            session.UserId = "demo-user-id";
            session.CreatedAt = DateTime.UtcNow;
            if (string.IsNullOrWhiteSpace(session.Summary))
            {
                // Generate a summary from the first user message, or fallback to title
                var firstUserMsg = session.Messages?.FirstOrDefault(m => m.Role == "user")?.Content;
                session.Summary = !string.IsNullOrWhiteSpace(firstUserMsg)
                    ? (firstUserMsg.Length > 40 ? firstUserMsg.Substring(0, 40) + "..." : firstUserMsg)
                    : session.Title;
            }
            var collection = _database.GetCollection<ChatSession>("ChatSessions");
            await collection.InsertOneAsync(session);
            return Ok(new { session.Id, session.Summary, session.CreatedAt });
        }

        [HttpPost("session/{id}/favourite")]
        public async Task<IActionResult> SetFavourite(string id, [FromBody] dynamic body)
        {
            var isFavourite = (bool)body.isFavourite;
            var collection = _database.GetCollection<ChatSession>("ChatSessions");
            var update = Builders<ChatSession>.Update.Set(s => s.IsFavourite, isFavourite);
            var result = await collection.UpdateOneAsync(s => s.Id == id, update);
            if (result.MatchedCount == 0) return NotFound();
            return Ok();
        }

        [HttpGet("session/{id}")]
        public async Task<IActionResult> GetSession(string id)
        {
            var collection = _database.GetCollection<ChatSession>("ChatSessions");
            var session = await collection.Find(s => s.Id == id).FirstOrDefaultAsync();
            if (session == null) return NotFound();
            return Ok(session);
        }
    }
}
