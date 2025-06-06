document.addEventListener('DOMContentLoaded', function () {
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const resultsDiv = document.getElementById('results');
    const deleteButton = document.getElementById('deleteButton');
    const deleteAllDomainsCheckbox = document.getElementById('deleteAllDomainsCheckbox');
    const deleteControlsDiv = document.getElementById('deleteControls'); // Get the new div
    let currentHistoryItems = []; // Renamed for clarity, stores items currently displayed

    searchButton.addEventListener('click', function () {
        const searchText = searchInput.value;
        if (!searchText) {
            resultsDiv.innerHTML = '<p>Please enter a search term.</p>';
            deleteControlsDiv.style.display = 'none'; // Hide new div
            return;
        }
        // Fetch all history items (up to maxResults) from all time, then filter client-side for wider matching in URL or title
        chrome.history.search({ text: '', startTime: 0, maxResults: 10000 }, function (rawHistoryItems) {
            console.log("Fetched raw history items count:", rawHistoryItems.length);
            const lowerSearchText = searchText.toLowerCase();
            const filteredHistoryItems = rawHistoryItems.filter(item => {
                let urlMatch = false;
                if (item.url && item.url.toLowerCase().includes(lowerSearchText)) {
                    urlMatch = true;
                }
                let titleMatch = false;
                if (item.title && item.title.toLowerCase().includes(lowerSearchText)) {
                    titleMatch = true;
                }
                return urlMatch || titleMatch; // Match if searchText is in URL or title
            });

            currentHistoryItems = filteredHistoryItems; // Store the filtered items

            if (filteredHistoryItems.length > 0) {
                let html = '<ul>';
                filteredHistoryItems.forEach(function (item) {
                    html += `<li><input type="checkbox" class="history-item" value="${item.url}"> <a href="${item.url}" target="_blank">${item.title || item.url}</a></li>`;
                });
                html += '</ul>';
                resultsDiv.innerHTML = html;
                deleteControlsDiv.style.display = 'block'; // Show new div
                deleteAllDomainsCheckbox.checked = false; // Uncheck by default
            } else {
                resultsDiv.innerHTML = '<p>No history items found.</p>'; // Updated message
                deleteControlsDiv.style.display = 'none'; // Hide new div
            }
        });
    });

    deleteButton.addEventListener('click', function () {
        if (deleteAllDomainsCheckbox.checked) {
            // Delete all items from the domains of the currently displayed (filtered) results
            const domainsToDelete = new Set();
            currentHistoryItems.forEach(item => {
                try {
                    const url = new URL(item.url);
                    domainsToDelete.add(url.hostname);
                } catch (e) {
                    console.error("Error parsing URL for domain extraction:", item.url, e);
                }
            });

            if (domainsToDelete.size === 0) {
                alert('No domains to delete based on current results.');
                return;
            }

            let domainsArray = Array.from(domainsToDelete);
            console.log("Deleting all items from domains:", domainsArray);

            // Iterate over all history to find items matching these domains
            chrome.history.search({ text: '', startTime: 0, maxResults: 0 }, function(allItems) { // maxResults: 0 for unlimited
                let itemsDeletedCount = 0;
                allItems.forEach(function(historyItem) {
                    try {
                        const url = new URL(historyItem.url);
                        if (domainsToDelete.has(url.hostname)) {
                            chrome.history.deleteUrl({ url: historyItem.url }, function() {
                                itemsDeletedCount++;
                                // Optional: log individual deletions
                            });
                        }
                    } catch (e) {
                        // ignore parse errors
                    }
                });
                // This alert might appear before all deletions are complete due to async nature
                alert(`Deletion process initiated for items from ${domainsArray.join(', ')}. Check console for progress.`);
                resultsDiv.innerHTML = '<p>Deletion for selected domains initiated. Search again to see updated history.</p>';
                deleteControlsDiv.style.display = 'none';
                searchInput.value = '';
                deleteAllDomainsCheckbox.checked = false;
            });

        } else {
            // Original logic: Delete selected items only
            const selectedItems = document.querySelectorAll('.history-item:checked');
            if (selectedItems.length === 0) {
                alert('Please select items to delete, or check the "Delete all items from displayed domains" box.');
                return;
            }
            selectedItems.forEach(function (checkbox) {
                const urlToDelete = checkbox.value;
                chrome.history.deleteUrl({ url: urlToDelete }, function () {
                    console.log(`Deleted: ${urlToDelete}`);
                });
            });
            resultsDiv.innerHTML = '<p>Selected items have been deleted. Search again to see updated history.</p>';
            deleteControlsDiv.style.display = 'none';
            searchInput.value = '';
        }
    });
});
