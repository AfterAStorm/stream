/* node */

import { BaseNode } from "../../../node.js"

export class Node extends BaseNode {
    static id         = "frequency"
    static display    = "Frequency"
    static size       = [1.5, .5]
    static icon       = "$assets/frequency.png"
    static category   = "user input"

    constructor() {
        super()
        this.addConnectionPoint('input', 'left', '#signal', 'Passthrough, what to output on each activation')
        this.addConnectionPoint('output', 'right', '#result', 'Clock Signal, on for x seconds and off for x seconds\n**Outputs: ⚡ 10')
        this.setConnectionPointValue('#result', 0)

        this.speed = 1
    }

    serialize() {
        const data = super.serialize()
        data['speed'] = this.speed
        return data
    }

    deserialize(data) {
        super.deserialize(data)
        this.speed = data.speed || 1
    }

    update() {
        super.update()

        // output
        const currentOutput = this.getConnectionPointValue('#result')
        var setOutput = (Date.now() / 1000) % (this.speed * 2) > this.speed ? this.getConnectionPointValue('#signal') : 0
        
        if (setOutput != currentOutput) {
            this.setConnectionPointValue('#result', setOutput)
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
        if (this.isHoveringRectangle(pos, 20, size[1], size[0] - 40, 20)) {
            this.cooldown = true
            this.getUserTextInput(this.speed).then(v => {
                this.speed = parseInt(v)
                if (Number.isNaN(this.speed))
                    this.speed = 1
            })
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
        const radius = centerY / 2

        // draw icon
        context.lineCap = 'round'

        context.fillStyle = '#000'
        context.strokeStyle = '#000'
        context.beginPath()
        context.ellipse(centerX, centerY, radius, radius, 0, 0, Math.PI * 2)
        context.stroke()
        
        context.beginPath()
        context.ellipse(centerX, centerY, 2, 2, 0, 0, Math.PI * 2)
        context.fill()
        
        context.beginPath()
        context.moveTo(centerX, centerY)
        context.lineTo(centerX - 6, centerY - 6)
        context.stroke()

        // draw value
        context.fillStyle = '#fff'
        context.save()
        context.beginPath()
        context.rect(0, size[1], size[0], 40)
        context.clip()

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
        context.fillText(this.speed, centerX, size[1] + 10)

    }
}