/* node */

import { BaseNode } from "../../../node.js"

const NAMES = {
    'Select': 0,
    'Visitor': 1,
    'Owner': 10,
}

export class Node extends BaseNode {
    static id         = "chat_commander"
    static display    = "Chat Commander"
    static size       = [.75, .75]
    static icon       = "$assets/unknown.png"
    static category   = "simulators"

    constructor() {
        super()
        this.addInteractable('#config', 'bottom', .5, '+', this.getSize()[0] - 30, '10px monospace')
        this.addConnectionPoint('output', 'right', '#result', 'Sends a signal based on chat messages\n' + Object.entries(NAMES).filter(x => x[1] > 0).map(pair => `**Output ⚡ ${pair[1]} = ${pair[0]}`).join('\n'))
        this.setConnectionPointValue('#result', 0)

        this.value = 0
    }

    serialize() {
        const data = super.serialize()
        data['value'] = this.value
        return data
    }

    deserialize(data) {
        super.deserialize(data)
        this.value = data.value ?? 0
        this.setConnectionPointValue('#result', this.value)
        this.setInteractableText('#config', Object.entries(NAMES).find(pair => pair[1] == this.value)[0])
    }

    update() {
        super.update()

        if (this.getLocalConnectionPointValue('#result') != this.value)
            this.setConnectionPointValue('#result', this.value)
    }

    input(action) {
        switch (action) {
            case '#config':
                this.getUserSelectionInput(NAMES, this.value).then(v => {
                    this.value = v || this.value
                    this.setConnectionPointValue('#result', this.value)
                    this.setInteractableText('#config', Object.entries(NAMES).find(pair => pair[1] == this.value)[0])
                    this.schedule(() => {
                        this.value = 0
                        this.setConnectionPointValue('#result', this.value)
                        this.setInteractableText('#config', Object.entries(NAMES).find(pair => pair[1] == this.value)[0])
                    }, 1)
                })
                break
        }
    }

    /**
     * @param {CanvasRenderingContext2D} context 
     */
    draw(context) {
        super.draw(context)
    }
}