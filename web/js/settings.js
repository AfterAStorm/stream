/* web */

export class Keybind {
    constructor(comment, defaultCode) {
        this.comment = comment
        this.code = defaultCode ?? 'n/a'
        this.pressed = false
        this.pressedWas = false
        this.releasedWas = false
    }

    press() {
        if (!this.pressed)
            this.pressedWas = true
        this.pressed = true
    }

    release() {
        if (this.pressed)
            this.releasedWas = true
        this.pressed = false
        this.pressedWas = false
    }

    isPressed() {
        return this.pressed
    }

    wasPressed() {
        if (this.pressedWas) {
            this.pressedWas = false
            return true
        }
        return false
    }

    wasReleased() {
        if (this.releasedWas) {
            this.releasedWas = false
            return true
        }
        return false
    }

    getKey() {
        if (this.isMouse()) {
            switch(this.code) {
                case 1:
                    return 'LMB'
                case 2:
                    return 'RMB'
                case 4:
                    return 'MMB'
            }
            return this.code
        }
        return this.code.toUpperCase().replace("KEY", "").replace("DIGIT", "").replace("NUMPAD", "NUMPAD ")
            .replace("SHIFTLEFT", "SHIFT").replace("CONTROLLEFT", "CONTROL")
            .replace("SHIFTRIGHT", "SHIFT").replace("SHIFTRIGHT", "SHIFT")
    }

    isMouse() {
        return typeof(this.code) === "number"
    }

    toJSON() {
        return this.code
    }
}

export class KeybindManager {
    /**
     * 
     * @param {{String: Keybind}} keybinds 
     */
    constructor(keybinds) {
        this.keybinds = keybinds
        this.changingKeybind = null
        this.createEvents()
        this.load()
        Object.entries(keybinds).reverse().forEach(e => this.createUI(e))
    }

    createEvents() {
        this.changingKeybind = null
        document.addEventListener('keydown', e => {
            if (this.changingKeybind != null) {
                this.changingKeybind.code = e.code.toLowerCase()
                this.changingKeybind.button.value = this.changingKeybind.getKey()
                this.changingKeybind.button.blur()
                this.changingKeybind = null
                this.save()
            }
        })
        document.addEventListener('pointerdown', e => {
            if (this.changingKeybind != null) {
                this.changingKeybind.code = e.buttons
                this.changingKeybind.button.value = this.changingKeybind.getKey()
                this.changingKeybind.button.blur()
                this.changingKeybind = null
                this.save()
            }
        })
    }

    createUI(bind) {
        const settingsMenu = document.querySelector('#settings-dialog')
        const settingsKeybinds = settingsMenu.querySelector('#keybinds')

        const input = document.createElement('input')
        input.type = 'button'
        input.value = bind[1].getKey()
        input.classList.add('keybind', 'desktop')
        bind[1].button = input
        const label = document.createElement('label')
        label.innerText = ' ' + bind[0] + ' - ' + bind[1].comment
        label.classList.add('desktop')

        input.onclick = () => {
            this.changingKeybind = bind[1]
            input.value = '...'
        }

        const br = document.createElement('br')
        br.classList.add('desktop')
        settingsKeybinds.parentNode.insertBefore(br, settingsKeybinds.nextSibling)
        settingsKeybinds.parentNode.insertBefore(label, settingsKeybinds.nextSibling)
        settingsKeybinds.parentNode.insertBefore(input, settingsKeybinds.nextSibling)
    }

    updateUI() {
        Object.keys(this.keybinds).forEach(key => {
            const elements = document.querySelectorAll(`#keybind-${key}`)
            elements.forEach(e => e.innerText = this.keybinds[key].getKey())
        })
    }

    save() {
        if (localStorage != null)
            localStorage.setItem('keybinds', JSON.stringify(this.keybinds))
        this.updateUI()
    }

    load() {
        if (localStorage != null) {
            const keybinds = localStorage.getItem('keybinds')
            if (keybinds != null) {
                Object.entries(JSON.parse(keybinds)).forEach(kb => {
                    if (this.keybinds[kb[0]])
                        this.keybinds[kb[0]].code = kb[1]
                })
            }
        }
        this.updateUI()
    }

