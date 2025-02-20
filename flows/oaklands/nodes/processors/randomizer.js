/* node */

import { BaseNode } from "../../../node.js"

export class Node extends BaseNode {
    static id         = "randomizer"
    static display    = "Randomizer"
    static size       = [1.25, .5]
    static icon       = "$assets/randomizer.png"
    static category   = "processors"

    static image

    constructor() {
        super()
        this.addConnectionPoint('input', 'left', '#input', 'x, outputs a number from [0, x]')
        this.addConnectionPoint('output', 'right', '#result', 'Result, outputs a number from [0, x]')
        this.setConnectionPointValue('#result', 0)

        this.value = 0
        this.last = 0

        this.cached = true // tell node we are caching stuff
    }

    serialize() {
        const data = super.serialize()
        data['value'] = this.value
        return data
    }

    deserialize(data) {
        super.deserialize(data)
        this.value = data.value || 0
        this.setConnectionPointValue('#result', this.value)
    }

    update() {
        super.update()
        
        if (this.image == null) {
            this.image = new Image()
            this.image.src = this.editor.parsePath(this.icon)
            this.image.onload = () => {
                this.invalidate()
            }
        }

        const currentOutput = this.getLocalConnectionPointValue('#result')
        const input = this.getConnectionPointValue('#input')
        if (input != this.last) {
            this.last = input
            this.value = Math.round(Math.random() * input)
        }
        
        var setOutput = this.value
        if (setOutput != currentOutput) {
            this.setConnectionPointValue('#result', setOutput)
        }
    }

    /**
     * @param {CanvasRenderingContext2D} context 
     */
    draw(context) {
        const context2 = super.draw(context)
        if (!context2)
            return this.cacheDraw(context)

        const size = this.getSize()

        /*if (!this.invalidated)
            return
        this.invalidated = false*/

        // draw
        const centerX = size[0] / 2
        const centerY = size[1] / 2
        const radius = Math.min(centerX, centerY) / 2 / 1
        const offset = radius / 3
        context2.beginPath()

        if (this.image != null)
            context2.drawImage(this.image, centerX - 15, centerY - 15, 30, 30)

        // MEMORY CELL symbol
        /*context2.lineCap = 'round'

        context2.strokeStyle = this.value != 0 ? this.ON_COLOR : this.OFF_COLOR
        for (let i = 0; i < 5; i++) {
            const y = ((i + 1) / 6)
            context2.beginPath()
            context2.moveTo(centerX - radius, centerY - radius + y * radius * 2)
            context2.lineTo(centerX - radius + offset, centerY - radius + y * radius * 2)
            context2.moveTo(centerX + radius - offset, centerY - radius + y * radius * 2)
            context2.lineTo(centerX + radius, centerY - radius + y * radius * 2)
            context2.stroke()
        }
        
        context2.beginPath()
        context2.strokeStyle = '#000'
        context2.moveTo(centerX - radius + offset, centerY - radius) // tl
        context2.lineTo(centerX + radius - offset, centerY - radius) // tr
        context2.lineTo(centerX + radius - offset, centerY + radius) // br
        context2.lineTo(centerX - radius + offset, centerY + radius) // bl
        context2.closePath()
        context2.stroke()*/

        this.cacheDraw(context)
    }
}