/* node */

import { BaseNode } from "../../../node.js"

export class Node extends BaseNode {
    static id         = "button"
    static display    = "Button"
    static size       = [.75, .75]
    static icon       = "https://static.wikia.nocookie.net/oaklands/images/f/f0/ButtonComponent.png"
    static category   = "user input"

    constructor() {
        super()
        this.addConnectionPoint('output', 'right', '#pressed', 'Button Pressed\n**Outputs: ⚡ 10')
        this.setConnectionPointValue('#pressed', 0)

        this.pressed = false
    }

    isHovering(x, y) {
        const hit = super.isHovering(x, y)

        const pos = this.getRelative(x, y)
        const size = this.getSize()
        const distance = Math.sqrt(
            Math.pow(pos[0] - size[0] / 2, 2) + Math.pow(pos[1] - size[1] / 2, 2)
        )
        if (distance < size[0] / 2 / 1.5) {
            return false
        }
        return hit
    }

    update() {
        super.update()

        if (this.pressed)
            return // under cooldown

        const isPressed = this.isPointerPressed()
        if (!isPressed)
            return // "mouse" isn't pressed

        // find distance
        const size = this.getSize()
        const pos = this.getRelativePointer()
        const distance = Math.sqrt(
            Math.pow(pos[0] - size[0] / 2, 2) + Math.pow(pos[1] - size[1] / 2, 2)
        )
        if (distance < size[0] / 2 / 1.5) { // if less than radius
            this.pressed = true
            this.setConnectionPointValue('#pressed', 10)
            this.schedule(() => {
                this.pressed = false
                this.setConnectionPointValue('#pressed', 0)
            }, 1)
        }
    }

    /**
     * @param {CanvasRenderingContext2D} context 
     */
    draw(context) {
        super.draw(context)

        const size = this.getSize()

        // draw button
        context.fillStyle = this.pressed ? 'green' : 'red'
        context.strokeStyle = this.pressed ? 'grey' : 'maroon'
        context.beginPath()
        context.arc(size[0] / 2, size[1] / 2, size[0] / 2 / 1.5, 0, Math.PI * 2)
        context.fill()
        context.stroke()
    }
}