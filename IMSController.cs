using ECPPMU.Web.Areas.InventoryMIS.Model;
using ECPPMU.Web.Areas.VCRPortal.Controllers;
using ECPPMU.Web.Areas.VCRPortal.Model;
using ECPPMU.Web.CommonModels;
using ECPPMU.Web.Helper;
using ECPPMU.Web.Models;
using DigitalSystem.Helpers;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using NToastNotify;
using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Security.Policy;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace ECPPMU.Web.Areas.InventoryMIS.Controllers
{
    [Area("InventoryMIS")]
    [ServiceFilter(typeof(SessionExpireFilterAttribute))]
    public class IMSController : Controller
    {
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly IWebHostEnvironment webHostEnvironment;
        private readonly IToastNotification _toastNotification;
        private readonly ILogger<MetaDataController> _logger;
        private readonly IConfiguration _configuration;

        public IMSController(IConfiguration configuration,IHttpContextAccessor httpContextAccessor, IWebHostEnvironment _webHostEnvironment)
        {
            _httpContextAccessor = httpContextAccessor;
            webHostEnvironment = _webHostEnvironment;
            _configuration = configuration;

            _httpContextAccessor.HttpContext.Session.SetString("ProjectID", "24");
        }
        public IActionResult Index()
        {
            return View();
        }

        public IActionResult Multiview()
        {
            return View();
        }
        public IActionResult Multiviews()
        {
            return View();
        }
        [ServiceFilter(typeof(SessionExpireFilterAttribute))]
        public async Task<IActionResult> GoToIMS()
        {
            try
            {
                // Get username from session (using CNIC field which stores username)
                string username = HttpContext.Session.GetString("CNIC");
                string password = HttpContext.Session.GetString("Pwd");
                string imsUrl = _configuration["IMSUrl"];

                if (string.IsNullOrEmpty(username) || string.IsNullOrEmpty(password))
                {
                    return BadRequest("Session expired. Please login again.");
                }

                // Call IMS authentication API using the new helper method
                var apiHelper = new API_HelperIMS(imsUrl);
                var result = await apiHelper.AuthenticateAsync(username, password);

                // Check if authentication was successful
                if (result["success"]?.Value<bool>() == true)
                {
                    var token = result["Token"]?.ToString();

                    if (!string.IsNullOrEmpty(token))
                    {
                        // Redirect to IMS with the token
                        return Redirect($"{imsUrl}/sso-login?token={token}");
                    }
                }

                // Get error message from response
                var errorMessage = result["message"]?.ToString() ?? "Authentication failed";
                return Unauthorized(errorMessage);
            }
            catch (Exception ex)
            {
                // Log the error if logger is available
                return StatusCode(500, $"Error connecting to IMS: {ex.Message}");
            }
        }

    }
    public class TokenResponse
    {
        public string Token { get; set; }
    }

}
