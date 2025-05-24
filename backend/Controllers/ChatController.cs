using Microsoft.AspNetCore.Mvc;
using GiftGPT.Models;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using System.Buffers;

namespace GiftGPT.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ChatController : ControllerBase
    {
        [HttpPost]
        public async Task<IActionResult> Post([FromBody] ChatRequest request)
        {
            if (string.IsNullOrEmpty(request.Message) || string.IsNullOrEmpty(request.ApiKey))
                return BadRequest(new { error = "Missing required fields." });

            string responseText = "[Model response placeholder]";

            // Only support OpenAI gpt-4o audio
            using var client = new HttpClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", request.ApiKey);
            client.DefaultRequestHeaders.Add("OpenAI-Version", "2024-12-17");
            var payload = new
            {
                model = "gpt-4o-audio",
                messages = new[] { new { role = "user", content = request.Message } }
            };
            var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
            var openAiResponse = await client.PostAsync("https://api.openai.com/v1/chat/completions", content);
            var openAiJson = await openAiResponse.Content.ReadAsStringAsync();
            // TODO: Parse openAiJson to extract the actual response text
            responseText = openAiJson;

            return Ok(new ChatResponse { Text = responseText, AudioCapable = true });
        }

        [HttpPost]
        public async Task PostStream([FromBody] ChatRequest request)
        {
            if (string.IsNullOrEmpty(request.Message) || string.IsNullOrEmpty(request.ApiKey))
            {
                Response.StatusCode = 400;
                await Response.WriteAsync("Missing required fields.");
                return;
            }

            Response.ContentType = "text/event-stream";
            // Only support OpenAI gpt-4o audio
            using var client = new HttpClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", request.ApiKey);
            client.DefaultRequestHeaders.Add("OpenAI-Version", "2024-12-17");
            var payload = new
            {
                model = "gpt-4o-audio",
                messages = new[] { new { role = "user", content = request.Message } },
                stream = true
            };
            var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
            using var openAiResponse = await client.PostAsync("https://api.openai.com/v1/chat/completions", content, HttpCompletionOption.ResponseHeadersRead);
            var stream = await openAiResponse.Content.ReadAsStreamAsync();
            using var reader = new StreamReader(stream);
            while (!reader.EndOfStream)
            {
                var line = await reader.ReadLineAsync();
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
                    }
                }
                catch { }
            }
        }

        [HttpPost("audio-stream")]
        public async Task AudioStream()
        {
            if (!Request.HasFormContentType)
            {
                Response.StatusCode = 400;
                await Response.WriteAsync("Content-Type must be multipart/form-data");
                return;
            }
            var form = await Request.ReadFormAsync();
            var apiKey = form["apiKey"].ToString();
            if (string.IsNullOrEmpty(apiKey))
            {
                Response.StatusCode = 400;
                await Response.WriteAsync("Missing API key");
                return;
            }
            var audioFile = form.Files["audio"];
            var userText = form["text"].ToString(); // Optional text message
            if (audioFile == null && string.IsNullOrEmpty(userText))
            {
                Response.StatusCode = 400;
                await Response.WriteAsync("Missing audio or text input");
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

            var openAiResponse = await client.PostAsync("https://api.openai.com/v1/audio/chat/completions", openAiRequest, HttpCompletionOption.ResponseHeadersRead);
            Response.ContentType = openAiResponse.Content.Headers.ContentType?.ToString() ?? "audio/mpeg";
            using var responseStream = await openAiResponse.Content.ReadAsStreamAsync();
            await responseStream.CopyToAsync(Response.Body);
            await Response.Body.FlushAsync();
        }
    }
}
