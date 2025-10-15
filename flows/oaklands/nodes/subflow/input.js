/* node */

import { BaseNode } from "../../../node.js"

export class Node extends BaseNode {
    static id         = "subflow_input"
    static display    = "Input"
    static size       = [.75, .75]
    static icon       = "$assets/receiver.png"
    static category   = "subflow"

    constructor() {
        super()
        this.addInteractable('#back', 'top', .5, 'arrow_back', 20, "20px 'Material Symbols Outlined'")
        this.addInteractable('#description', 'bottom', .5, 'Description', this.getSize()[0] - 20, "10px monospace")
        this.addConnectionPoint('output', 'right', '#output', 'Receives the input from the subflow')

        //this.cached = true
        this.desiredValue = 0

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

    set(value) {
        this.desiredValue = value
    }

    update() {
        super.update()

        if (this.getLocalConnectionPointValue('#output') != this.desiredValue) {
            this.setConnectionPointValue('#output', this.desiredValue)
            this.invalidate()
        }
    }

    input(action) {
        switch (action) {
            case '#back':
                this.editor.changeFlows(this.editor.editor.main_flow)
                break
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
        context.strokeStyle = this.getLocalConnectionPointValue('#output') > 0 ? this.ON_COLOR : 'lightgrey'
        context.beginPath()
        context.moveTo(0, centerY)
        context.lineTo(-size[0], centerY)
        context.stroke()
        
        //this.cacheDraw(orig)
    }
}