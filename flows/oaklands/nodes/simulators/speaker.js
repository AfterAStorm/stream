/* node */

import { BaseNode } from "../../../node.js"

function lerp(a, b, t) {
    return a + (b - a) * t
}

function lerpV2(a, b, t) {
    return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]
}

export class Node extends BaseNode {
    static id         = "speaker"
    static display    = "Speaker"
    static size       = [.75, .75]
    static icon       = "$assets/speaker.png"
    static category   = "simulators"

    constructor() {
        super()
        this.addConnectionPoint('input', 'left', '#input', 'Sends a "chat message" when powered, supports roblox Rich Text options\n**Templates:**\n{display_name} - The name of the user id provided through the number input-- only works in-game\n{num} - The number provided in the input\n\nNot supported options include: font face, font family, font weight, font size')

        this.template = '<b><i><u>Formatted text</u></i></b>'
        this.messages = []
        this.lastValue = 0
    }

    serialize() {
        const data = super.serialize()
        data['template'] = this.template
        return data
    }

    deserialize(data) {
        super.deserialize(data)
        this.template = data.template || ''
    }

    update() {
        super.update()

        const value = this.getConnectionPointValue('#input')
        this.editor._speaker = this.editor._speaker ?? false
        if (value != this.lastValue) {
            this.lastValue = value
            if (!this.editor._speaker && value > 0) {
                this.editor._speaker = true
                const editor = this.editor
                setTimeout(() => {
                    editor._speaker = false
                }, 4000)
                this.messages.push(this.template.replaceAll('{num}', value).replaceAll('{display_name}', 'UserNameHere'))
                setTimeout(() => {
                    this.messages.splice(0, 1)
                }, 16000)
            }
        }

        // changing value
        const isPressed = this.isPointerPressed()
        if (!isPressed && this.cooldown)
            this.cooldown = false
        if (!isPressed)
            return // "mouse" isn't pressed

        if (this.cooldown)
            return // ignore wehn under cooldown

        // find distance
        const size = this.getSize()
        const pos = this.getRelativePointer()
        
        if (this.isHoveringRectangle(pos, 20, size[1], size[0] - 40, 20)) {
            this.cooldown = true
            this.getUserTextInput(this.template).then(v => {
                this.template = v
            })
        }
    }

