/* node */

import { BaseNode } from "../../../node.js"

function lerp(a, b, t) {
    return a + (b - a) * t
}

function lerpV3(a, b, t) {
    return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
}

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
        /*context.fillStyle = value > 0 ? 'green' : 'red'
        context.strokeStyle = 'grey' //value > 0 ? 'grey' : 'maroon'
        context.beginPath()
        context.arc(size[0] / 2, size[1] / 2, size[0] / 2 / 1.5, 0, Math.PI * 2)
        context.fill()
        context.stroke()*/
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