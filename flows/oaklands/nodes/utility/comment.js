/* node */

import { BaseNode } from "../../../node.js"

export class Node extends BaseNode {
    static id         = "comment"
    static display    = "Comment"
    static size       = [2, .5]
    static icon       = "$assets/comment.png"//"https://icon2.cleanpng.com/20180410/vde/avbaqf66l.webp"
    static category   = "utility"

    constructor() {
        super()

        //this.cached = true

        this.comment = 'Enter text here...'
        this.cooldown = false
        this.size = [2, .5]
    }

    serialize() {
        const data = super.serialize()
        data['comment'] = this.comment
        return data
    }

    deserialize(data) {
        super.deserialize(data)
        this.comment = data.comment || ''
    }

    update() {
        super.update()

        // changing value
        const isPressed = this.isPointerPressed()
        if (!isPressed && this.cooldown)
            this.cooldown = false
        if (!isPressed)
            return // "mouse" isn't pressed

        if (this.cooldown)
            return // ignore wehn under cooldown

        const size = this.getSize()
        const pos = this.getRelativePointer()
        if (this.isHoveringRectangle(pos, size[0] / 2 - 10, size[1], 20, 20)) {
            this.cooldown = true
            this.getUserTextInput(this.comment).then(v => {
                this.comment = v
            })
        }
    }

    /**
     * @param {CanvasRenderingContext2D} context 
     */
    draw(context) {
        super.draw(context)
        /*const context2 = super.draw(context)
        if (!context2)
            return this.cacheDraw(context)
        const orig = context
        context = context2*/

        const size = this.getSize()
        
        const centerX = size[0] / 2
        const centerY = size[1] / 2
        
        // edit icon
        context.save()
        context.beginPath()
        context.rect(0, size[1], size[0], 40)
        context.clip()

        context.beginPath()
        context.roundRect(centerX - 10, size[1] - 20, 20, 40, 10)
        context.fill()
        
        context.fillStyle = '#ddd'
        context.beginPath()
        context.roundRect(centerX - 9, size[1] - 21, 20 - 2, 40, 10)
        context.fill()
        
        context.restore()

        context.fillStyle = '#000'
        context.textAlign = 'center'
        context.textBaseline = 'middle'
        context.font = '20px \'Material Symbols Outlined\''
        context.fillText('edit', centerX, size[1] + 10)

        context.font = '20px monospace'
        const commentWidth = context.measureText(this.comment)
        // this is technically an illegal action, and should be handled in update()
        // but since we dont have access to context, we have to do it here
        // that means the size will always be 1 frame behind... but it doesn't really matter
        this.size[0] = Math.max((commentWidth.width + 10) / 100, 1)
        context.fillText(this.comment, centerX, centerY)

        //this.cacheDraw(orig)
    }
}