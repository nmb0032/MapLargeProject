
using TestProject.Models;

public class DirectoryService : IDirectoryService
{
    private readonly string _rootDirectory;

    public DirectoryService(IConfiguration configuration)
    {
        _rootDirectory = configuration.GetValue<string>("FileBrowserSettings:RootDirectory");

        if (string.IsNullOrEmpty(_rootDirectory) || !Directory.Exists(_rootDirectory))
        {
            throw new ArgumentException("Invalid root directory specified in configuration.");
        }
    }

    public DirectoryContents SearchDirectoryContents(string? subPath, string searchTerm)
    {
        var cleanSubPath = subPath != null ? Path.GetFullPath(Path.Combine(_rootDirectory, subPath)) : _rootDirectory;

        if (!cleanSubPath.StartsWith(_rootDirectory))
        {
            throw new UnauthorizedAccessException("Access to the specified path is denied.");
        }

        var directoryInfo = new DirectoryInfo(cleanSubPath);
        var items = new List<FileSystemItem>();

        foreach (var dir in directoryInfo.GetDirectories())
        {
            if (dir.Name.Contains(searchTerm, StringComparison.OrdinalIgnoreCase))
            {
                items.Add(new FileSystemItem
                {
                    Name = dir.Name,
                    Size = 0,
                    IsDirectory = true
                });
            }
        }

        foreach (var file in directoryInfo.GetFiles())
        {
            if (file.Name.Contains(searchTerm, StringComparison.OrdinalIgnoreCase))
            {
                items.Add(new FileSystemItem
                {
                    Name = file.Name,
                    Size = file.Length,
                    IsDirectory = false
                });
            }
        }

        return new DirectoryContents
        {
            Items = items,
            TotalCount = items.Count,
            TotalSize = items.Sum(i => i.Size)
        };
    }

    public DirectoryContents GetDirectoryContents(string? subPath)
    {
        var cleanSubPath = subPath != null ? Path.GetFullPath(Path.Combine(_rootDirectory, subPath)) : _rootDirectory;

        if (!cleanSubPath.StartsWith(_rootDirectory))
        {
            throw new UnauthorizedAccessException("Access to the specified path is denied.");
        }

        var directoryInfo = new DirectoryInfo(cleanSubPath);
        var items = new List<FileSystemItem>();

        foreach (var dir in directoryInfo.GetDirectories())
        {
            items.Add(new FileSystemItem
            {
                Name = dir.Name,
                Size = 0,
                IsDirectory = true
            });
        }

        foreach (var file in directoryInfo.GetFiles())
        {
            items.Add(new FileSystemItem
            {
                Name = file.Name,
                Size = file.Length,
                IsDirectory = false
            });
        }

        return new DirectoryContents
        {
            Items = items,
            TotalCount = items.Count,
            TotalSize = items.Sum(i => i.Size)
        };
    }

    public FileInfo GetFileForDownload(string subPath)
    {
        string fullPath = Path.Combine(_rootDirectory, subPath);

        if (!fullPath.StartsWith(_rootDirectory, StringComparison.OrdinalIgnoreCase))
        {
            throw new UnauthorizedAccessException("Access to the specified path is denied.");
        }

        if (!File.Exists(fullPath))
        {
            throw new FileNotFoundException("The specified file does not exist.", fullPath);
        }

        return new FileInfo(fullPath);
    }

    public string GetSavePath(string? subPath, string fileName)
    {
        if (string.IsNullOrEmpty(subPath) || subPath == "/")
        {
            return Path.Combine(_rootDirectory, fileName);
        }

        return Path.Combine(_rootDirectory, subPath, fileName);
    }
}