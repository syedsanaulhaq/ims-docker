using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace DigitalSystem.Helpers
{
    public class API_HelperIMS
    {
        private readonly string _baseUrl;
        private static readonly HttpClient _httpClient = new HttpClient
        {
            Timeout = TimeSpan.FromSeconds(30)
        };

        public API_HelperIMS(string baseUrl)
        {
            _baseUrl = baseUrl?.TrimEnd('/');
            
            if (string.IsNullOrEmpty(_baseUrl))
            {
                throw new ArgumentException("Base URL cannot be null or empty", nameof(baseUrl));
            }
        }

        /// <summary>
        /// Authenticates user with IMS backend and returns JWT token
        /// </summary>
        /// <param name="username">User's username or CNIC</param>
        /// <param name="password">User's password</param>
        /// <returns>JWT token if successful, null if failed</returns>
        public async Task<string> AuthenticateAsync(string username, string password)
        {
            try
            {
                if (string.IsNullOrEmpty(username) || string.IsNullOrEmpty(password))
                {
                    Console.WriteLine("❌ Username or password is empty");
                    return null;
                }

                // Construct the full API URL
                var apiUrl = $"{_baseUrl}/api/auth/ds-authenticate";
                Console.WriteLine($"🔗 Calling IMS API: {apiUrl}");

                // Prepare request body
                var requestBody = new
                {
                    UserName = username,
                    Password = password
                };

                var jsonContent = JsonSerializer.Serialize(requestBody);
                var httpContent = new StringContent(jsonContent, Encoding.UTF8, "application/json");

                Console.WriteLine($"📤 Sending authentication request for user: {username}");

                // Make POST request to IMS API
                var response = await _httpClient.PostAsync(apiUrl, httpContent);
                var responseContent = await response.Content.ReadAsStringAsync();

                Console.WriteLine($"📥 Response Status: {response.StatusCode}");
                Console.WriteLine($"📥 Response Content: {responseContent}");

                if (response.IsSuccessStatusCode)
                {
                    // Parse JSON response
                    var jsonResponse = JsonSerializer.Deserialize<JsonElement>(responseContent);
                    
                    // Check if authentication was successful
                    if (jsonResponse.TryGetProperty("success", out JsonElement successElement) 
                        && successElement.GetBoolean())
                    {
                        // Extract token
                        if (jsonResponse.TryGetProperty("Token", out JsonElement tokenElement))
                        {
                            var token = tokenElement.GetString();
                            Console.WriteLine($"✅ Authentication successful! Token received (length: {token?.Length ?? 0})");
                            return token;
                        }
                    }

                    Console.WriteLine("❌ Authentication failed - success was false or token not found");
                    return null;
                }
                else
                {
                    Console.WriteLine($"❌ API request failed with status code: {response.StatusCode}");
                    Console.WriteLine($"   Response: {responseContent}");
                    return null;
                }
            }
            catch (HttpRequestException ex)
            {
                Console.WriteLine($"❌ Network error during authentication: {ex.Message}");
                return null;
            }
            catch (TaskCanceledException ex)
            {
                Console.WriteLine($"❌ Request timeout during authentication: {ex.Message}");
                return null;
            }
            catch (JsonException ex)
            {
                Console.WriteLine($"❌ JSON parsing error: {ex.Message}");
                return null;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Unexpected error during authentication: {ex.Message}");
                Console.WriteLine($"   Stack Trace: {ex.StackTrace}");
                return null;
            }
        }
    }
}
