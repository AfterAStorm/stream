/* node */

import { BaseNode } from "../../../node.js"

function lerp(a, b, t) {
    return a + (b - a) * t
}

function lerpV3(a, b, t) {
    return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
}

export class Node extends BaseNode {
    static id         = "owner"
    static display    = "Ownership"
    static size       = [.75, .75]
    static icon       = "$assets/unknown.png"
    static category   = "simulators"

    constructor() {
        super()
        this.addConnectionPoint('input', 'left', '#input', 'Change the ownership of an item\nProvide an input of 10 to clear the ownership of items or input someone\'s user id to change the ownership of the items to them')
    }

    /**
     * @param {CanvasRenderingContext2D} context 
     */
    draw(context) {
        super.draw(context)
    }
}