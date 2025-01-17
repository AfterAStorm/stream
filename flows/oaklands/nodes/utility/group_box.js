/* node */

import { BaseNode } from "../../../node.js"

export class Node extends BaseNode {
    static id         = "group_box"
    static display    = "Group Box"
    static size       = [1, 1]
    static icon       = "$assets/group_box.png"
    static category   = "utility"

    constructor() {
        super()
        
        this.size = [1, 1]

        this.text = 'Group Box'
        this.color = null
        this.cooldown = false
        this.resizing = false
        this.resizeStart = null
    }

    serialize() {
        const data = super.serialize()
        data['text'] = this.text
        data['color'] = this.color
        data['size'] = this.size
        return data
    }

    deserialize(data) {
        super.deserialize(data)
        this.text = data.text ?? this.text
        this.color = data.color ?? null
        this.size = data.size ?? this.size
    }

    isHovering(x, y) {
        const size = this.getSize()
        const pos = this.getRelative(x, y)

        const hovering = this.isHoveringRectangle(pos, -20, -20, 40, 40)
        if (hovering)
            return true

        return false
    }

    update() {
        super.update()
        const size = this.getSize()
        const pos = this.getRelativePointer()

        if (this.resizing) {
            const offsetX = pos[0] - this.resizeStart[0]
            const offsetY = pos[1] - this.resizeStart[1]
            this.size[0] += offsetX / 100
            this.size[1] += offsetY / 100
            this.size[0] = Math.max(this.size[0], .25)
            this.size[1] = Math.max(this.size[1], .25)

            this.resizeStart = [...pos]
        }

        if (this.color == null)
            this.color = this.editor.color
        
        if (!this.isPointerPressed()) {
            this.resizing = false
            return
        }
        if (this.isHoveringRectangle(pos, 20, -10, size[0] - 20, 20)) {
            this.getUserTextInput(this.text).then(v => {
                this.text = v
            })
        }
        const isNowResizing = this.isHoveringRectangle(pos, size[0] - 20, size[1] - 20, 20, 20)
        if (isNowResizing && !this.resizing) {
            this.resizeStart = [...pos]
            this.resizing = true
        }
    }

    /**
     * @param {CanvasRenderingContext2D} context 
     */
    draw(context) {
        // super.draw(context)

        const size = this.getSize()
        
        const centerX = size[0] / 2
        const centerY = size[1] / 2

        // we're overwriting the super method, so this is needed
        if (this.ghost)
            context.globalAlpha = .5
        context.translate(this.position[0], this.position[1])

        context.fillStyle = '#fff'
        context.font = '15px monospace'
        context.textBaseline = 'middle'
        context.textAlign = 'left'
        const textWidth = Math.min(context.measureText(this.text).width, size[0] - 11)

        context.save()
            context.beginPath()
            context.rect(0, 0, 10 - 1, size[1])
            context.rect(9 + textWidth + 2, 0, size[0] - 9 - textWidth - 2, size[1])
            context.rect(0, 7, size[0], size[1] - 7)
            context.clip()

            context.strokeStyle = this.color || '#fff'
            context.lineWidth = 3
            context.setLineDash([5])
            context.beginPath()
            context.rect(0, 0, size[0], size[1])
            context.stroke()
        context.restore()

        context.strokeStyle = '#aaa'
        context.strokeText(this.text, 10, 0)
        context.fillText(this.text, 10, 0)
    }
}