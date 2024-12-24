/* node */

import { BaseNode } from "../../../node.js"

export class Node extends BaseNode {
    static id         = "sustainer"
    static display    = "Sustainer"
    static size       = [1, .5]
    static icon       = "$assets/sustainer.png"
    static category   = "processors"

    constructor() {
        super()
        this.addConnectionPoint('input', 'left', '#in', 'Input')
        this.addConnectionPoint('output', 'right', '#result', 'Sustained, acts as a sort of "queue", similiar to delay except 0 to x will be instant')
        this.setConnectionPointValue('#result', 0)

        this.value = 0
        this.delay = 1
    }

    serialize() {
        const data = super.serialize()
        data['delay'] = this.delay
        return data
    }

    deserialize(data) {
        super.deserialize(data)
        this.delay = data.delay
    }

    update() {
        super.update()

        const input = this.getConnectionPointValue('#in')
        if (this.value != input) {
            const last = this.value
            this.value = input
            if (last == 0 && this.scheduledTasks.length == 0) // the same as delay, except if its 0 it will pick it up immediatelly
                this.setConnectionPointValue('#result', input)
            else
                this.schedule(() => {
                    this.setConnectionPointValue('#result', input)
                }, this.delay)
                
        }

        // changing value
        const isPressed = this.isPointerPressed()
        if (!isPressed && this.cooldown)
            this.cooldown = false
        if (!isPressed)
            return // "mouse" isn't pressed

        if (this.cooldown)
            return // ignore wehn under cooldown

        // find distance
        const size = this.getSize()
        const pos = this.getRelativePointer()
        
        if (this.isHoveringRectangle(pos, 20, size[1], size[0] - 20, 20)) {
            this.cooldown = true
            this.getUserTextInput(this.delay).then(v => {
                this.delay = parseFloat(v)
                if (Number.isNaN(this.delay))
                    this.delay = 1
                this.delay = Math.round(this.delay * 10) / 10
                this.delay = Math.max(Math.min(this.delay, 300), 0)
            })
        }
    }

    /**
     * @param {CanvasRenderingContext2D} context 
     */
    draw(context) {
        super.draw(context)

        const size = this.getSize()

        // draw
        const centerX = size[0] / 2
        const centerY = size[1] / 2
        const radius = Math.min(centerX, centerY) / 2 / 1
        context.beginPath()

        // SUSTAINER symbol
        context.lineCap = 'round'

        context.fillStyle = '#000'
        context.strokeStyle = '#000'
        context.beginPath()
        context.ellipse(centerX, centerY, radius, radius, 0, 0, Math.PI * 2)
        context.stroke()
        
        context.beginPath()
        context.ellipse(centerX, centerY, 2, 2, 0, 0, Math.PI * 2)
        context.fill()

        context.fillRect(centerX - 3, centerY - radius - 2, 6, 2)
        context.fillRect(centerX - 4, centerY - radius - 4, 8, 2)
        
        context.beginPath()
        context.moveTo(centerX, centerY)
        context.lineTo(centerX - 6, centerY - 6)
        context.stroke()

        // draw value
        context.save()
        context.beginPath()
        context.rect(0, size[1], size[0], 40)
        context.clip()

        context.fillStyle = '#fff'
        context.beginPath()
        context.roundRect(20, size[1] - 20, size[0] - 40, 40, 10)
        context.fill()
        
        context.fillStyle = '#ddd'
        context.beginPath()
        context.roundRect(21, size[1] - 21, size[0] - 42, 40, 10)
        context.fill()
        
        context.restore()

        context.fillStyle = '#000'
        context.textAlign = 'center'
        context.textBaseline = 'middle'
        context.font = '20px monospace'
        context.fillText(this.delay, centerX, size[1] + 10)

    }
}