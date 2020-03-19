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
 * Returns the text content of the selected session name, or an empty string if there
 * is no session selected.
 */
function getSelectedText() {
    let selected = document.querySelector('li.selected');
    return selected ? selected.textContent : "";
}

/**
 * Sets the Load and Delete buttons to the corresponding state depending on the flag.
 * @param {Boolean} flag true enables the buttons, false disables them.
 */
function setButtonsEnabled(flag) {
    loadBtn.disabled = deleteBtn.disabled = !flag;
}

/**
 * Prompt the user for a session name, save the currently open tabs to that session and add
 * the session to the session list in the popup.
 */
function saveSession(sessionName) {
    getOpenTabs().then((openTabs) => {
        // TODO: Save only 'real' tabs, i.e. no empty tabs
        // TODO: Check for privileged and semi-privileged pages (like about: pages) and don't store
        // those as they cannot be opened programmatically

        // If a session with the same name existed before, it will be overwritten
        browser.storage.sync.set({
            [sessionName]: openTabs.map(tab => tab.url)
        }).then(() => {
            renderSessionList();
        });
    });
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
    // Set load/delete button enabled status depending on whether there is a selected item
    setButtonsEnabled(Boolean(document.querySelector('li.selected')));
}

saveBtn.onclick = function () {
    let sessionName = prompt("Give a unique name for the session:", getSelectedText());
    if (!sessionName) {
        console.log('No session name provided');
        return;
    }
    saveSession(sessionName);
};

loadBtn.onclick = function () {
    let sessionName = getSelectedText();
    if (sessionName) {
        loadSession(sessionName);
    }
};

deleteBtn.onclick = function () {
    let sessionName = getSelectedText();
    if (sessionName) {
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
        setButtonsEnabled(true);
    }
    // TODO: Deselect on click away
    // TODO: Load on double click?
};
