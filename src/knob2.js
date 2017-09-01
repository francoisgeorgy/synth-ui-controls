
    "use strict";

    var knob = (function(elem, conf) {

        // It faster to access a property than to access a variable...
        // See https://jsperf.com/vars-vs-props-speed-comparison/1

        const NS = "http://www.w3.org/2000/svg";
        const CW = true;    // clock-wise
        const CCW = !CW;    // counter clock-wise

        var container = elem;    // DOM element
        var svg;
        var menu;

        // For the user convenience, the label can be set with the "data-label" attribute.
        // If another label is set in data-config then this later definition will override data-label.
        let default_label = container.dataset.label !== undefined ? container.dataset.label : '';

        let defaults = {
            // user configurable
            // no camelCase because we want to be able to have the same name in data- attributes.
            label: default_label,
            with_label: false,
            zero_at: 270.0,      // the 0 degree will be at 270 polar degrees (6 o'clock).
            arc_min: 5.0,          // Angle in knob coordinates (0 at 6 0'clock)
            arc_max: 355.0,         // Angle in knob coordinates (0 at 6 0'clock)
            cursor_start: 0,            // 20% of radius
            cursor_end: 0,            // 20% of radius
            cursor_dot_position: 75,         // % of radius (try 80), ignored when cursor_dot_size <= 0
            cursor_dot_size: 0,         // % of radius (try 10)
            cursor_only: false,  //TODO
            cursor_width: 0,    // only when cursor_only is true
            back_width: 20,   // 10% of radius
            back_color: '#ddd',
            arc_width: 20,   // 10% of radius
            arc_color: '#666',
            radius: 40,
            rotation: CW,
            default_value: 0,
            value_min: 0.0,
            value_max: 100.0,
            value_resolution: 1,      // null means ignore
            snap_to_steps: false,        // TODO
            value_formatting: null      // TODO; callback function
        };

        let data_config = JSON.parse(container.dataset.config || '{}');
        let config = Object.assign({}, defaults, conf, data_config);

        // NOTE: viewBox must be 100x120: 100x100 for the arc and 100x20 below for the label.

        const HALF_WIDTH = 50;      // viewBox/2
        const HALF_HEIGHT = 50;     // viewBox/2
        // const RADIUS = 40;          // a bit less than viewBox/2 to have a margin outside the arc. Must also takes into account the width of the arc stroke.

        // mouse drag support
        // var currentTarget;  //TODO: could be replaced by element ?
        var targetRect;

        // Center of arc in knob coordinates and in ViewPort's pixels relative to the <svg> ClientBoundingRect.
        var arcCenterXPixels = 0;
        var arcCenterYPixels = 0; // equal to arcCenterXPixels because the knob is a circle

        // start of arc, in ViewBox coordinates, computed once during the init
        var arcStartX;     // knob coordinates
        var arcStartY;     // knob coordinates

        // internals
        var minAngle = 0.0;      // initialized in init()
        var maxAngle = 0.0;      // initialized in init()
        var polarAngle = 0.0;       // Angle in polar coordinates (0 at 3 o'clock)
        var distance = 0.0;         // distance, in polar coordinates, from center of arc to last mouse position
        var path_start = '';        // SVG path syntax
        var mouseWheelDirection = 1;
        var value = 0.0;        // current value [value_min..value_max]

        init();
        draw();
        attachEventHandlers();



        function fixupMouse(event) {

            event = event || window.event;

            var e = { event: event,
                target: event.target ? event.target : event.srcElement,
                which: event.which ? event.which :
                    event.button === 1 ? 1 :
                        event.button === 2 ? 3 :
                            event.button === 4 ? 2 : 1,
                x: event.x ? event.x : event.clientX,
                y: event.y ? event.y : event.clientY
            };
            return e;
        }



        function init() {

            console.group('INIT');

            // compute min and max angles:
            minAngle = knobToPolarAngle(config.arc_min);
            maxAngle = knobToPolarAngle(config.arc_max);

            // compute initial viewBox coordinates (independent from browser resizing):
            // setValue(config.value_min);
            let angle_rad = minAngle * Math.PI / 180.0;
            arcStartX = getViewboxX(Math.cos(angle_rad) * config.radius);
            arcStartY = getViewboxY(Math.sin(angle_rad) * config.radius);

            // set initial angle:
            setValue(config.default_value);

            if (config.cursor_only) {
                // TODO
            }

            if (config.cursor_start > 0) {
                let cursorLength = config.radius * ((100.0 - config.cursor_start) / 100.0);  // cursor is in percents
                let cursor_endX = getViewboxX(Math.cos(angle_rad) * cursorLength);
                let cursor_endY = getViewboxY(Math.sin(angle_rad) * cursorLength);
                path_start = `M ${cursor_endX},${cursor_endY} L`;
            } else {
                path_start = 'M';
            }

            path_start += `${arcStartX},${arcStartY} A ${config.radius},${config.radius}`;

            console.log(`path_start = ${path_start}`);

            mouseWheelDirection = _isMacOS() ? -1 : 1;

            console.groupEnd();

        }

        function getValue(polar) {
            let i = polarToKnobAngle(polar === undefined ? getPolarAngle() : polar);
            let v = ((i - config.arc_min) / (config.arc_max - config.arc_min)) * (config.value_max - config.value_min) + config.value_min;
            if (config.value_resolution === null) {
                return v;
            }
            return Math.round(v / config.value_resolution) * config.value_resolution;
        }

        function setValue(v) {
            console.log(`setValue(${v})`);
            value = v;
            let a = ((v - config.value_min) / (config.value_max - config.value_min)) * (config.arc_max - config.arc_min) + config.arc_min;
            console.log(`changeValue(${v}) --> angle ${a}`);
            setPolarAngle(knobToPolarAngle(a));
        }

        /**
         * Angle in degrees in polar coordinates (0 degrees at 3 o'clock)
         */
        function setPolarAngle(angle) {

            console.log(`setPolarAngle(${angle})`);

            let previous = polarAngle;

            let a = (angle + 360.0) % 360.0;    // we add 360 to handle negative values down to -360
            // apply boundaries
            let b = polarToKnobAngle(a);
            if (b < config.arc_min) {
                a = minAngle;
            } else if (b > config.arc_max) {
                a = maxAngle;
            }
            polarAngle = a;

            if (polarAngle !== previous) {
                if (getValue(previous) !== getValue()) {
                    notifyChange();
                }
            }

        }

        function incPolarAngle(increment) {
            setPolarAngle(polarAngle + increment);
        }

        /**
         * Angle in degrees in polar coordinates (0 degrees at 3 o'clock)
         */
        function getPolarAngle() {
            console.log(`return polarAngle ${polarAngle}`);
            return polarAngle;
        }

        /**
         * Return polar coordinates angle from our "knob coordinates" angle
         */
        function knobToPolarAngle(angle) {
            let a = config.zero_at - angle;
            if (a < 0) a = a + 360.0;
            console.log(`knobToPolarAngle ${angle} -> ${a}`);
            return a;
        }

        function polarToKnobAngle(angle) {
            //TODO: CCW or CW. "-" for changing CCW to CW
            return (config.zero_at - angle + 360.0) % 360.0;       // we add 360 to handle negative values down to -360
        }

        /**
         * Return viewBox X coordinates from cartesian -1..1 X
         */
        function getViewboxX(x) {

            // CW:  x = 20 --> 50 + 20 = 70
            // CCW: x = 20 --> 50 - 20 = 30

            return config.rotation === CW ? (HALF_WIDTH + x) : (HALF_WIDTH - x);
        }

        /**
         * Return viewBox Y coordinates from cartesian -1..1 Y
         */
        function getViewboxY(y) {
            return HALF_HEIGHT - y;  // HEIGHT - (HALF_HEIGHT + (RADIUS * y))
        }

        /**
         * angle is in degrees (polar, 0 at 3 o'clock)
         */
        function getDotCursor(endAngle) {

            let a_rad = endAngle * Math.PI / 180.0;

            // if (config.cursor_dot > 0) {
                let dot_position = config.radius * config.cursor_dot_position / 100.0;  // cursor is in percents
                let x = getViewboxX(Math.cos(a_rad) * dot_position);
                let y = getViewboxY(Math.sin(a_rad) * dot_position);
                let r = config.radius * config.cursor_dot_size / 2 / 100.0;
            // }

            return {
                cx: x,
                cy: y,
                r: r
            };
        }

        /**
         * angle is in degrees (polar, 0 at 3 o'clock)
         */
        function getPath(endAngle) {

            // SVG d: "A rx,ry xAxisRotate LargeArcFlag,SweepFlag x,y".
            // SweepFlag is either 0 or 1, and determines if the arc should be swept in a clockwise (1), or anti-clockwise (0) direction

            console.log(`getPath from ${minAngle} to ${endAngle}`);     // 240 330; 240-330=-90 + 360=270

            let a_rad = endAngle * Math.PI / 180.0;
            let endX = getViewboxX(Math.cos(a_rad) * config.radius);
            let endY = getViewboxY(Math.sin(a_rad) * config.radius);

            let deltaAngle = (minAngle - endAngle + 360.0) % 360.0;
            let largeArc = deltaAngle < 180.0 ? 0 : 1;

//        console.log(`deltaAngle ${deltaAngle} largeArc ${largeArc}`);

            let arcDirection = config.rotation === CW ? 1 : 0;

            if (config.cursor_only) {
                // TODO
            }

            let path = path_start + ` 0 ${largeArc},${arcDirection} ${endX},${endY}`;

            if (config.cursor_end > 0) {
                let cursorLength = config.radius * ((100.0 - config.cursor_end) / 100.0);  // cursor is in percents
                let cursor_endX = getViewboxX(Math.cos(a_rad) * cursorLength);
                let cursor_endY = getViewboxY(Math.sin(a_rad) * cursorLength);
                path += ` L ${cursor_endX},${cursor_endY}`;
            }

            console.log(path);

            return path;
        }




        function drawMenu() {

            let m = container.getElementsByClassName("knob-menu");

            if (m.length > 0) {
                console.log("found menu", m);
                menu = m[0];
            } else {
                console.log("no menu found");
                menu = document.createElement("div");
                container.appendChild(menu);
            }

            // menu = document.getElementById("m");
            console.log(menu);
            // menu = m[0];

            menu.setAttribute("class", "knob-menu");
            menu.style.display = "none";

        }

        function hideMenu() {
            if (menu) {
                menu.style.display = "none";
            }
        }

        function showMenu() {
            if (menu) {
                menu.style.display = "block";
            }
        }

        function draw() {

            console.log('draw', container);

            svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");

            // https://www.w3.org/TR/SVG/render.html#RenderingOrder:
            // Elements in an SVG document fragment have an implicit drawing order, with the first elements in the SVG document
            // fragment getting "painted" first. Subsequent elements are painted on top of previously painted elements.
            // ==> first element -> "painted" first

            svg.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", "http://www.w3.org/1999/xlink");
            svg.setAttributeNS(null, "viewBox", config.with_label ? "0 0 100 120" : "0 0 100 100");
            // svg.setAttribute("class", "knob");

            // let back = document.createElementNS(NS, "circle");
            // back.setAttributeNS(null, "cx", "50");
            // back.setAttributeNS(null, "cy", "50");
            // back.setAttributeNS(null, "r", "40");
            // back.setAttribute("class", "back");
            // svg.append(back);

            let back = document.createElementNS(NS, "path");
            back.setAttributeNS(null, "d", getPath(maxAngle));
            back.setAttribute("stroke", config.back_color);
            back.setAttribute("stroke-width", "" + config.back_width * config.radius / 100);
            back.setAttribute("fill", "transparent");
            back.setAttribute("class", "back");
            svg.appendChild(back);

            // let bg_radius = config.radius + (config.arc_width * config.radius / 100) / 2;
            let bg_radius = config.radius - (config.arc_width * config.radius / 100) / 2;
            let bg = document.createElementNS(NS, "circle");
            bg.setAttributeNS(null, "cx", 50);
            bg.setAttributeNS(null, "cy", 50);
            bg.setAttributeNS(null, "r", `${bg_radius}`);
            bg.setAttribute("stroke", "transparent");
            bg.setAttribute("stroke-width", "0");
            bg.setAttribute("fill", "transparent");
            bg.setAttribute("class", "knob-bg");
            svg.appendChild(bg);

            let valueText = document.createElementNS(NS, "text");
            valueText.setAttributeNS(null, "x", "50");
            valueText.setAttributeNS(null, "y", "55");
            valueText.setAttribute("text-anchor", "middle");
            valueText.setAttribute("cursor", "default");
            valueText.setAttribute("class", "value");
            valueText.textContent = getValue().toFixed(2);
            svg.appendChild(valueText);

            let path = document.createElementNS(NS, "path");
            path.setAttributeNS(null, "d", getPath(getPolarAngle()));
            path.setAttribute("stroke", config.arc_color);
            path.setAttribute("stroke-width", "" + config.arc_width * config.radius / 100);
            path.setAttribute("fill", "transparent");
            path.setAttribute("class", "arc");
            svg.appendChild(path);

            if (config.cursor_dot_size > 0) {
                let d = getDotCursor(getPolarAngle());
                let dot = document.createElementNS(NS, "circle");
                dot.setAttributeNS(null, "cx", d.cx);
                dot.setAttributeNS(null, "cy", d.cy);
                dot.setAttributeNS(null, "r", d.r);
                // path.setAttribute("class", "arc");
                svg.appendChild(dot);
            }

            if (config.with_label) {
                let labelText = document.createElementNS(NS, "text");
                labelText.setAttributeNS(null, "x", "50");
                labelText.setAttributeNS(null, "y", "110");
                labelText.setAttribute("text-anchor", "middle");
                valueText.setAttribute("cursor", "default");
                labelText.setAttribute("class", "label");
                labelText.textContent = config.label;
                svg.appendChild(labelText);
            }


            container.appendChild(svg);

            drawMenu();

        }  // draw()

        /**
         *
         */
        function redraw() {

            svg.childNodes[2].textContent = getValue(); //.toFixed(2);
            svg.childNodes[3].setAttributeNS(null, "d", getPath(getPolarAngle()));

            if (config.cursor_dot_size > 0) {
                let d = getDotCursor(getPolarAngle());
                svg.childNodes[4].setAttributeNS(null, "cx", d.cx);
                svg.childNodes[4].setAttributeNS(null, "cy", d.cy);
            }
        }

        /**
         * startDrag() must have been called before to init the targetRect variable.
         */
        function mouseUpdate(e) {

            // MouseEvent.clientX (standard property: YES)
            // The clientX read-only property of the MouseEvent interface provides
            // the horizontal coordinate within the application's client area at which
            // the event occurred (as opposed to the coordinates within the page).
            // For example, clicking in the top-left corner of the client area will always
            // result in a mouse event with a clientX value of 0, regardless of whether
            // the page is scrolled horizontally. Originally, this property was defined
            // as a long integer. The CSSOM View Module redefined it as a double float.

            let dxPixels = e.clientX - targetRect.left;
            let dyPixels = e.clientY - targetRect.top;

            // mouse delta in cartesian coordinate with path center=0,0 and scaled (-1..0..1) relative to path:
            // <svg> center:       (dx, dy) == ( 0,  0)
            // <svg> top-left:     (dx, dy) == (-1,  1)
            // <svg> bottom-right: (dx, dy) == ( 1, -1) (bottom right of the 100x100 viewBox, ignoring the bottom 100x20 for the label)
            let dx = (dxPixels - arcCenterXPixels) / (targetRect.width / 2);
            let dy = - (dyPixels - arcCenterYPixels) / (targetRect.width / 2);  // targetRect.width car on a 20px de plus en hauteur pour le label

            if (config.rotation === CCW) dx = - dx;

            // convert to polar coordinates
            let angle_rad = Math.atan2(dy, dx);

            if (angle_rad < 0) angle_rad = 2.0*Math.PI + angle_rad;

            console.log(`mouseUpdate: position in svg = ${dxPixels}, ${dyPixels} pixels; ${dx.toFixed(3)}, ${dy.toFixed(3)} rel.; angle ${angle_rad.toFixed(3)} rad`);

            setPolarAngle(angle_rad * 180.0 / Math.PI);     // rads to degs

            // distance from arc center to mouse position
            distance = Math.sqrt(dx*(HALF_WIDTH/config.radius)*dx*(HALF_WIDTH/config.radius) + dy*(HALF_HEIGHT/config.radius)*dy*(HALF_HEIGHT/config.radius));

        }

        /**
         *
         * @param e
         */
        function startDrag(e) {

            // e.preventDefault();

            // API: Event.currentTarget
            //      Identifies the current target for the event, as the event traverses the DOM. It always REFERS TO THE ELEMENT
            //      TO WHICH THE EVENT HANDLER HAS BEEN ATTACHED, as opposed to event.target which identifies the element on
            //      which the event occurred.
            //      https://developer.mozilla.org/en-US/docs/Web/API/Event/currentTarget

            // currentTarget = e.currentTarget;

            // API: Element.getBoundingClientRect() (standard: YES)
            //      The Element.getBoundingClientRect() method returns the size of an element
            //      and its POSITION RELATIVE TO THE VIEWPORT.
            //      The amount of scrolling that has been done of the viewport area (or any other
            //      scrollable element) is taken into account when computing the bounding rectangle.
            //      This means that the rectangle's boundary edges (top, left, bottom, and right)
            //      change their values every time the scrolling position changes (because their
            //      values are relative to the viewport and not absolute).
            //      https://developer.mozilla.org/en/docs/Web/API/Element/getBoundingClientRect

            // targetRect = currentTarget.getBoundingClientRect(); // currentTarget must be the <svg...> object
            targetRect = container.getBoundingClientRect();

            // Note: we must take the boundingClientRect of the <svg> and not the <path> because the <path> bounding rect
            //       is not constant because it encloses the current arc.

            // By design, the arc center is at equal distance from top and left.
            arcCenterXPixels = targetRect.width / 2;
            //noinspection JSSuspiciousNameCombination
            arcCenterYPixels = arcCenterXPixels;

            document.addEventListener('mousemove', handleDrag, false);
            document.addEventListener('mouseup', endDrag, false);

            mouseUpdate(e);
            redraw();
        }

        /**
         *
         * @param e
         */
        function handleDrag(e) {
            e.preventDefault();
            mouseUpdate(e);
            redraw();
        }

        /**
         *
         */
        function endDrag() {
            document.removeEventListener('mousemove', handleDrag, false);
            document.removeEventListener('mouseup', endDrag, false);
        }

        var minDeltaY;

        /**
         *
         * @param e
         * @returns {boolean}
         */
        function mouseWheelHandler(e) {

            // WheelEvent
            // This is the standard wheel event interface to use. Old versions of browsers implemented the two non-standard
            // and non-cross-browser-compatible MouseWheelEvent and MouseScrollEvent interfaces. Use this interface and avoid
            // the latter two.
            // The WheelEvent interface represents events that occur due to the user moving a mouse wheel or similar input device.

            // https://stackoverflow.com/questions/5527601/normalizing-mousewheel-speed-across-browsers
            // https://github.com/facebook/fixed-data-table/blob/master/src/vendor_upstream/dom/normalizeWheel.js

            e.preventDefault();

            let dy = e.deltaY;

            if (dy != 0) {
                // normalize Y delta
                if (minDeltaY > Math.abs(dy) || !minDeltaY) {
                    minDeltaY = Math.abs(dy);
                }
            }

            // important!
            // currentTarget = e.currentTarget;

            incPolarAngle(mouseWheelDirection * (dy / minDeltaY));     // TODO: make mousewheel direction configurable

            // TODO: timing --> speed
            // https://stackoverflow.com/questions/22593286/detect-measure-scroll-speed

            redraw();

            return false;
        }

        /**
         *
         */
        function attachEventHandlers() {

            document.addEventListener('contextmenu', function(e) {
                e.preventDefault();
            }, false);

            document.addEventListener("mousedown", function(e) {
                hideMenu();
            });

            container.addEventListener("mousedown", function(e) {

                e.preventDefault();  // stops the browser's default behaviour.
                e.stopPropagation(); // prevents the event from propagating in (“bubbling up”) the DOM.

                console.log("mousedown", e);

                let mouse_event = fixupMouse(e);
                let event = mouse_event.event;

                if (mouse_event.which === 3) {  // left button
                    console.log('right click', event, mouse_event);

                    let maxLeft=(window.innerWidth||document.documentElement.clientWidth||document.body.clientWidth) - 10 - menu.getBoundingClientRect().width;
                    let maxTop=(window.innerHeight||document.documentElement.clientHeight||document.body.clientHeight)- 10 - menu.getBoundingClientRect().height;

                    console.log(event.pageX, event.pageY, maxLeft, maxTop, (event.pageX>maxLeft?maxLeft:event.pageX)+"px", (event.pageY>maxTop?maxTop:event.pageY)+"px");

                    console.log(menu);

                    menu.style.left = (event.pageX > maxLeft ? maxLeft : event.pageX)+"px";
                    menu.style.top =  (event.pageY > maxTop ? maxTop : event.pageY)+"px";

                    showMenu();

                } else {
                    hideMenu();
                    startDrag(e);
                }

            });

            container.addEventListener("wheel", function(e) {
                mouseWheelHandler(e);
            });

        }

        /**
         *
         */
        function notifyChange() {
            console.log('knob value has changed');
            // does the change of angle affect the value?
            let value = getValue();     // TODO: cache the value
            let event = new CustomEvent('change', { 'detail': value });
            container.dispatchEvent(event);
        }

        /**
         * Utility function to configure the mousewheel direction.
         * @returns {*}
         * @private
         */
        function _isMacOS() {
            return ['Macintosh', 'MacIntel', 'MacPPC', 'Mac68K'].indexOf(window.navigator.platform) !== -1;
        }

        /**
         *
         */
        return {
            set value(v) {
                setValue(v);
                redraw();
            }
        };

    });
