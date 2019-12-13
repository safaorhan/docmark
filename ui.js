
const title = document.querySelector('#title-text a')

if (title && title.textContent.includes('🔖')) {
    checkBookmarkStatusAndInjectButton()
}

function checkBookmarkStatusAndInjectButton() {

    const bookmarks = parseBookmarksAsJson()

    chrome.runtime.sendMessage({ command: 'check', bookmarks }, (response) => {
        if (response.status == 'UP_TO_DATE') {

            injectBookmarkButton('Bookmarks up-to-date', 'check', () => {
                if (confirm('Remove added bookmarks from browser?')) {
                    chrome.runtime.sendMessage(null, { command: 'remove', bookmarks }, null, () => {
                        console.log('Refreshing..')
                        checkBookmarkStatusAndInjectButton()
                    })
                }
            })
        } else if (response.status == 'NEEDS_UPDATE') {

            injectBookmarkButton('Update Bookmarks', 'refresh', () => {
                chrome.runtime.sendMessage(null, { command: 'update', bookmarks }, null, () => {
                    console.log('Refreshing..')
                    checkBookmarkStatusAndInjectButton()
                })
            })
        } else if (response.status == 'DOES_NOT_EXIST') {

            injectBookmarkButton('Add Bookmarks', 'add', () => {
                chrome.runtime.sendMessage(null, { command: 'create', bookmarks }, null, () => {
                    console.log('Refreshing..')
                    checkBookmarkStatusAndInjectButton()
                })
            })
        }
    })
}


function injectBookmarkButton(text, icon, onClick) {
    const ul = document.querySelector('#navigation > ul')

    const li = document.querySelector('#navigation > ul > #bookmark-button') || document.createElement('li')
    li.innerHTML = ''

    const a = document.createElement('a')
    const span = createElementFromHTML('<span><span class="aui-icon aui-icon-small aui-iconfont-' + icon + '"></span> ' + text + '</span>')

    li.id = 'bookmark-button'
    li.className = "ajs-button normal"
    a.className = 'aui-button aui-button-subtle'

    a.addEventListener("click", onClick, false);

    a.appendChild(span)
    li.appendChild(a)
    ul.insertBefore(li, ul.firstChild);
}

function createElementFromHTML(htmlString) {
    var div = document.createElement('div');
    div.innerHTML = htmlString.trim();

    // Change this to div.childNodes to support multiple top-level nodes
    return div.firstChild;
}

function parseBookmarksAsJson() {
    const ul = document.querySelector('#main-content > ul')
    const bookmarks = bookmarksFromUl(title.textContent, ul)

    return bookmarks
}

/**
 * 
 * @param {ChildNode} ul
 */
function bookmarksFromUl(title, ul) {
    return {
        type: 'folder',
        title: title,
        children: [...ul.childNodes].map((li) => bookmarksFromLi(li))
    }
}

/**
 * 
 * @param {ChildNode} li 
 */
function bookmarksFromLi(li) {
    if (li.childNodes.length == 1) {
        // It's an end-node
        return {
            type: 'bookmark',
            title: li.firstChild.innerText,
            url: li.firstChild.href
        }
    } else {
        // It's a folder (title + ul)
        const title = li.firstChild.nodeValue
        const ul = [...li.childNodes].find(it => it.nodeName == 'UL')

        return bookmarksFromUl(title, ul)
    }
}
