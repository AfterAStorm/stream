/* node */

import { BaseNode } from "../../../node.js"

function lerp(a, b, t) {
    return a + (b - a) * t
}

function lerpV3(a, b, t) {
    return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
}

export class Node extends BaseNode {
    static id         = "donator"
    static display    = "Donator"
    static size       = [.75, 1.25]
    static icon       = "https://static.wikia.nocookie.net/oaklands/images/d/db/Interactor.png"
    static category   = "simulators"

    constructor() {
        super()
        this.addConnectionPoint('output', 'left', '#out1', 'The user id of the user that bought it')
        this.addConnectionPoint('output', 'left', '#out2', 'The user id of the user that bought it')

        this.pressed = false
        this.cooldown = false
    }

    isHovering(x, y) {
        const hit = super.isHovering(x, y)

        // find distance
        const size = this.getSize()
        const pos = this.getRelativePointer()
        const centerX = size[0] / 2
        const centerY = size[1] / 2
        const width = size[0] - 10
        const height = 20

        if (this.isHoveringRectangle(pos, centerX - width / 2, centerY - height / 2, width, height)) {
            return false
        }
        return hit
    }

    update() {
        super.update()

        if (this.pressed)
            return

        const isPressed = this.isPointerPressed()
        if (!isPressed && this.cooldown)
            this.cooldown = false
        if (!isPressed)
            return // "mouse" isn't pressed

        if (this.cooldown)
            return // under cooldown

        // find distance
        const size = this.getSize()
        const pos = this.getRelativePointer()
        const centerX = size[0] / 2
        const centerY = size[1] / 2
        const width = size[0] - 10
        const height = 20

        if (this.isHoveringRectangle(pos, centerX - width / 2, centerY - height / 2, width, height)) {
            this.cooldown = true
            this.pressed = true
            for (let i = 0; i < 2; i++)
                this.setConnectionPointValue(`#out${i + 1}`, 12345678)
            this.schedule(() => {
                for (let i = 0; i < 2; i++)
                    this.setConnectionPointValue(`#out${i + 1}`, 0)
                this.pressed = false
            }, 1)
        }
    }

    /**
     * @param {CanvasRenderingContext2D} context 
     */
    draw(context) {
        super.draw(context)

        const size = this.getSize()
        const centerX = size[0] / 2
        const centerY = size[1] / 2

        const width = size[0] - 10
        const height = 20

        // draw button
        context.fillStyle = this.pressed ? 'red' : 'green'
        context.beginPath()
        context.roundRect(centerX - width / 2, centerY - height / 2, width, height, 10)
        context.fill()

        // text
        context.fillStyle = '#fff'
        context.font = 'bold 15px monospace'
        context.textAlign = 'center'
        context.textBaseline = 'middle'
        context.fillText('Donate', centerX, centerY)
    }
}