/* node */

import { BaseNode } from "/flows/node.js"

export class Node extends BaseNode {
    static id         = "viewer"
    static display    = "Viewer"
    static size       = [1, .5]
    static icon       = "https://icon2.cleanpng.com/20180410/vde/avbaqf66l.webp"
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
        const comment = this.getConnectionPointValue('#in')
        context.fillText(comment, centerX, centerY)
    }
}