
"use strict";

var envelope = (function(elem, conf) {

    // It faster to access a property than to access a variable...
    // See https://jsperf.com/vars-vs-props-speed-comparison/1

    const NS = "http://www.w3.org/2000/svg";

    var element = elem;    // DOM element

    // For the user convenience, the label can be set with the "data-label" attribute.
    // If another label is set in data-config then this later definition will override data-label.
    let default_label = element.dataset.label !== undefined ? element.dataset.label : '';

    // For the user convenience, the label can be set with the "data-label" attribute.
    // If another label is set in data-config then this later definition will override data-label.
    let default_value = element.dataset.value !== undefined ? element.dataset.value : 0;

    let defaults = {
        // user configurable
        // no camelCase because we want to be able to have the same name in data- attributes.
        label: default_label,
        env_color: 'blue',
        env_width: 4,
        with_label: true,
        width_A: 0.25,
        width_D: 0.25,
        width_R: 0.25
    };

    let data_config = JSON.parse(element.dataset.config || '{}');
    let config = Object.assign({}, defaults, conf, data_config);

    // NOTE: viewBox must be 100x120: 100x100 for the arc and 100x20 below for the label.

    // internals
    var points = {
        a: 0,
        d: 0,
        s: 0,
        r: 0
    };

    var env = {     // current enveloppe
        attack: 1,
        decay: 1,
        sustain: 0.5,
        release: 1
    };

    init();
    draw();

    function init() {
        console.log('INIT');
    }

    function setEnvelope(e) {
        env = e;
    }

    /**
     * Draw a read-only (illustrative) ADSR envelope.
     * @param env
     * @param container_id
     */
/*
    function drawADSR(env, container_id) {

        // console.log('drawADSR', env, container_id);

        let canvas = document.getElementById(container_id);
        let ctx = canvas.getContext("2d");

        const width = canvas.width;
        const height = canvas.height;

        const width_A = 0.25;
        const width_D = 0.25;
        const width_R = 0.25;

        // start position
        let x = 0;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
        ctx.moveTo(0, height); // start at lower left corner

        // Attack
        x += env.attack * width_A * width;
        ctx.lineTo(x, 0);

        // Decay
        x += env.decay * width_D * width;
        ctx.lineTo(x, height - env.sustain * height);

        // Sustain
        x = width - (env.release * width_R * width);
        ctx.lineTo(x, height - env.sustain * height);

        // Release
        ctx.lineTo(width, height);

        // stroke
        ctx.lineWidth = 2;
        // ctx.strokeStyle = "#ffec03";
        ctx.strokeStyle = THEME[settings.theme].positiveColor;
        ctx.stroke();
        ctx.closePath();
    }
*/


    /**
     * viewBox is (0 0 1 1)
     *
     * env is {attack:0..1, decay:0..1, sustain:0..1, release: 0..1}
     */
    function getPath(e) {

        let p = '';

        // start position
        let x = 0.0;
        let y = 0.0;
        p += `M${x * 100.0},${100.0 - y}`; // start at lower left corner

        // Attack
        x += e.attack * config.width_A;
        y = 100.0;
        p += `L${x * 100.0},${100.0 - y}`;

        // Decay
        x += e.decay * config.width_D;
        y = e.sustain * 100.0;
        p += `L${x * 100.0},${100.0 - y}`;

        // Sustain
        x = 1.0 - (e.release * config.width_R);
        y = e.sustain * 100.0;
        p += `L${x * 100.0},${100.0 - y}`;

        // Release
        x = 1.0;
        y = 0.0;
        p += `L${x * 100.0},${100.0 - y}`;

        console.log(p);

        return p;
    }

    function draw() {

        console.log('draw', element);

        // https://www.w3.org/TR/SVG/render.html#RenderingOrder:
        // Elements in an SVG document fragment have an implicit drawing order, with the first elements in the SVG document
        // fragment getting "painted" first. Subsequent elements are painted on top of previously painted elements.
        // ==> first element -> "painted" first

        element.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", "http://www.w3.org/1999/xlink");
        element.setAttributeNS(null, "viewBox", "0 0 100 100");
        // element.setAttribute("class", "envelope");

        let back = document.createElementNS(NS, "path");
        back.setAttributeNS(null, "d", getPath(env));
        back.setAttribute("stroke", config.env_color);
        // back.setAttribute("stroke", "#000");
        back.setAttribute("stroke-width", "" + config.env_width);
        back.setAttribute("fill", "transparent");
        // back.setAttribute("class", "back");
        element.appendChild(back);

        // let valueText = document.createElementNS(NS, "text");
        // valueText.setAttributeNS(null, "x", "50");
        // valueText.setAttributeNS(null, "y", "55");
        // valueText.setAttribute("text-anchor", "middle");
        // valueText.setAttribute("cursor", "default");
        // valueText.setAttribute("class", "value");
        // valueText.textContent = getValue().toFixed(2);
        // element.appendChild(valueText);
        //
        // let path = document.createElementNS(NS, "path");
        // path.setAttributeNS(null, "d", getPath(getPolarAngle()));
        // path.setAttribute("stroke", config.arc_color);
        // path.setAttribute("stroke-width", "" + config.arc_width * config.radius / 100);
        // path.setAttribute("fill", "transparent");
        // path.setAttribute("class", "arc");
        // element.appendChild(path);
        //
        // if (config.cursor_dot_size > 0) {
        //     let d = getDotCursor(getPolarAngle());
        //     let dot = document.createElementNS(NS, "circle");
        //     dot.setAttributeNS(null, "cx", d.cx);
        //     dot.setAttributeNS(null, "cy", d.cy);
        //     dot.setAttributeNS(null, "r", d.r);
        //     // path.setAttribute("class", "arc");
        //     element.appendChild(dot);
        // }
        //
        // if (config.with_label) {
        //     let labelText = document.createElementNS(NS, "text");
        //     labelText.setAttributeNS(null, "x", "50");
        //     labelText.setAttributeNS(null, "y", "110");
        //     labelText.setAttribute("text-anchor", "middle");
        //     valueText.setAttribute("cursor", "default");
        //     labelText.setAttribute("class", "label");
        //     labelText.textContent = config.label;
        //     element.appendChild(labelText);
        // }

    }  // draw()

    function redraw() {

        // element.childNodes[1].textContent = getValue(); //.toFixed(2);
        element.childNodes[0].setAttributeNS(null, "d", getPath(getPolarAngle()));

        // if (config.cursor_dot_size > 0) {
        //     let d = getDotCursor(getPolarAngle());
        //     element.childNodes[3].setAttributeNS(null, "cx", d.cx);
        //     element.childNodes[3].setAttributeNS(null, "cy", d.cy);
        // }
    }

    /**
     *
     */
    return {
        set envelope(e) {
            setEnvelope(e);
            redraw();
        }
    };

});
