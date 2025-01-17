/* web */

import { LZString } from "./vendor/lz-string.min.js" // is faster but is slightly less effective
import JSONCrush from "./vendor/JSONCrush.min.js" // is considerably slower but is a bit better compression wise

/**
 * @param {string} flowString 
 * @returns Object
 */
export function decompress(flowString) {
    if (flowString.startsWith('ey'))
        return JSON.parse(atob(flowString))
    else if (flowString.startsWith('('))
        return JSON.parse(JSONCrush.uncrush(decodeURIComponent(flowString)))
    else if (flowString.includes('%'))
        return JSON.parse(LZString.decompressFromEncodedURIComponent(decodeURIComponent(flowString)))
    else
        return JSON.parse(LZString.decompressFromEncodedURIComponent(flowString))
}

/**
 * @param {Object} serializedFlow 
 * @returns string
 */
export function compress(serializedFlow) {
    const json = JSON.stringify(serializedFlow)
    return LZString.compressToEncodedURIComponent(json)
}