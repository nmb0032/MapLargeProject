# Simple File Browser Application

- Author: Nicholas Belvin
- Email: nick.belvin@gmail.com

## Setup
- Navigate to appsettings.json and replace fill in ```RootDirectory``` key with the root level folder you'd like to navigate from. You should have read and write permissions on this directory.
- Run the app ```dotnet run```
- Visit https://localhost:7146/index.html


## Capabilities
- **Search**: Searches within current directory file and directory names, a feature add later could be to walk the file tree for searches
- **View**: You can click into directories and view files
- **Download**: Clicking on a file will download it
- **Upload**: Upload capabilities via toolbar
- **Delete**: You can delete individual files