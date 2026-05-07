/* web */

/**
 * 
 * @param {string} title 
 * @param {string} message 
 */
export function showInfoModal(title, message, html=false) {
    const modal = document.querySelector('#popup-notice')
    modal.querySelector('#notice-title').innerText = title
    if (html)
        modal.querySelector('#notice-body').innerHTML = message
    else
        modal.querySelector('#notice-body').innerText = message
    modal.showModal()
}