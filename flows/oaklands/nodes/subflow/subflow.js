/* node */

import { BaseNode } from "../../../node.js"

export class Node extends BaseNode {
    static id         = "subflow_node"
    static display    = "Subflow"
    static size       = [.75, .75]
    static icon       = "$assets/subflow.png"
    static category   = "subflow"

    constructor() {
        super()
        this.addInteractable('#select', 'top', .5, 'Unnamed', 60, "10px monospace")
        this.addInteractable('#edit', 'bottom', .5, 'edit', 20, "20px 'Material Symbols Outlined'")
        this._num_in = 1
        this._num_out = 1
        this.addConnectionPoint('input', 'left', '#in1', 'description 1')
        this.addConnectionPoint('output', 'right', '#out1', 'description 1')

        this.cached = false

        this.subflow_index = -2
        this.runtime = null
        this.runtime_inputs = null
        this.runtime_outputs = null
        this.runtime_double_updated_nodes = null
    }

    serialize() {
        const data = super.serialize()
        data['subflow'] = this.subflow_index
        data['state'] = this.runtime?.serialize()
        console.log('SERIALIZE', data)
        return data
    }

    deserialize(data) {
        console.log('deserialize', data, this.flow.subflows.length)
        super.deserialize(data)
        this.subflow_index = data.subflow
        if (this.flow.subflows.length > this.subflow_index && this.subflow_index >= 0) {
            // cannot use .refresh since .flow is different during deserialization!
            console.log('DE DE SERIALIZE AAAAAAAAAAAAAAAAAA', this, data)
            const subflow = this.flow.subflows[this.subflow_index]
            this.runtime = subflow.createRuntime()
            this.setupRuntime(this.runtime)
            this.setInteractableText('#select', subflow.name)
            this.refreshPoints()
            if (data.state)
            {
                console.log('AND THE STATE', data)
                this.runtime.deserializeState(data.state)
            }
        }
    }

    setupRuntime(runtime) {
        runtime.onupdate = () => {
            console.log('REFRESH?')
            this.refreshPoints()
        }
    }

    refreshPoints() {
        // we don't use the cloned .flow because the saved state may overwrite the node descriptions
        const inputs = this.runtime != null ? this.runtime.base.nodes.filter(node => node.id == 'subflow_input') : []
        const outputs = this.runtime != null ? this.runtime.base.nodes.filter(node => node.id == 'subflow_output') : []
        this.runtime_inputs = this.runtime != null ? this.runtime.flow.nodes.filter(node => node.id == 'subflow_input') : []
        this.runtime_outputs = this.runtime != null ? this.runtime.flow.nodes.filter(node => node.id == 'subflow_output') : []

        // create new points if needed
        if (this._num_in < inputs.length) {
            for (let i = 0; i < inputs.length - this._num_in; i++) {
                // console.log('create new in')
                this.addConnectionPoint('input', 'left', `#in${this._num_in + i + 1}`, 'description')
            }
            this._num_in = inputs.length
        }

        if (this._num_out < outputs.length) {
            for (let i = 0; i < outputs.length - this._num_out; i++) {
                // console.log('create new out')
                this.addConnectionPoint('output', 'right', `#out${this._num_out + i + 1}`, 'description')
            }
            this._num_out = outputs.length
        }

        for (let i = 0; i < this._num_in; i++) {
            const point = this.getConnectionPoint(`#in${i + 1}`)
            point.active = inputs.length >= i + 1
            point.tooltip = point.active ? inputs[i].description : ''
        }

        for (let i = 0; i < this._num_out; i++) {
            const point = this.getConnectionPoint(`#out${i + 1}`)
            point.active = outputs.length >= i + 1
            point.tooltip = point.active ? outputs[i].description : ''
        }
        this.invalidate()
        this.runtime_double_updated_nodes = null
        if (this.runtime != null)
            this.runtime_double_updated_nodes = this.runtime.flow.nodes.filter((n) => n._connections.some(c => c.points?.any(p => inputs.includes(p.node))))
    }

