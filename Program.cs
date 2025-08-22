namespace TestProject
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            builder.Services.AddControllers();

            builder.Services.AddScoped<IDirectoryService, DirectoryService>();

            var app = builder.Build();

            app.UseHttpsRedirection();

            app.UseStaticFiles();

            app.MapControllers();

            app.UseDeveloperExceptionPage();

            app.Run();
        }
    }
}