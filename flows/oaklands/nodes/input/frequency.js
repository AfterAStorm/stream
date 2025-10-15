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
        this.addInteractable('#config', 'bottom', .5, '1', this.getSize()[0] - 40)
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
        this.setInteractableText('#config', this.speed)
    }

    update() {
        super.update()

        // output
        const currentOutput = this.getConnectionPointValue('#result')
        var setOutput = (Date.now() / 1000) % (this.speed * 2) > this.speed ? this.getConnectionPointValue('#signal') : 0
        
        if (setOutput != currentOutput) {
            this.setConnectionPointValue('#result', setOutput)
        }
    }

    input(action) {
        switch (action) {
            case '#config':
                this.getUserTextInput(this.speed).then(v => {
                    this.speed = parseFloat(v)
                    if (Number.isNaN(this.speed))
                        this.speed = 1
                    this.setInteractableText('#config', this.speed)
                })
                break
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

    }
}