using System.Net;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.StaticFiles;

[ApiController]
[Route("api/[controller]")]
public class DirectoryController : ControllerBase
{
    private readonly IDirectoryService _directoryService;
    private readonly ILogger<DirectoryController> _logger;

    public DirectoryController(IDirectoryService directoryService, ILogger<DirectoryController> logger)
    {
        _directoryService = directoryService;
        _logger = logger;
    }

    [HttpGet("search")]
    public IActionResult Search(string? path, string searchTerm)
    {
        try
        {
            if (!string.IsNullOrEmpty(path))
            {
                path = WebUtility.UrlDecode(path);
            }

            var searchResults = _directoryService.SearchDirectoryContents(path, searchTerm);
            return Ok(searchResults);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching directory: {Path}", path);
            return StatusCode(500, "An error occurred while searching the directory.");
        }
    }

    [HttpGet("browse")]
    public IActionResult Browse(string? path)
    {
        try
        {
            if (!string.IsNullOrEmpty(path))
            {
                path = WebUtility.UrlDecode(path);
            }

            var contents = _directoryService.GetDirectoryContents(path);
            return Ok(contents);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error browsing directory: {Path}", path);
            return StatusCode(500, "An error occurred while accessing the directory.");
        }
    }

    [HttpPost("upload")]
    public async Task<IActionResult> Upload([FromForm] IFormFile file, [FromForm] string? path)
    {
        try
        {
            // Check if the file is valid
            if (file == null || file.Length == 0)
            {
                return BadRequest("No file was uploaded.");
            }

            // Decode the path from the client
            var decodedPath = WebUtility.UrlDecode(path);

            // Construct the full path where the file will be saved.
            // Using Path.Combine is a best practice for cross-platform compatibility.
            _logger.LogInformation("Decoded path: {DecodedPath}", decodedPath);
            var savePath = _directoryService.GetSavePath(decodedPath, file.FileName);

            // Log the path to verify
            _logger.LogInformation("Attempting to save file to: {SavePath}", savePath);

            // Create the directory if it doesn't exist to avoid errors.
            var directory = Path.GetDirectoryName(savePath);
            if (!string.IsNullOrEmpty(directory) && !Directory.Exists(directory))
            {
                Directory.CreateDirectory(directory);
            }

            // Use a FileStream to save the file asynchronously
            using (var stream = new FileStream(savePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            return Ok(new { message = "File uploaded successfully." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading file to path: {Path}", path);
            return StatusCode(500, "An error occurred while uploading the file.");
        }
    }


    [HttpGet("download")]
    public IActionResult Download(string path)
    {
        try
        {
            string decodedPath = WebUtility.UrlDecode(path);

            var fileInfo = _directoryService.GetFileForDownload(decodedPath);

            var provider = new FileExtensionContentTypeProvider();

            // C# cool declare and pass variable syntax
            if (!provider.TryGetContentType(fileInfo.Name, out var contentType))
            {
                contentType = "application/octet-stream";
            }

            return PhysicalFile(fileInfo.FullName, contentType, fileInfo.Name);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error downloading file: {Path}", path);
            return StatusCode(500, "An error occurred while downloading the file.");
        }
    }

    [HttpDelete("delete")]
    public IActionResult Delete(string path)
    {
        try
        {
            string decodedPath = WebUtility.UrlDecode(path);
            _directoryService.DeleteFile(decodedPath);
            return Ok(new { message = "File deleted successfully." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting file: {Path}", path);
            return StatusCode(500, "An error occurred while deleting the file.");
        }
    }

}