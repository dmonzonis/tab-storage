var saveBtn = document.querySelector('#save-btn');
var loadBtn = document.querySelector('#load-btn');
var deleteBtn = document.querySelector('#delete-btn');
var sessionList = document.querySelector('#session-list');
var closeTabsOnLoadCheckbox = document.querySelector('#close-tabs-on-load');

// Hardcoded keys for persistent settings
const CLOSE_TABS_ON_LOAD_SETTING = 'close_tabs_on_load';

init();

/**
 * Initialize the components in the view.
 */
function init() {
    renderSessionList();
    browser.storage.local.get(CLOSE_TABS_ON_LOAD_SETTING).then((result) => {
        closeTabsOnLoadCheckbox.checked = !isEmpty(result) && Object.values(result)[0];
    }, onError);
}

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
    let openTabsPromise = getOpenTabs();
    browser.storage.sync.get(sessionName).then((result) => {
        if (isEmpty(result)) {
            console.warn('The session ${sessionName} does not exist in the storage');
        }
        urls = Object.values(result)[0];
        for (let url of urls) {
            browser.tabs.create({
                url: url
            });
        }
        // Close the previously open tabs if necessary
        if (closeTabsOnLoadCheckbox.checked) {
            openTabsPromise.then((openTabs) => {
                browser.tabs.remove(openTabs.map(tab => tab.id));
            });
        }
    }, onError);
}

/**
 * Renders the stored sessions by session name in the popup's selection box.
 */
function renderSessionList() {
    // Populate using all session keys in the storage
    browser.storage.sync.get().then((result) => {
        let sessionKeys = Object.keys(result);
        let frag = document.createDocumentFragment();
        // Remove any existing elements in the list before populating
        for (let sessionKey of sessionKeys) {
            let li = frag.appendChild(document.createElement('li'));
            li.textContent = sessionKey;
        }
        // Set the rendered session list to the newly populated one
        sessionList.innerHTML = "";
        sessionList.appendChild(frag);
    }, onError);
    // Set load/delete button enabled status depending on whether there is a selected item
    setButtonsEnabled(Boolean(document.querySelector('li.selected')));
}

/**
 * Allows the selection of list elements in the session list,
 * setting the selected's element class to "selected".
 *
 * Only one selection is allowed, so once an element is selected, the selected
 * class is cleared from other elements if it existed.
 */
function onClickSessionList(ev) {
    if (ev.target.tagName === 'LI') {
        let selected = document.querySelector('li.selected');
        if (selected) {
            selected.className = '';
        }
        ev.target.className = 'selected';
        // Enable the Load/Delete buttons in case it was disabled due to no session being selected
        setButtonsEnabled(true);
    }
    // TODO: Deselect on click away
    // TODO: Load on double click?
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
        }, onError);
    }
};

closeTabsOnLoadCheckbox.onchange = function () {
    // Make new value persist
    browser.storage.local.set({
        [CLOSE_TABS_ON_LOAD_SETTING]: closeTabsOnLoadCheckbox.checked
    });
};

sessionList.onclick = onClickSessionList;
