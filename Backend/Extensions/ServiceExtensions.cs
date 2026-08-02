using Chronote.Api.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

namespace Backend.Extensions;

public static class ServiceExtensions
{
    public static void AddApplicationServices(this IServiceCollection services, IConfiguration config)
    {
        services.AddControllers();
        services.AddOpenApi();

        services.AddDbContext<ApplicationDbContext>(options =>
            options.UseNpgsql(config.GetConnectionString("DefaultConnection")));

        services.AddCors(options =>
        {
            options.AddPolicy("AllowAngularApp", policy =>
            {
                policy.WithOrigins("http://localhost:4200", "http://127.0.0.1:4200", "https://thalruk-chronote.vercel.app")
                   .AllowAnyHeader()
                   .AllowAnyMethod();
            });
        });
    }

    public static void AddIdentityServices(this IServiceCollection services, IConfiguration config)
    {
        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = config["Jwt:Issuer"],
                    ValidAudience = config["Jwt:Audience"],
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Key"]!))
                };
            });

        services.AddAuthorization();
    }
}