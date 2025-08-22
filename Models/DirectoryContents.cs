
namespace TestProject.Models
{
    public class DirectoryContents
    {
        public List<FileSystemItem>? Items { get; set; }

        public int TotalCount { get; set; }

        public long TotalSize { get; set; }
    }
}