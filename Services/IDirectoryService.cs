
using TestProject.Models;

public interface IDirectoryService
{
    DirectoryContents SearchDirectoryContents(string? subPath, string searchTerm);
    DirectoryContents GetDirectoryContents(string? path);
    FileInfo GetFileForDownload(string path);

    string GetSavePath(string? subPath, string fileName);
}