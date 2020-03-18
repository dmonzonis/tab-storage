var saveBtn = document.querySelector('#save-btn');
var loadBtn = document.querySelector('#load-btn');
var deleteBtn = document.querySelector('#delete-btn');
var sessionList = document.querySelector('#session-list');

// Initial render
renderSessionList();

/**
 * Return a promise that will contain all the currently open tabs in the active window when fulfilled.
 */
function getOpenTabs() {
    return browser.tabs.query({
        currentWindow: true,
        hidden: false
    });
}

/** 
 * Append a new element to the session-list with text given by str
 * 
 * @param {String} str String that will be displayed for the new element in the lest
 */
function addItem(str) {
    var li = document.createElement('li');
    li.appendChild(document.createTextNode(str));
    sessionList.appendChild(li);
}

/**
 * Returns whether the object is empty.
 * 
 * @param {Object} obj Object to be tested
 */
function isEmpty(obj) {
    return Object.keys(obj).length == 0;
}

function onError(error) {
    console.error(error);
}

/**
 * Prompt the user for a session name, save the currently open tabs to that session and add
 * the session to the session list in the popup.
 */
function saveSession() {
    let sessionName = prompt("Give a unique name for the session:");
    if (!sessionName) {
        console.log('No session name provided');
        return;
    }
    // If the given session name already exists, don't do anything
    browser.storage.sync.get(sessionName).then((result) => {
        if (!isEmpty(result)) {
            alert("A session with that name already exists!");
            return;
        }
        getOpenTabs().then((openTabs) => {
            // TODO: Save only 'real' tabs, i.e. no empty tabs
            // TODO: Check for privileged and semi-privileged pages (like about: pages) and don't store
            // those as they cannot be opened programmatically
            browser.storage.sync.set({
                [sessionName]: openTabs.map(tab => tab.url)
            });
            addItem(sessionName);
        });
    }, onError);
    // Save open tabs as a new session into the sync storage and add a new item in the session list
}

function loadSession(sessionName) {
    // TODO: Let users choose if they want to close currently open tabs before restoring ression
    browser.storage.sync.get(sessionName).then((result) => {
        if (isEmpty(result)) {
            console.log('The session ${sessionName} does not exist in the storage');
        }
        urls = Object.values(result)[0];
        for (let url of urls) {
            browser.tabs.create({
                url: url
            });
        }
    }, onError);
}

/**
 * Renders the stored sessions by session name in the popup's selection box.
 */
function renderSessionList() {
    // Remove any existing elements in the list before populating
    sessionList.innerHTML = "";
    // Populate using all session keys in the storage
    browser.storage.sync.get().then((result) => {
        let sessionKeys = Object.keys(result);
        for (let sessionKey of sessionKeys) {
            addItem(sessionKey);
        }
    }, onError);
}

saveBtn.onclick = function () {
    saveSession();
};

loadBtn.onclick = function () {
    let selected = document.querySelector('li.selected');
    if (selected) {
        let sessionName = selected.textContent;
        loadSession(sessionName);
    }
};

deleteBtn.onclick = function () {
    let selected = document.querySelector('li.selected');
    if (selected) {
        let sessionName = selected.textContent;
        browser.storage.sync.remove(sessionName).then(() => {
            // Re-render the session list without the deleted session
            renderSessionList();
        });
    }
};

/**
 * Allows the selection of list elements in the session-list list,
 * setting the selected's element class to selected.
 * 
 * Only one selection is allowed, so once an element is selected, the selected
 * class is cleared from other elements if it existed.
 */
sessionList.onclick = function (e) {
    if (e.target.tagName === 'LI') {
        let selected = document.querySelector('li.selected');
        if (selected) {
            selected.className = '';
        }
        e.target.className = 'selected';
        // Enable the Load/Delete buttons in case it was disabled due to no session being selected
        loadBtn.disabled = false;
        deleteBtn.disabled = false;
    }
    // TODO: Deselect on click away
    // TODO: Load on double click?
};
