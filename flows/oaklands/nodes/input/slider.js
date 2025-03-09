/* node */

import { BaseNode } from "../../../node.js"

export class Node extends BaseNode {
    static id         = "slider"
    static display    = "Slider"
    static size       = [2.5, .75]
    static icon       = "https://static.wikia.nocookie.net/oaklands/images/1/15/SliderComponent.png"
    static category   = "user input"

    constructor() {
        super()
        this.addConnectionPoint('output', 'right', '#value', 'Slider Value\n**Outputs: ⚡ 0-10')
        this.setConnectionPointValue('#value', 0)

        this.value = 0
    }

    serialize() {
        const data = super.serialize()
        data['value'] = this.value
        return data
    }

    deserialize(data) {
        super.deserialize(data)
        this.value = data.value ?? 0
        this.setConnectionPointValue('#value', this.value)
    }

    // it's a bit off when rotated... but whatever

    isHovering(x, y) {
        const hit = super.isHovering(x, y)

        // find distance
        const size = this.getSize()
        const pos = this.getRelativePointer()
        const centerX = size[0] / 2
        const centerY = size[1] / 2
        const width = size[0] - 50
        const height = size[1] - 50

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
        const width = size[0] - 50
        const height = size[1] - 50

        if (this.isHoveringRectangle(pos, centerX - width / 2, centerY - height / 2, width, height)) {
            var basis = 0
            if (this.rotation == 0)
                basis = pos[0]
            else if (this.rotation == 90)
                basis = pos[1] + width / 2 - 10
            else if (this.rotation == 180)
                basis = width - pos[0] + 50
            else if (this.rotation == 270)
                basis = -(pos[1] - width) - 40
            const percent = (basis - (size[0] - width) / 2) / width
            const rounded = Math.round(percent * 10)
            if (this.value == rounded)
                return // didn't change
            this.value = rounded
            this.setConnectionPointValue('#value', this.value)
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
        
        const width = size[0] - 50
        const height = size[1] - 50

        // draw background
        context.fillStyle = 'gray'
        context.beginPath()
        context.roundRect(centerX - width / 2, centerY - height / 2, width, height, 10)
        context.fill()

        // draw bar
        context.fillStyle = 'red'
        context.beginPath()
        context.roundRect(centerX - width / 2 + (this.value / 10) * (width - 10), centerY - height / 2 - 5, 10, height + 10, 10)
        context.fill()
    }
}