    isPressed() {

    }

    releaseAll() {
        Object.values(this.keybinds).forEach(kb => kb.release())
    }

    get(name) {
        return this.keybinds[name]
    }

    /** document events */

    onKeyDown(event) {
        Object.values(this.keybinds).forEach(kb => {if (!kb.isMouse() && event.code.toLowerCase() == kb.code) kb.press()})
    }

    onKeyUp(event) {
        Object.values(this.keybinds).forEach(kb => {if (!kb.isMouse() && event.code.toLowerCase() == kb.code) kb.release()})
    }

    onPointerDown(event) {
        Object.values(this.keybinds).forEach(kb => {if (kb.isMouse() && (event.buttons & kb.code) != 0) kb.press()})
    }

    onPointerUp(event) {
        Object.values(this.keybinds).forEach(kb => {if (kb.isMouse()) kb.release()})
    }
}

class Setting {
    constructor(comment, initial) {
        this.comment = comment
        this.value = initial
        this.handlers = []
    }

    createInput() {
        throw Error('not implemented')
    }

    getValue() {
        return null
    }

    addChangeHandler(handler) {
        this.handlers.push(handler)
        handler(this.getValue())
    }

    runHandlers() {
        const value = this.getValue()
        this.handlers.forEach(h => h(value))
    }

    update() {
        throw Error('not implemented')
    }
}

export class BoolSetting extends Setting {
    constructor(...args) {
        super(...args)
    }

    createInput(input) {
        input.type = 'checkbox'
        input.checked = this.value
        input.classList.add('keybind')
    }

    getValue() {
        return this.value
    }

    update(input) {
        this.value = input.checked
    }
}

export class CycleSetting extends Setting {
    constructor(comment, values) {
        super(comment, 0)
        this.values = values
    }

    createInput(input) {
        input.type = 'button'
        input.value = this.values[this.value][0]
        input.classList.add('keybind')
    }

    getValue() {
        return this.values[this.value][1]
    }

    update(input) {
        this.value = (this.value + 1) % this.values.length
        input.value = this.values[this.value][0]
    }
}

export class SettingManager {
    /**
     * 
     * @param {{String: Setting}} settings 
     */
    constructor(settings) {
        this.settings = settings
        this.changingKeybind = null
        this.createEvents()
        this.load()
        Object.entries(settings).reverse().forEach(e => this.createUI(e))
    }

    save() {
        if (!localStorage)
            return
        const object = {}
        Object.entries(this.settings).forEach(e => object[e[0]] = e[1].value)
        localStorage.setItem('settings', JSON.stringify(object))
    }

    load() {
        if (!localStorage)
            return
        const object = localStorage.getItem('settings')
        if (object != null) {
            Object.entries(JSON.parse(object)).forEach(e => {
                if (this.settings[e[0]]) {
                    this.settings[e[0]].value = e[1]
                    this.settings[e[0]].runHandlers()
                }
            })
        }
    }

    createEvents() {

    }

    get(name) {
        return this.settings[name]
    }

    getValue(name) {
        return this.get(name).getValue()
    }

    createUI(bind) {
        const settingsMenu = document.querySelector('#settings-dialog')
        const settingsKeybinds = settingsMenu.querySelector('#general')

        const input = document.createElement('input')
        bind[1].createInput(input)
        //input.classList.add('keybind', 'desktop')
        const label = document.createElement('label')
        label.innerText = ' ' + bind[0] + ' - ' + bind[1].comment
        label.classList.add('desktop')

        input.onclick = () => {
            bind[1].update(input)
            bind[1].runHandlers()
            this.save()
        }

        const br = document.createElement('br')
        br.classList.add('desktop')
        settingsKeybinds.parentNode.insertBefore(br, settingsKeybinds.nextSibling)
        settingsKeybinds.parentNode.insertBefore(label, settingsKeybinds.nextSibling)
        settingsKeybinds.parentNode.insertBefore(input, settingsKeybinds.nextSibling)
    }
}