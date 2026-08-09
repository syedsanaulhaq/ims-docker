using Newtonsoft.Json.Linq;
using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;

namespace DigitalSystem.Helpers
{
    public class API_HelperIMS
    {
        private readonly string _baseUrl;
        private readonly HttpClient _httpClient;

        public API_HelperIMS(string baseUrl)
        {
            _baseUrl = baseUrl?.TrimEnd('/') ?? throw new ArgumentNullException(nameof(baseUrl));
            _httpClient = new HttpClient
            {
                Timeout = TimeSpan.FromSeconds(30)
            };
        }

        public async Task<JObject> AuthenticateAsync(string username, string password)
        {
            try
            {
                var requestBody = new JObject
                {
                    ["UserName"] = username,
                    ["Password"] = password
                };

                var content = new StringContent(
                    requestBody.ToString(),
                    Encoding.UTF8,
                    "application/json"
                );

                var response = await _httpClient.PostAsync(
                    $"{_baseUrl}/api/auth/ds-authenticate",
                    content
                );

                var responseContent = await response.Content.ReadAsStringAsync();

                // Check if response is JSON before parsing
                if (string.IsNullOrWhiteSpace(responseContent))
                {
                    return new JObject
                    {
                        ["success"] = false,
                        ["message"] = $"Empty response from IMS server (Status: {response.StatusCode})"
                    };
                }

                var trimmedContent = responseContent.Trim();

                // Check if response starts with { or [ (valid JSON)
                if (trimmedContent.StartsWith("{") || trimmedContent.StartsWith("["))
                {
                    try
                    {
                        var result = JObject.Parse(responseContent);
                        
                        // Add HTTP status code to result for debugging
                        result["httpStatusCode"] = (int)response.StatusCode;
                        
                        return result;
                    }
                    catch (Exception parseEx)
                    {
                        return new JObject
                        {
                            ["success"] = false,
                            ["message"] = $"Invalid JSON response: {parseEx.Message}",
                            ["rawResponse"] = responseContent.Substring(0, Math.Min(500, responseContent.Length))
                        };
                    }
                }
                else
                {
                    // Response is HTML or plain text (likely an error page)
                    return new JObject
                    {
                        ["success"] = false,
                        ["message"] = $"IMS server returned non-JSON response (Status: {response.StatusCode})",
                        ["rawResponse"] = responseContent.Substring(0, Math.Min(500, responseContent.Length)),
                        ["httpStatusCode"] = (int)response.StatusCode
                    };
                }
            }
            catch (HttpRequestException httpEx)
            {
                return new JObject
                {
                    ["success"] = false,
                    ["message"] = $"Connection error: {httpEx.Message}",
                    ["error"] = "NETWORK_ERROR"
                };
            }
            catch (TaskCanceledException)
            {
                return new JObject
                {
                    ["success"] = false,
                    ["message"] = "Request timeout - IMS server did not respond in time",
                    ["error"] = "TIMEOUT_ERROR"
                };
            }
            catch (Exception ex)
            {
                return new JObject
                {
                    ["success"] = false,
                    ["message"] = $"Unexpected error: {ex.Message}",
                    ["error"] = "UNKNOWN_ERROR"
                };
            }
        }

        public void Dispose()
        {
            _httpClient?.Dispose();
        }
    }
}
