/* node */

import { BaseNode } from "../../../node.js"

const OPERATION_CHARACTERS = [
    'n/a',
    '+',
    '-',
    'x',
    '÷',
    '^'
]

export class Node extends BaseNode {
    static id         = "computer"
    static display    = "Calculator"
    static size       = [1, 1.5]
    static icon       = "https://static.wikia.nocookie.net/oaklands/images/6/69/Calculator_boxed.png"
    static category   = "processors"

    constructor() {
        super()
        this.addInteractable('#config', 'bottom', .5, '+', this.getSize()[0] - 40)
        this.addConnectionPoint('input', 'left', '#left', 'Left Input, x of x op y')
        this.addConnectionPoint('input', 'left', '#right', 'Right Input, y of x op y')
        this.addConnectionPoint('output', 'right', '#result', 'Operation Result, x (+/-/*/÷/^) y')
        this.setConnectionPointValue('#result', 0)

        this.cached = true

        /*
        1 = add
        2 = sub
        3 = mul
        4 = div
        5 = exp
        */
        this.mode = 1 // why it doesn't start at zero? no idea
    }

    serialize() {
        const data = super.serialize()
        data['mode'] = this.mode
        return data
    }

    deserialize(data) {
        super.deserialize(data)
        this.mode = data.mode
        this.setInteractableText('#config', OPERATION_CHARACTERS[this.mode])
    }

    _math(a, b) {
        switch (this.mode) {
            case 1:
                return a + b
            case 2:
                return a - b
            case 3:
                return a * b
            case 4:
                return a / b
            case 5:
                return Math.pow(a, b)
        }
    }

    update() {
        super.update()

        // output
        const currentOutput = this.getLocalConnectionPointValue('#result')
        var setOutput = Math.max(this._math(this.getConnectionPointValue('#left'), this.getConnectionPointValue('#right')), 0)
        if (Number.isNaN(setOutput))
            setOutput = 0
        
        if (setOutput != currentOutput) {
            this.setConnectionPointValue('#result', setOutput)
        }
    }

    input(action) {
        switch (action) {
            case '#config':
                this.mode += 1
                if (this.mode > 5)
                    this.mode = 1
                this.setInteractableText('#config', OPERATION_CHARACTERS[this.mode])
                this.invalidate()
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

        // draw stuff
        context.fillStyle = 'black'
        context.textAlign = 'center'
        context.textBaseline = 'middle'
        context.font = 'bold 40px monospace'
        context.fillText(OPERATION_CHARACTERS[this.mode], centerX, centerY)

        this.cacheDraw(orig)
    }
}