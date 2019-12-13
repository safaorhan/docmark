/**
 * The Bookmark object
 * @typedef {Object} Bookmark
 * @property {string} [parentId] - Defaults to the Other Bookmarks folder.
 * @property {integer} [index]
 * @property {string} [title] 
 * @property {string} url - Must be a valid url
 */

/**
* The BookmarkFolder object
* @typedef {Object} BookmarkFolder
* @property {string} [parentId] - Defaults to the Other Bookmarks folder.
* @property {integer} [index]
* @property {string} [title]
*/

/**
* The BookmarkTreeNode
* @typedef {Object} BookmarkTreeNode - See https://developer.chrome.com/extensions/bookmarks#type-BookmarkTreeNode
* @property {string} id - The unique identifier for the node. IDs are unique within the current profile, and they remain valid even after the browser is restarted.
* @property {string} title - The text displayed for the node.
* @property {string} [url] - The URL navigated to when a user clicks the bookmark. Omitted for folders.
* @property {BookmarkTreeNode[]} [children] - An ordered list of children of this node.
*/

/**
* The JsonBookmarkTree
* @typedef {Object} JsonBookmarkTree - The object to represent parsed bookmark tree
* @property {string} type - Either of 'bookmark' or 'folder'
* @property {integer} title - Title of the bookmark or folder.
* @property {string} [url] - Exists only if the type is 'bookmark'
* @property {JsonBookmarkTree[]} [children] - Exists only if the type is 'folder'.
*/

/**
* Called after doing a create operation
* @callback BookmarkCreateCallback
* @param {BookmarkTreeNode} createdNode
*/

/**
* Called after doing a compare operation
* @callback CompareCallback
* @param {boolean} same
*/

/**
 * @param {Bookmark} bookmark 
 */
function createBookmark(bookmark) {
    chrome.bookmarks.create(bookmark);
}

/**
 * 
 * @param {BookmarkFolder} folder 
 * @param {BookmarkCreateCallback} callback
 */
function createBookmarkFolder(folder, callback) {
    chrome.bookmarks.create(folder, callback);
}

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (request.command == 'create') {
            createBookmarksFrom(request.bookmarks)
            setTimeout(() => { sendResponse(true) }, 500)
        } else if (request.command == 'update') {
            updateBookmarksFrom(request.bookmarks, sendResponse)
        } else if (request.command == 'remove') {
            removeBookmarks(request.bookmarks, sendResponse)
        } else if (request.command == 'check') {
            checkBookmarkFolderExists(request.bookmarks, sendResponse)
        } else {
            console.error('Unexpected command: ' + request.command)
        }

        // Return true to indicate the response will be sent asynchronously.
        // See: https://developer.chrome.com/apps/messaging
        return true
    });

function checkBookmarkFolderExists(jsonObject, callback) {
    const rootFolderTitle = jsonObject.title

    searchBookmarkFolderWithTitle(rootFolderTitle, (bookmarkTreeNode) => {
        if (bookmarkTreeNode) {
            compareBookmarkTreeWithJson(bookmarkTreeNode, jsonObject, (same) => {
                callback({
                    status: same ? 'UP_TO_DATE' : 'NEEDS_UPDATE'
                })
            })
        } else {
            callback({
                status: 'DOES_NOT_EXIST'
            })
        }
    })
}

/**
 * 
 * @param {BookmarkTreeNode} bookmarkTreeNode 
 * @param {JsonBookmarkTree} jsonObject 
 * @param {CompareCallback} callback 
 */
function compareBookmarkTreeWithJson(bookmarkTreeNode, jsonObject, callback) {
    chrome.bookmarks.getSubTree(bookmarkTreeNode.id, (results) => {
        const finalResponse = recursiveCompare(results[0], jsonObject)
        callback(finalResponse)
    })
}

/**
 * @param {BookmarkTreeNode} node 
 * @param {JsonBookmarkTree} object 
 */
function recursiveCompare(node, object) {

    var response = null

    if (object.type == 'folder') {

        response = object.title == node.title
            && object.children.length == node.children.length
            && object.children.every((value, index) => recursiveCompare(node.children[index], value))

    } else if (object.type == 'bookmark') {

        response = object.title == node.title
            && object.url == node.url
    } else {
        console.error('Unexpected bookmark node type: ' + object.type)
    }

    return response
}

function searchBookmarkFolderWithTitle(rootFolderTitle, callback) {
    chrome.bookmarks.search({ title: rootFolderTitle }, (results) => {
        const bookmarkTreeNode = results.find(it => !it.url)
        callback(bookmarkTreeNode)
    })
}

function updateBookmarksFrom(jsonObject, callback) {
    chrome.bookmarks.search({ title: jsonObject.title }, (results) => {
        const bookmarkTreeNode = results.find(it => !it.url)
        chrome.bookmarks.removeTree(bookmarkTreeNode.id, () => {
            createBookmarksFrom(jsonObject)
            if (callback) callback(true)
        })
    })
}

function createBookmarksFrom(jsonObject, parentId) {
    if (jsonObject.type == 'folder') {
        createBookmarkFolder({
            title: jsonObject.title,
            parentId: parentId
        }, (createdNode) => {
            jsonObject.children.forEach(childObject => {
                createBookmarksFrom(childObject, createdNode.id)
            });
        })
    } else if (jsonObject.type == 'bookmark') {
        createBookmark({
            title: jsonObject.title,
            url: jsonObject.url,
            parentId: parentId
        })
    }
}

function removeBookmarks(jsonObject, callback) {
    chrome.bookmarks.search({ title: jsonObject.title }, (results) => {
        const bookmarkTreeNode = results.find(it => !it.url)
        chrome.bookmarks.removeTree(bookmarkTreeNode.id, () => {
            if (callback) callback(true)
        })
    })
}