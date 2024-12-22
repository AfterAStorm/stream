/* node */

import { BaseNode } from "../../../node.js"

function lerp(a, b, t) {
    return a + (b - a) * t
}

function lerpV3(a, b, t) {
    return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
}

export class Node extends BaseNode {
    static id         = "storage_drawer"
    static display    = "Storage Drawer"
    static size       = [.75, .75]
    static icon       = "https://static.wikia.nocookie.net/oaklands/images/f/fa/Collider_boxed.png"
    static category   = "simulators"

    constructor() {
        super()
        this.addConnectionPoint('interaction_input', 'left', '#input', 'Interact, different devices handle interactors differently')
    }

    /**
     * @param {CanvasRenderingContext2D} context 
     */
    draw(context) {
        super.draw(context)

        const size = this.getSize()
        const centerY = size[1] / 2

        // draw
    }
}