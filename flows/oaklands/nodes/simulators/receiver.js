/* node */

import { BaseNode } from "../../../node.js"

export class Node extends BaseNode {
    static id         = "receiver"
    static display    = "Receiver"
    static size       = [.75, .75]
    static icon       = "$assets/receiver.png"
    static category   = "simulators"

    constructor() {
        super()
        this.addInteractable('#config', 'bottom', .5, 'none', this.getSize()[0] - 20, '10px monospace')
        this.addConnectionPoint('output', 'left', '#output', 'Receives the signal from transmitters with the same "channel"')

        this.cached = true

        this.channel = 'none'
    }

    serialize() {
        const data = super.serialize()
        data['channel'] = this.channel
        return data
    }

    deserialize(data) {
        super.deserialize(data)
        this.channel = data.channel ?? ''
        this.setInteractableText('#config', this.channel)
    }

    update() {
        super.update()

        this.editor._airwaves = this.editor._airwaves ?? {}

        const setValue = this.editor._airwaves[this.channel] ?? 0
        if (this.getLocalConnectionPointValue('#output') != setValue) {
            this.setConnectionPointValue('#output', setValue)
            this.invalidate()
        }
    }

    input(action) {
        switch (action) {
            case '#config':
                this.getUserTextInput(this.channel).then(v => {
                    this.channel = v
                    this.setInteractableText('#config', this.channel)
                    this.invalidate()
                })
                break
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
        const centerY = size[1] / 2

        // draw antenna
        context.strokeStyle = this.getLocalConnectionPointValue('#output') > 0 ? this.ON_COLOR : 'lightgrey'
        context.beginPath()
        context.moveTo(size[0], centerY)
        context.lineTo(size[0] * 2, centerY)
        context.stroke()
        
        this.cacheDraw(orig)
    }
}