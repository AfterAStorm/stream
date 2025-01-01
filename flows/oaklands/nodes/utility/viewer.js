/* node */

import { BaseNode } from "../../../node.js"

export class Node extends BaseNode {
    static id         = "viewer"
    static display    = "Viewer"
    static size       = [1, .5]
    static icon       = "$assets/viewer.png"
    static category   = "utility"

    constructor() {
        super()
        this.addConnectionPoint('input', 'top', '#in', 'View the value of the connection')

        this.cooldown = false
    }

    /**
     * @param {CanvasRenderingContext2D} context 
     */
    draw(context) {
        super.draw(context)

        const size = this.getSize()
        
        const centerX = size[0] / 2
        const centerY = size[1] / 2

        context.font = '20px monospace'
        context.textAlign = 'center'
        context.textBaseline = 'middle'
        context.fillStyle = '#000'
        const comment = this.getConnectionPointValue('#in').toFixed(2) // this isn't getLocalConnectionPointValue because we never fetch it elsewhere, so it isn't "cached"
        context.fillText(comment, centerX, centerY)
    }
}