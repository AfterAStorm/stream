/* node */

import { BaseNode } from "../../../node.js"

export class Node extends BaseNode {
    static id         = "subflow_output"
    static display    = "Output"
    static size       = [.75, .75]
    static icon       = "$assets/transmitter.png"
    static category   = "subflow"

    constructor() {
        super()
        this.addInteractable('#description', 'bottom', .5, 'Description', this.getSize()[0] - 20, "10px monospace")
        this.addConnectionPoint('input', 'left', '#input', 'Sends the input outside the subflow')

        //this.cached = true


        this.description = 'Description'
    }

    static placeable(state) {
        return state.editor.main_flow != state.editor.flow
    }

    serialize() {
        const data = super.serialize()
        data['description'] = this.description
        return data
    }

    deserialize(data) {
        super.deserialize(data)
        this.description = data.description || ''
        this.setInteractableText('#description', this.description)
    }

    update() {
        super.update()
    }

    input(action) {
        switch (action) {
            case '#description':
                this.getUserTextInput(this.description).then(v => {
                    this.description = v ?? this.description
                    this.setInteractableText('#description', this.description)
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
        const centerX = size[0] / 2
        const centerY = size[1] / 2

        // draw antenna
        context.strokeStyle = this.getLocalConnectionPointValue('#input') > 0 ? this.ON_COLOR : 'lightgrey'
        context.beginPath()
        context.moveTo(size[0], centerY)
        context.lineTo(size[0] * 2, centerY)
        context.stroke()
        
        //this.cacheDraw(orig)
    }
}