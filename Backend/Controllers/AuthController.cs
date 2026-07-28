using Google.Apis.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IConfiguration _configuration;

        public AuthController(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        [HttpPost("google")]
        public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginRequest request)
        {
            try
            {
                var payload = await GoogleJsonWebSignature.ValidateAsync(request.IdToken);

                var token = GenerateJwtToken(payload);

                return Ok(new { Token = token });
            }
            catch (InvalidJwtException)
            {
                return Unauthorized("Wrong Google token.");
            }
        }

        private string GenerateJwtToken(GoogleJsonWebSignature.Payload payload)
        {
            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]!));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
        new Claim(JwtRegisteredClaimNames.Sub, payload.Subject),
        new Claim(JwtRegisteredClaimNames.Email, payload.Email),
        new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
        
        new Claim("name", payload.Name ?? payload.GivenName ?? "Użytkownik"),
        new Claim("picture", payload.Picture ?? "")
    };

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddHours(2),
                signingCredentials: credentials);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        [HttpGet("me")]
        [Authorize]
        public IActionResult GetMe()
        {
            var name = User.FindFirst(ClaimTypes.Name)?.Value ?? User.FindFirst("name")?.Value;
            var email = User.FindFirst(ClaimTypes.Email)?.Value ?? User.FindFirst("email")?.Value;

            var photoUrl = User.FindFirst("picture")?.Value ?? User.FindFirst("photoUrl")?.Value;

            return Ok(new
            {
                firstName = name,
                email = email,
                photoUrl = photoUrl
            });
        }
    }

    public class GoogleLoginRequest
    {
        public string IdToken { get; set; } = string.Empty;
    }
}