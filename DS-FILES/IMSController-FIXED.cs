using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace DigitalSystem.Controllers
{
    public class IMSController : Controller
    {
        private readonly IConfiguration _configuration;

        public IMSController(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        [HttpGet]
        public async Task<IActionResult> GoToIMS()
        {
            try
            {
                // Get username from session
                // Adjust this based on your actual session variable name
                var username = HttpContext.Session.GetString("UserName") 
                            ?? HttpContext.Session.GetString("CNIC")
                            ?? HttpContext.Session.GetString("Username");
                
                if (string.IsNullOrEmpty(username))
                {
                    TempData["Error"] = "User session not found. Please login again.";
                    return RedirectToAction("Login", "Account");
                }

                // Get separate URLs for API (backend) and frontend
                string imsApiUrl = _configuration["IMSApiUrl"];   // http://172.20.150.34:3001 (backend)
                string imsUrl = _configuration["IMSUrl"];          // http://172.20.150.34 (frontend)
                
                if (string.IsNullOrEmpty(imsApiUrl) || string.IsNullOrEmpty(imsUrl))
                {
                    TempData["Error"] = "IMS configuration not found. Please contact administrator.";
                    return RedirectToAction("Index", "Home");
                }

                // Password for authentication - you can modify this logic as needed
                string password = "P@ssword@1";
                
                // Call IMS authentication API using backend URL (port 3001)
                var apiHelper = new API_HelperIMS(imsApiUrl);
                var token = await apiHelper.AuthenticateAsync(username, password);
                
                if (!string.IsNullOrEmpty(token))
                {
                    // Redirect to IMS frontend (port 80) with SSO token
                    return Redirect($"{imsUrl}/sso-login?token={token}");
                }
                else
                {
                    TempData["Error"] = "IMS authentication failed. Invalid username or password.";
                    return RedirectToAction("Index", "Home");
                }
            }
            catch (Exception ex)
            {
                TempData["Error"] = $"Error connecting to IMS: {ex.Message}";
                return RedirectToAction("Index", "Home");
            }
        }
    }
}
