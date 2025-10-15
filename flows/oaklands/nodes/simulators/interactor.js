/* node */

import { BaseNode } from "../../../node.js"

export class Node extends BaseNode {
    static id         = "interactor"
    static display    = "Interactor"
    static size       = [.75, .75]
    static icon       = "https://static.wikia.nocookie.net/oaklands/images/d/db/Interactor.png"
    static category   = "simulators"

    constructor() {
        super()
        this.addConnectionPoint('input', 'left', '#input', 'Interact, different devices handle interactors differently')
    }

    /**
     * @param {CanvasRenderingContext2D} context 
     */
    draw(context) {
        super.draw(context)

        const size = this.getSize()
        const centerY = size[1] / 2

        const value = this.getConnectionPointValue('#input')

        // draw antenna
        context.fillStyle = 'lightgrey'
        context.beginPath()
        context.moveTo(size[0], centerY - 5)
        context.lineTo(size[0] * 2, centerY)
        context.lineTo(size[0], centerY + 5)
        context.closePath()
        context.fill()

        context.fillStyle = 'darkgrey'
        context.beginPath()
        context.ellipse(size[0] + 2, centerY, 2, 10, 0, 0, 2 * Math.PI)
        context.fill()
        context.beginPath()
        context.ellipse(size[0] * 1.25, centerY, 2, 7, 0, 0, 2 * Math.PI)
        context.fill()
        context.beginPath()
        context.ellipse(size[0] * 1.5, centerY, 2, 5, 0, 0, 2 * Math.PI)
        context.fill()
    }
}