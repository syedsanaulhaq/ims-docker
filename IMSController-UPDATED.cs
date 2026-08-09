using DigitalSystem.Helpers;
using ECPPMU.Web.Areas.InventoryMIS.Model;
using ECPPMU.Web.Areas.VCRPortal.Controllers;
using ECPPMU.Web.Areas.VCRPortal.Model;
using ECPPMU.Web.CommonModels;
using ECPPMU.Web.Helper;
using ECPPMU.Web.Models;
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
            // CHANGE 1: Get UserName instead of CNIC
            string username = HttpContext.Session.GetString("UserName"); // Changed from CNIC
            string password = HttpContext.Session.GetString("Pwd");
            string imsUrl = _configuration["IMSUrl"];

            if (string.IsNullOrEmpty(username) || string.IsNullOrEmpty(password))
            {
                return BadRequest("Session expired. Please login again.");
            }

            try
            {
                // CHANGE 2: Use the new API_HelperIMS with AuthenticateAsync method
                var apiHelper = new API_HelperIMS(imsUrl);
                var result = await apiHelper.AuthenticateAsync(username, password);

                // CHANGE 3: Check success field in response
                if (result["success"]?.Value<bool>() == true)
                {
                    var token = result["Token"]?.ToString();
                    
                    if (!string.IsNullOrEmpty(token))
                    {
                        // CHANGE 4: Redirect to IMS with token
                        return Redirect($"{imsUrl}/sso-login?token={token}");
                    }
                }

                // CHANGE 5: Better error handling
                var errorMessage = result["message"]?.ToString() ?? "Authentication failed";
                return Unauthorized(errorMessage);
            }
            catch (Exception ex)
            {
                // Log the error
                return StatusCode(500, $"Error connecting to IMS: {ex.Message}");
            }
        }
    }
    
    public class TokenResponse
    {
        public string Token { get; set; }
    }
}
