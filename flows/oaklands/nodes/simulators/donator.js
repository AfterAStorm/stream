/* node */

import { BaseNode } from "../../../node.js"

export class Node extends BaseNode {
    static id         = "donator"
    static display    = "Donator"
    static size       = [.75, 1.25]
    static icon       = "$assets/unknown.png"
    static category   = "simulators"

    constructor() {
        super()
        const size = this.getSize()
        const width = size[0] - 10
        const height = 20
        this.addInteractableRegion('#press', size[0] / 2 - width / 2, size[1] / 2 - height / 2, width, height)
        this.addConnectionPoint('output', 'left', '#out1', 'The user id of the user that bought it')
        this.addConnectionPoint('output', 'left', '#out2', 'The user id of the user that bought it')

        this.pressed = false
        this.cooldown = false
    }

    update() {
        super.update()
    }

    input(action) {
        switch (action) {
            case '#press':
                if (this.pressed)
                    return
                this.pressed = true
                for (let i = 0; i < 2; i++)
                    this.setConnectionPointValue(`#out${i + 1}`, 12345678)
                this.schedule(() => {
                    for (let i = 0; i < 2; i++)
                        this.setConnectionPointValue(`#out${i + 1}`, 0)
                    this.pressed = false
                }, 1)
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

        const width = size[0] - 10
        const height = 20

        // draw button
        context.fillStyle = this.pressed ? 'red' : 'green'
        context.beginPath()
        context.roundRect(centerX - width / 2, centerY - height / 2, width, height, 10)
        context.fill()

        // text
        context.fillStyle = '#fff'
        context.font = 'bold 15px monospace'
        context.textAlign = 'center'
        context.textBaseline = 'middle'
        context.fillText('Donate', centerX, centerY)
    }
}