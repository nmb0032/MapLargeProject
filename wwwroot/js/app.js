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

      render(data, path, true); // Pass a flag to indicate search results are being rendered
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
      const element = document.createElement("a");
      element.className =
        "item " + (item.isDirectory ? "directory-item" : "file-item");
      element.textContent = `${item.name} (${
        item.isDirectory ? "Folder" : formatBytes(item.size)
      })`;

      if (item.isDirectory) {
        const newPath = path ? `${path}/${item.name}` : item.name;
        element.href = `#${newPath}`; // Navigates to a new hash URL
      } else {
        const downloadPath = path ? `${path}/${item.name}` : item.name;
        element.href = `/api/directory/download?path=${encodeURIComponent(
          downloadPath
        )}`;
        element.setAttribute("download", "");
      }
      fileList.appendChild(element);
    });

    totalCountEl.textContent = data.totalCount;
    totalSizeEl.textContent = formatBytes(data.totalSize);
  }

  // Function to handle changes in the URL hash (for navigation)
  function handleHashChange() {
    const path = window.location.hash.substring(1);
    loadDirectory(path);
  }

  // Add event listener for the search button
  searchButton.addEventListener("click", () => {
    const path = window.location.hash.substring(1);
    const searchTerm = searchInput.value.trim();
    if (searchTerm) {
      loadSearchResults(path, searchTerm);
    } else {
      // If the search bar is empty, revert to browsing
      handleHashChange();
    }
  });

  // Add event listener for the clear search button
  clearSearchButton.addEventListener("click", () => {
    searchInput.value = "";
    handleHashChange();
  });

  // Add event listener for the form's submit event
  uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault(); // Prevent the default form submission behavior

    // Get the files selected by the user
    const files = fileInput.files;

    // Check if any files were selected
    if (files.length === 0) {
      uploadMessage.textContent = "Please select at least one file to upload.";
      return;
    }

    // Display a message indicating the upload process has started
    uploadMessage.textContent = "Uploading...";
    // Disable the form to prevent multiple submissions
    uploadForm.querySelector('button[type="submit"]').disabled = true;

    // Create a FormData object to send the files and path
    const formData = new FormData();
    // Append each selected file to the FormData object
    for (let i = 0; i < files.length; i++) {
      formData.append("file", files[i]);
    }
    // Append the current path to the FormData object
    formData.append("path", currentPathEl.textContent);

    try {
      // Use the fetch API to send a POST request to the upload endpoint
      const response = await fetch("/api/directory/upload", {
        method: "POST",
        body: formData, // The FormData object contains the file and path data
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Upload failed");
      }

      // After a successful upload, update the message
      uploadMessage.textContent = "Upload complete!";

      // Reload the current directory to show the newly uploaded files
      handleHashChange();
    } catch (error) {
      // Display any error messages to the user
      uploadMessage.textContent = `Upload error: ${error.message}`;
    } finally {
      // Re-enable the form button and clear the file input after the request is complete
      uploadForm.querySelector('button[type="submit"]').disabled = false;
      fileInput.value = "";
    }
  });

  // Attach event listener for URL hash changes and call it on load
  window.addEventListener("hashchange", handleHashChange);
  handleHashChange();
});

// Helper function to format bytes into a human-readable string
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}