    update() {
        super.update()

        if (!this.runtime) {
            if (this.flow.subflows.length == 0) {
                this.subflow_index = -1
                return
            }
            if (this.subflow_index == -2) {
                // find starting
                const flows = this.getEligibleSubflows()
                if (flows.length == 0) {
                    this.setInteractableText('#select', 'Create...')
                    this.subflow_index = -1
                }
                else
                    this.subflow_index = this.editor.editor.main_flow.subflows.indexOf(flows[0])
            }
            if (this.subflow_index < 0)
                return
            if (this.flow.subflows.length - 1 < this.subflow_index) {
                console.warn('Not enough subflows to satisfy subflow node!', this.subflow_index, this.flow.subflows)
                return
            }
            this.refresh() // setup runtime
        }

        // use cached nodes, set subflow values
        this.runtime_inputs.forEach((node, i) => {
            node.set(this.getConnectionPointValue(`#in${i + 1}`))
        })

        // update subflow
        this.runtime.update(this.editor)
        // force a second update to stay "inline", as if the input node didn't have a tick-wait
        this.runtime.update(this.editor, this.runtime_double_updated_nodes) //inputs.includes(n))
        
        // update output node from subflow
        this.runtime_outputs.forEach((node, i) => {
            this.setConnectionPointValue(`#out${i + 1}`, node.getConnectionPointValue('#input'))
        })
    }

    reset() {
        console.log('RESET!')
        this.subflow_index = -1
        this.runtime = null
        this.refreshPoints()
        this.setInteractableText('#select', '*Deleted*')
    }

    refresh() {
        console.warn(this, 'REFRESH')
        if (this.editor.editor.main_flow.subflows.length > this.subflow_index) {
            const subflow = this.editor.editor.main_flow.subflows[this.subflow_index]
            this.runtime = subflow.createRuntime() // we assume the runtime changed...
            this.setupRuntime(this.runtime)
            this.setInteractableText('#select', subflow.name)
            this.refreshPoints()
            //this.runtime = null
        }
        else {
            console.warn('Refresh had no subflow to relax onto?')
            this.reset()
        }
    }

    getSubflowsContainedIn(subflow_index) {
        const found = []
        if (subflow_index < 0)
            return found
        for (const node of this.editor.editor.main_flow.subflows[subflow_index].nodes.filter(n => n.id == 'subflow_node')) {
            if (!found.includes(node.subflow_index))
                found.push(node.subflow_index)
        }
        return found
    }

    getAllSubflowsContainedIn(subflow_index) {
        const found = [...this.getSubflowsContainedIn(subflow_index)]
        const visited = []

        while (found.length > 0) {
            const child = found.pop()
            if (visited.includes(child)) continue;
            visited.push(child)
            found.push(...this.getSubflowsContainedIn(child))
        }
        
        return visited
    }

    getEligibleSubflows() { // get eligable subflows in current flow (merp design, but it works)
        const currentIndex = this.editor.editor.main_flow.subflows.indexOf(this.editor.editor.flow)
        // find flows we can put this subflow into
        const descendants = {}
        for (const subflow_id in this.flow.subflows) {
            descendants[subflow_id] = this.getAllSubflowsContainedIn(subflow_id)
        }

        const eligable = this.editor.editor.main_flow.subflows.filter((sb, i) => {
            return i != currentIndex && !descendants[i].includes(currentIndex)
        })

        return eligable
    }

    input(action) {
        switch (action) {
            case '#edit':
                if (this.runtime == null || this.subflow_index < 0) {
                    this.input('#select')
                    return
                }
                this.editor.changeFlows(this.runtime.base)
                break
            case '#select':
                const values = {'Create new...': -1}
                console.log(this)
                this.getEligibleSubflows().forEach((subflow, i) => values[subflow.name] = this.editor.editor.main_flow.subflows.indexOf(subflow)) // can't use i because if we filtered some... yea
                this.getUserSelectionInput(values, this.subflow_index).then(v => {
                    if (v < 0) {
                        // create new
                        this.getUserTextInput('New Subflow Name', 'New subflow name').then(name => {
                            const existing = this.editor.editor.main_flow.subflows.find(sf => sf.name == name)
                            if (existing != null) {
                                return // can't create multiple of the same
                            }
                            this.editor.editor.main_flow.createSubflow(name)
                            this.subflow_index = this.editor.editor.main_flow.subflows.length - 1
                            this.refresh()
                        })
                        return
                    }
                    if (v == this.subflow_index)
                        return // same, don't do nothin!
                    this.subflow_index = parseInt(v)
                    // if it doesn't exist after we just asked for it, sadness will ensue
                    this.refresh()
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
        
        //this.cacheDraw(orig)
    }
}