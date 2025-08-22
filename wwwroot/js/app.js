// Wait for the entire page to load before running the script
document.addEventListener("DOMContentLoaded", () => {
  // Get references to all the necessary HTML elements
  const fileList = document.getElementById("file-list");
  const currentPathEl = document.getElementById("current-path");
  const totalCountEl = document.getElementById("total-count");
  const totalSizeEl = document.getElementById("total-size");

  // Get references for the upload form
  const uploadForm = document.getElementById("upload-form");
  const fileInput = document.getElementById("file-input");
  const uploadMessage = document.getElementById("upload-message");

  // Get references for the search bar
  const searchInput = document.getElementById("search-input");
  const searchButton = document.getElementById("search-button");
  const clearSearchButton = document.getElementById("clear-search-button");

  // Asynchronous function to delete a file
  async function deleteFile(path, fileName) {
    if (confirm(`Are you sure you want to delete ${fileName}?`)) {
      try {
        const fullPath = path ? `${path}/${fileName}` : fileName;
        const response = await fetch(
          `/api/directory/delete?path=${encodeURIComponent(fullPath)}`,
          {
            method: "DELETE",
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || "Delete failed");
        }

        uploadMessage.textContent = `${fileName} deleted successfully.`;
        // Reload the current directory to update the list
        handleHashChange();
      } catch (error) {
        uploadMessage.textContent = `Delete error: ${error.message}`;
      }
    }
  }

  // Asynchronous function to load the directory contents from the API
  async function loadDirectory(path) {
    try {
      const response = await fetch(
        `/api/directory/browse?path=${encodeURIComponent(path)}`
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Network response was not ok");
      }

      const data = await response.json();

      render(data, path);
    } catch (error) {
      fileList.innerHTML = `<p class="error">Error loading directory: ${error.message}</p>`;
    }
  }

  // Asynchronous function to load search results from the API
  async function loadSearchResults(path, searchTerm) {
    try {
      const response = await fetch(
        `/api/directory/search?path=${encodeURIComponent(
          path
        )}&searchTerm=${encodeURIComponent(searchTerm)}`
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Search failed");
      }

      const data = await response.json();

      // The backend search results might not have totalCount/totalSize, so we'll compute them
      const summary = {
        totalCount: data.items.length,
        totalSize: data.items.reduce((sum, item) => sum + item.size, 0),
      };

      render(data, path, true);
    } catch (error) {
      fileList.innerHTML = `<p class="error">Error searching: ${error.message}</p>`;
    }
  }

  // Renders the file list and summary information into the DOM.
  function render(data, path, isSearch = false) {
    fileList.innerHTML = ""; // Clear previous list to prevent duplication
    currentPathEl.textContent = path || "/";

    // Only show the ".." link if we are in browse mode and not in the root directory
    if (!isSearch && path) {
      const lastSlashIndex = path.lastIndexOf("/");
      const parentPath =
        lastSlashIndex > -1 ? path.substring(0, lastSlashIndex) : "";
      const upLink = document.createElement("a");
      upLink.href = `#${parentPath}`;
      upLink.className = "item directory-item";
      upLink.textContent = "..";
      fileList.appendChild(upLink);
    }

    data.items.forEach((item) => {
      const element = document.createElement("div"); // Change to div to hold both link and button
      element.className = "item-row";

      const link = document.createElement("a");
      link.className =
        "item " + (item.isDirectory ? "directory-item" : "file-item");
      link.textContent = `${item.name} (${
        item.isDirectory ? "Folder" : formatBytes(item.size)
      })`;

      if (item.isDirectory) {
        const newPath = path ? `${path}/${item.name}` : item.name;
        link.href = `#${newPath}`; // Navigates to a new hash URL
      } else {
        const downloadPath = path ? `${path}/${item.name}` : item.name;
        link.href = `/api/directory/download?path=${encodeURIComponent(
          downloadPath
        )}`;
        link.setAttribute("download", "");
      }

      class FileBrowser {
        /**
         * Constructs the FileBrowser instance and initializes DOM element references.
         */
        constructor() {
          this.fileList = document.getElementById("file-list");
          this.currentPathEl = document.getElementById("current-path");
          this.totalCountEl = document.getElementById("total-count");
          this.totalSizeEl = document.getElementById("total-size");
          this.uploadForm = document.getElementById("upload-form");
          this.fileInput = document.getElementById("file-input");
          this.uploadMessage = document.getElementById("upload-message");
          this.searchInput = document.getElementById("search-input");
          this.searchButton = document.getElementById("search-button");
          this.clearSearchButton = document.getElementById(
            "clear-search-button"
          );
        }

        /**
         * Initializes the file browser by binding event listeners and loading the initial directory.
         */
        init() {
          this.bindEvents();
          this.handleHashChange();
        }

        /**
         * Binds all event listeners for user interactions.
         */
        bindEvents() {
          window.addEventListener(
            "hashchange",
            this.handleHashChange.bind(this)
          );
          this.searchButton.addEventListener(
            "click",
            this.handleSearch.bind(this)
          );
          this.clearSearchButton.addEventListener(
            "click",
            this.handleClearSearch.bind(this)
          );
          this.uploadForm.addEventListener(
            "submit",
            this.handleUpload.bind(this)
          );
        }

        /**
         * Handles changes in the URL hash to navigate directories.
         */
        handleHashChange() {
          const path = window.location.hash.substring(1);
          this.loadDirectory(path);
        }

        /**
         * Handles the search button click event.
         */
        handleSearch() {
          const path = window.location.hash.substring(1);
          const searchTerm = this.searchInput.value.trim();
          if (searchTerm) {
            this.loadSearchResults(path, searchTerm);
          } else {
            this.handleHashChange();
          }
        }

        /**
         * Handles the clear search button click event.
         */
        handleClearSearch() {
          this.searchInput.value = "";
          this.handleHashChange();
        }

        /**
         * Handles the file upload form submission.
         */
        async handleUpload(e) {
          e.preventDefault();

          const files = this.fileInput.files;
          if (files.length === 0) {
            this.uploadMessage.textContent =
              "Please select at least one file to upload.";
            return;
          }

          this.uploadMessage.textContent = "Uploading...";
          this.uploadForm.querySelector(
            'button[type="submit"]'
          ).disabled = true;

          const formData = new FormData();
          for (let i = 0; i < files.length; i++) {
            formData.append("file", files[i]);
          }
          formData.append("path", this.currentPathEl.textContent);

          try {
            const response = await fetch("/api/directory/upload", {
              method: "POST",
              body: formData,
            });

            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(errorText || "Upload failed");
            }

            this.uploadMessage.textContent = "Upload complete!";
            this.handleHashChange();
          } catch (error) {
            this.uploadMessage.textContent = `Upload error: ${error.message}`;
          } finally {
            this.uploadForm.querySelector(
              'button[type="submit"]'
            ).disabled = false;
            this.fileInput.value = "";
          }
        }

        /**
         * @param {string} message The message to display in the confirmation dialog.
         * @returns {Promise<boolean>} A promise that resolves to true if confirmed, false otherwise.
         */
        async showConfirmation(message) {
          return confirm(message);
        }

        /**
         * Deletes a file or directory after user confirmation.
         * @param {string} path The current directory path.
         * @param {string} fileName The name of the file or directory to delete.
         */
        async deleteFile(path, fileName) {
          const fullPath = path ? `${path}/${fileName}` : fileName;
          const isConfirmed = await this.showConfirmation(
            `Are you sure you want to delete ${fullPath}?`
          );

          if (isConfirmed) {
            try {
              const response = await fetch(
                `/api/directory/delete?path=${encodeURIComponent(fullPath)}`,
                {
                  method: "DELETE",
                }
              );

              if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || "Delete failed");
              }

              this.uploadMessage.textContent = `${fileName} deleted successfully.`;
              this.handleHashChange();
            } catch (error) {
              this.uploadMessage.textContent = `Delete error: ${error.message}`;
            }
          }
        }

        /**
         * Loads the directory contents from the API.
         * @param {string} path The path to browse.
         */
        async loadDirectory(path) {
          try {
            const response = await fetch(
              `/api/directory/browse?path=${encodeURIComponent(path)}`
            );
            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(errorText || "Network response was not ok");
            }
            const data = await response.json();
            this.render(data, path);
          } catch (error) {
            this.fileList.innerHTML = `<p class="error">Error loading directory: ${error.message}</p>`;
          }
        }

        /**
         * Loads search results from the API.
         * @param {string} path The path to search within.
         * @param {string} searchTerm The search query.
         */
        async loadSearchResults(path, searchTerm) {
          try {
            const response = await fetch(
              `/api/directory/search?path=${encodeURIComponent(
                path
              )}&searchTerm=${encodeURIComponent(searchTerm)}`
            );
            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(errorText || "Search failed");
            }
            const data = await response.json();
            this.render(data, path, true);
          } catch (error) {
            this.fileList.innerHTML = `<p class="error">Error searching: ${error.message}</p>`;
          }
        }

        /**
         * Creates a single list item element for a file or directory.
         * @param {object} item The file or directory object.
         * @param {string} path The current directory path.
         * @param {boolean} isSearch Whether the view is for search results.
         */
        createItemElement(item, path, isSearch) {
          const itemRow = document.createElement("div");
          itemRow.className = "item-row";

          const itemLink = document.createElement("a");
          itemLink.className = `item ${
            item.isDirectory ? "directory-item" : "file-item"
          }`;
          itemLink.textContent = `${item.name} (${
            item.isDirectory ? "Folder" : this.formatBytes(item.size)
          })`;

          if (item.isDirectory) {
            const newPath = path ? `${path}/${item.name}` : item.name;
            itemLink.href = `#${newPath}`;
          } else {
            const downloadPath = path ? `${path}/${item.name}` : item.name;
            itemLink.href = `/api/directory/download?path=${encodeURIComponent(
              downloadPath
            )}`;
            itemLink.setAttribute("download", "");
          }
          itemRow.appendChild(itemLink);

          if (!isSearch) {
            const deleteBtn = document.createElement("button");
            deleteBtn.textContent = "🗑️";
            deleteBtn.className = "delete-btn";
            deleteBtn.addEventListener("click", (event) => {
              event.preventDefault();
              this.deleteFile(path, item.name);
            });
            itemRow.appendChild(deleteBtn);
          }

          return itemRow;
        }

        /**
         * Renders the file list and summary information into the DOM.
         * @param {object} data The data object from the API.
         * @param {string} path The current directory path.
         * @param {boolean} isSearch Whether the view is for search results.
         */
        render(data, path, isSearch = false) {
          this.fileList.innerHTML = "";
          this.currentPathEl.textContent = path || "/";

          if (!isSearch && path) {
            const lastSlashIndex = path.lastIndexOf("/");
            const parentPath =
              lastSlashIndex > -1 ? path.substring(0, lastSlashIndex) : "";
            const upLink = document.createElement("a");
            upLink.href = `#${parentPath}`;
            upLink.className = "item directory-item";
            upLink.textContent = "..";
            this.fileList.appendChild(upLink);
          }

          data.items.forEach((item) => {
            const itemElement = this.createItemElement(item, path, isSearch);
            this.fileList.appendChild(itemElement);
          });

          this.totalCountEl.textContent = data.totalCount;
          this.totalSizeEl.textContent = this.formatBytes(data.totalSize);
        }

        /**
         * Helper function to format bytes into a human-readable string.
         * @param {number} bytes The number of bytes.
         * @param {number} decimals The number of decimal places to show.
         * @returns {string} The formatted string.
         */
        formatBytes(bytes, decimals = 2) {
          if (bytes === 0) return "0 Bytes";
          const k = 1024;
          const dm = decimals < 0 ? 0 : decimals;
          const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
          const i = Math.floor(Math.log(bytes) / Math.log(k));
          return (
            parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
          );
        }
      }

      // Instantiate and initialize the FileBrowser
      document.addEventListener("DOMContentLoaded", () => {
        const fileBrowser = new FileBrowser();
        fileBrowser.init();
      });

      element.appendChild(link);

      // Add delete button for all items (files and directories)
      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "🗑️";
      deleteBtn.className = "delete-btn";
      deleteBtn.addEventListener("click", (event) => {
        event.preventDefault(); // Prevent default link behavior
        const pathToDelete = item.isDirectory
          ? `${path}/${item.name}`
          : `${path}/${item.name}`;
        deleteFile(path, item.name);
      });
      element.appendChild(deleteBtn);

      fileList.appendChild(element);
    });

    totalCountEl.textContent = data.totalCount;
    totalSizeEl.textContent = formatBytes(data.totalSize);
  }

  function handleHashChange() {
    const path = window.location.hash.substring(1);
    loadDirectory(path);
  }

  searchButton.addEventListener("click", () => {
    const path = window.location.hash.substring(1);
    const searchTerm = searchInput.value.trim();
    if (searchTerm) {
      loadSearchResults(path, searchTerm);
    } else {
      handleHashChange();
    }
  });

  clearSearchButton.addEventListener("click", () => {
    searchInput.value = "";
    handleHashChange();
  });

  uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const files = fileInput.files;

    if (files.length === 0) {
      uploadMessage.textContent = "Please select at least one file to upload.";
      return;
    }

    uploadMessage.textContent = "Uploading...";
    uploadForm.querySelector('button[type="submit"]').disabled = true;

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("file", files[i]);
    }

    formData.append("path", currentPathEl.textContent);

    try {
      const response = await fetch("/api/directory/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Upload failed");
      }

      uploadMessage.textContent = "Upload complete!";

      handleHashChange();
    } catch (error) {
      uploadMessage.textContent = `Upload error: ${error.message}`;
    } finally {
      uploadForm.querySelector('button[type="submit"]').disabled = false;
      fileInput.value = "";
    }
  });

  window.addEventListener("hashchange", handleHashChange);
  handleHashChange();
});

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}