    /**
     * @param {CanvasRenderingContext2D} context 
     */
    draw(context) {
        super.draw(context)

        const size = this.getSize()

        const line1a = [size[0] / 4, 0]
        const line1b = [size[0] / 6, -40]
        const line2a = [size[0] - size[0] / 4, 0]
        const line2b = [size[0] - size[0] / 6, -40]
        const line1c = lerpV2(line1a, line1b, .8)
        const line2c = lerpV2(line2a, line2b, .8)

        // draw lightning
        if (this.editor != null && !(this.editor._speaker ?? false)) {
            context.strokeStyle = '#a0a0ff'
            context.beginPath()
            context.moveTo(...line1c)
            for (let i = 0; i < 20; i++) {
                const x = lerp(line1c[0] + 2, line2c[0], i / 19)
                const y = (Math.random() * 2 - 1) * 2
                context.lineTo(x, y + (line1c[1] + line2c[1]) / 2)
            }
            context.stroke()
        }

        // draw transistors
        context.strokeStyle = '#dfdfdf'
        context.beginPath()
        context.moveTo(...line1a)
        context.lineTo(...line1b)
        context.moveTo(...line2a)
        context.lineTo(...line2b)
        context.stroke()

        const centerX = size[0] / 2
        const centerY = size[1] / 2

        // draw antenna
        context.strokeStyle = this.getLocalConnectionPointValue('#input') > 0 ? this.ON_COLOR : 'lightgrey'
        context.beginPath()
        context.moveTo(size[0], centerY)
        context.lineTo(size[0] * 2, centerY)
        context.stroke()

        // draw chat bubble
        var y = -70
        for (const message of this.messages.slice().reverse()) {
            // <i><b>hello</b></i> will be (i, <b>hello</b>)
            const comments = /<!--.*?-->/g
            const pattern = /<(?<tag>.*?)\s*(?<args>.*?)>(?<content>.*?)<\/\1>/ // not global so it doesn't keep index since we are modifying the input
            const argumentPattern = /(.*?)="(.*?)"\s*/g
            // turn a string into a sequence of control characters, so XML into minecraft-like component system --> can be read tag-by-char instead of tag-by-tag

            // before bold <b>before italics <i>Formatted text</i> after italics</b> and an <i>epic hero!</i>

            const TAG_BYTES = {
                // we dont talk about 1
                'b': 2,
                'i': 3,
                'u': 4, // underline
                's': 5, // strike
                'sc': 6,
                'smallcaps': 6,
                'uc': 7,
                'uppercase': 7,
                'mark': 8, // more like "highlight"?
                'stroke': 9,
                'font': 10,
                'stroke': 11,
            }

            var contents = message.replaceAll(comments, '')//this.template

            function getTag(tag, args, finisher) {
                return [TAG_BYTES[tag] + (finisher ? 20 : 0), args] // tag + (finisher ? '/' : '')
            }

            function parseArgs(args) {
                if (args.length < 2)
                    return {}
                const matches = args.matchAll(argumentPattern)
                const out = {}
                for (const match of matches) {
                    out[match[1]] = match[2]
                }
                return out
            }

            function findComponents(string) {
                const match = pattern.exec(string)
                if (match == null) // just a basic string now :D
                    return [string]
                const comps = []

                if (match.index > 0)
                    comps.push(string.substring(0, match.index))
                comps.push(getTag(match.groups.tag, parseArgs(match.groups.args), false), ...findComponents(match.groups.content), getTag(match.groups.tag, null, true))
                if (match.index + match[0].length < string.length)
                    comps.push(...findComponents(string.substring(match.index + match[0].length)))

                return comps
            }

            const components = findComponents(contents)

            context.font = '20px monospace'
            const width = context.measureText(components.filter(x => !(x instanceof Object)).join('')).width
            context.fillStyle = '#fff'
            context.beginPath()
            context.roundRect(size[0] / 2 - width / 2 - 5, y - 5, width + 10, 20 + 10, 5)
            context.fill()

            context.textAlign = 'left'
            context.textBaseline = 'top'
            context.fillStyle = '#000'

            var x = size[0] / 2 - width / 2 // variable x

            // context.font = '20px monospace'

            const attributes = []
            const attributeArgs = {}
            function toggleAttr(attr, toggle) {
                if (toggle) {
                    if (!attributes.includes(attr))
                        attributes.push(attr)
                }
                else {
                    if (attributes.includes(attr))
                        attributes.splice(attributes.indexOf(attr), 1)
                }
            }

            const ATTR_MAP = {
                [TAG_BYTES.b]: '*bold',
                [TAG_BYTES.i]: '*italic',
                [TAG_BYTES.u]: 'underline',
                [TAG_BYTES.s]: 'strikethrough',
                [TAG_BYTES.uc]: 'uppercase',
                [TAG_BYTES.sc]: 'smallcaps',
                [TAG_BYTES.mark]: 'mark',
                [TAG_BYTES.font]: 'font',
                [TAG_BYTES.stroke]: 'stroke'
            }

            for (let component of components) {
                if (component instanceof Object) {
                    const type = component[0]
                    if (type >= 20) {
                        // UNDO
                        const mapped = ATTR_MAP[type - 20]
                        if (mapped)
                            toggleAttr(mapped, false)
                    }
                    else {
                        // DO
                        const mapped = ATTR_MAP[type]
                        if (mapped)
                            toggleAttr(mapped, true)
                        attributeArgs[type] = component[1]
                    }
                }
                else {
                    context.font = `${attributes.filter(x => x.startsWith('*')).map(x => x.substring(1)).join(' ')} 20px monospace`
                    context.fontVariantCaps = attributes.includes('smallcaps') ? 'small-caps' : 'normal'

                    const compWidth = context.measureText(component).width
                    

                    if (attributes.includes('uppercase'))
                        context = context.toUpperCase()
                    if (attributes.includes('mark')) { // <mark color="#ffff00" transparency="0.5">before</mark> bold <b>before italics <i>Formatted text</i> after italics</b> and <sc>an</sc> <i>epic hero!</i>
                        const color = attributeArgs[TAG_BYTES.mark].color ?? '#fff'
                        const trans = attributeArgs[TAG_BYTES.mark].transparency ?? 0
                        context.fillStyle = color
                        context.globalAlpha = 1 - trans
                        context.fillRect(x, y, compWidth, 20)
                        context.globalAlpha = 1
                    }

                    if (attributes.includes('stroke')) {
                        const color = attributeArgs[TAG_BYTES.stroke].color ?? '#fff'
                        const trans = attributeArgs[TAG_BYTES.stroke].transparency ?? 0
                        const join = attributeArgs[TAG_BYTES.stroke].joins ?? 'miter'
                        const thickness = attributeArgs[TAG_BYTES.stroke].thickness != null ? Number.parseInt(attributeArgs[TAG_BYTES.stroke].thickness) : 2
                        context.lineWidth = thickness
                        context.lineJoin = join
                        context.strokeStyle = color
                        context.globalAlpha = 1 - trans
                        context.strokeText(component, x, y)
                        context.globalAlpha = 1
                    }

                    //<mark color="#ffff00" transparency="0.5">before</mark><font color="#ff0000">red</font> <stroke color="#ff0000">strokey</stroke> bold <b>before italics <i>Formatted text</i> after italics</b> and <sc>an</sc> <i>epic hero!</i>

                    context.fillStyle = '#000'
                    if (attributes.includes('font')) {
                        const color = attributeArgs[TAG_BYTES.font].color ?? '#000'
                        if (color.startsWith('#')) {
                            // it's hex, we dont have to do anything :3
                            // i assume its valid
                            // if its not then whatever
                            context.fillStyle = color
                        }
                        else if (color.startsWith('rgb')) {
                            // rgb... ugh
                            const pad = (c) => c.length === 1 ? "0" + hex : hex
                            const colors = color.substring(4, color.length - 1).split(',')
                            if (colors.length == 3)
                                context.fillStyle = "#" + pad(Number.parseInt(colors[0]).toString(16)) + pad(Number.parseInt(colors[1]).toString(16)) + pad(Number.parseInt(colors[2]).toString(16))
                        }
                        const trans = attributeArgs[TAG_BYTES.font].transparency ?? 1
                        
                        context.globalAlpha = trans
                    }

                    if (attributes.includes('underline')) {
                        context.fillRect(x, y + 20, compWidth, 5)
                    }

                    context.fillText(component, x, y)
                    context.globalAlpha = 1
                    x += compWidth
                }
            }
            y -= 40
        }

        // draw value
        context.fillStyle = '#fff'
        context.save()
        context.beginPath()
        context.rect(0, size[1], size[0], 40)
        context.clip()

        context.beginPath()
        context.roundRect(10, size[1] - 20, size[0] - 20, 40, 10)
        context.fill()
        
        context.fillStyle = '#ddd'
        context.beginPath()
        context.roundRect(11, size[1] - 21, size[0] - 22, 40, 10)
        context.fill()
        
        context.restore()

        context.fillStyle = '#000'
        context.textAlign = 'center'
        context.textBaseline = 'middle'
        context.font = '10px monospace'
        context.fillText('Edit', centerX, size[1] + 10)
    }
}