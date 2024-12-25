/* node */

import { BaseNode } from "../../../node.js"

export class Node extends BaseNode {
    static id         = "joystick"
    static display    = "Joystick"
    static size       = [1, 1]
    static icon       = "$assets/joystick.png"
    static category   = "user input"

    constructor() {
        super()
        this.addConnectionPoint('output', 'right', '#result1', 'Right Output\n**Outputs: ⚡ 0-10')
        this.addConnectionPoint('output', 'top', '#result2', 'Top Output\n**Outputs: ⚡ 0-10')
        this.addConnectionPoint('output', 'left', '#result3', 'Left Output\n**Outputs: ⚡ 0-10')
        this.addConnectionPoint('output', 'bottom', '#result4', 'Bottom Output\n**Outputs: ⚡ 0-10')
        for (let i = 0; i < 4; i++)
            this.setConnectionPointValue(`#result${i + 1}`, 0)

        this.pressed = false
        this.cooldown = false
        this.dragX = 0
        this.dragY = 0
    }

    // it's a bit off when rotated... but whatever

    isHovering(x, y) {
        const hit = super.isHovering(x, y)

        const pos = this.getRelative(x, y)
        const size = this.getSize()
        const distance = Math.sqrt(
            Math.pow(pos[0] - size[0] / 2, 2) + Math.pow(pos[1] - size[1] / 2, 2)
        )
        if (distance < size[0] / 2 / 1.5) {
            return false
        }
        return hit
    }

    update() {
        super.update()

        const size = this.getSize()
        const distX = this.dragX / (size[0] / 3.2)//3) // make it 3.2 so it goes a bit over 1 so the Math.floor "works properly"
        const distY = this.dragY / (size[1] / 3.2)//3)
        this.setConnectionPointValue(`#result2`, distY < 0 ? Math.floor(-distY * 10) : 0)
        this.setConnectionPointValue(`#result4`, distY > 0 ? Math.floor(distY * 10) : 0)
        this.setConnectionPointValue(`#result3`, distX < 0 ? Math.floor(-distX * 10) : 0)
        this.setConnectionPointValue(`#result1`, distX > 0 ? Math.floor(distX * 10) : 0)

        const isPressed = this.isPointerPressed()
        //if (!isPressed && this.cooldown)
        //    this.cooldown = false
        if (!isPressed) {
            this.pressed = false
            this.dragX += -this.dragX / 10
            this.dragY += -this.dragY / 10
            return // "mouse" isn't pressed
        }

        //if (this.cooldown)
        //    return // under cooldown

        // find distance
        const pos = this.getRelativePointer()
        const distance = Math.sqrt(
            Math.pow(pos[0] - size[0] / 2, 2) + Math.pow(pos[1] - size[1] / 2, 2)
        )
        if (distance < size[0] / 2 / 1.5 || this.pressed) { // if less than radius
            this.pressed = true
            this.dragX = (pos[0] - size[0] / 2)
            this.dragY = (pos[1] - size[1] / 2)
            if (distance > size[0] / 3) { // lock to unit circle if too far away
                this.dragX = size[0] / 3 * this.dragX / distance
                this.dragY = size[1] / 3 * this.dragY / distance
            }
            /*this.pressed = true
            this.setConnectionPointValue('#pressed', 10)
            this.schedule(() => {
                this.pressed = false
                this.setConnectionPointValue('#pressed', 0)
            }, 1)*/
        }
    }

    /**
     * @param {CanvasRenderingContext2D} context 
     */
    draw(context) {
        super.draw(context)

        const size = this.getSize()

        context.fillStyle = '#eee'
        context.strokeStyle = '#aaa'
        context.beginPath()
        context.arc(size[0] / 2, size[1] / 2, size[0] / 2 / 1.5, 0, Math.PI * 2)
        context.fill()
        context.stroke()

        // draw button
        context.globalAlpha = .9
        context.fillStyle = this.pressed ? 'green' : 'red'
        context.beginPath()
        context.arc(size[0] / 2 + this.dragX, size[1] / 2 + this.dragY, size[0] / 2 / 1.5, 0, Math.PI * 2)
        context.fill()
        context.globalAlpha = 1
    }
}