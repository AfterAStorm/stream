/* node */

import { BaseNode } from "../../../node.js"

export class Node extends BaseNode {
    static id         = "switch"
    static display    = "Switch"
    static size       = [1.25, .75]
    static icon       = "https://static.wikia.nocookie.net/oaklands/images/e/ed/SwitchComponent.png"
    static category   = "user input"

    constructor() {
        super()
        this.addConnectionPoint('output', 'right', '#pressed', 'Switch Pressed\n**Outputs: ⚡ 10')
        this.setConnectionPointValue('#pressed', 0)

        this.cached = true

        this.pressed = false
        this.cooldown = false
    }

    serialize() {
        const data = super.serialize()
        data['pressed'] = this.pressed
        return data
    }

    deserialize(data) {
        super.deserialize(data)
        this.pressed = data.pressed
        this.setConnectionPointValue('#pressed', this.pressed ? 10 : 0)
    }

    // it's a bit off when rotated... but whatever

    isHovering(x, y) {
        const hit = super.isHovering(x, y)

        // find distance
        const size = this.getSize()
        const pos = this.getRelativePointer()
        const centerX = size[0] / 2
        const centerY = size[1] / 2
        const width = size[0] / 1.5
        const height = size[1] / 2

        if (this.isHoveringRectangle(pos, centerX - width / 2, centerY - height / 2, width, height)) {
            return false
        }
        return hit
    }

    update() {
        super.update()

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
        const width = size[0] / 1.5
        const height = size[1] / 2

        if (this.isHoveringRectangle(pos, centerX - width / 2, centerY - height / 2, width, height)) {
            this.cooldown = true
            this.pressed = !this.pressed
            this.setConnectionPointValue('#pressed', this.pressed ? 10 : 0)
            this.invalidate()
        }
    }

    /**
     * @param {CanvasRenderingContext2D} context 
     */
    draw(context) {
        //super.draw(context)
        const context2 = super.draw(context)
        if (!context2)
            return this.cacheDraw(context)
        const orig = context
        context = context2

        const size = this.getSize()

        const centerX = size[0] / 2
        const centerY = size[1] / 2
        
        const width = size[0] / 1.5
        const height = size[1] / 2

        // draw switch
        context.fillStyle = this.pressed ? 'green' : 'red'
        context.beginPath()
        context.roundRect(centerX - width / 2, centerY - height / 2, width, height, 10)
        context.fill()

        // draw icons
        context.fillStyle = 'white'
        context.font = 'bold 40px monospace'
        context.textAlign = 'center'
        context.textBaseline = 'middle'
        context.fillText('O', centerX - width / 4, centerY + 2)
        context.font = 'bold 25px monospace'
        context.fillText('|', centerX + width / 4, centerY + 2)
        
        this.cacheDraw(orig)
    }
}