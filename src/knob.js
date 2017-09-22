
    "use strict";

    export default function(elem, conf) {

        //
        // All angles in method parameters are in [degrees]
        //
        // By default:
        // - knob direction is CLOCKWISE
        // - start position is 6 o'clock (bottom)
        // - knob angle is:
        //       0 [deg] angle is a   6 o'clock (bottom)
        //      90 [deg] angle is at  9 o'clock (left)
        //     180 [deg] angle is at 12 o'clock (top)
        //     270 [deg] angle is at  3 o'clock (right)
        //
        // Trigonometric functions (sin, cos, ...) operate in polar coordinates,
        // with 0 angle at 3 o'clock and a counter-clockwise direction.
        // To convert from "knob angle" to "polar angle":
        //
        //     knob    polar
        // --------------------
        //        0      270
        //       30      240
        //       90      180
        //      180       90
        //      270        0
        //      330      -60 (add 360 to get a positive equivalent value: -60 + 360 = 300)
        //
        // Formula: polar-angle = 270 - knob-angle
        //

        const TRACE = true;    // when true, will log more details in the console

        // It is faster to access a property than to access a variable...
        // See https://jsperf.com/vars-vs-props-speed-comparison/1

        const NS = "http://www.w3.org/2000/svg";
        const CW = true;    // clock-wise
        const CCW = !CW;    // counter clock-wise

        const element = elem;    // DOM element

        // For the user convenience, the label can be set with the "data-label" attribute.
        // If another label is set in data-config then this later definition will override data-label.
        let default_label = element.dataset.label !== undefined ? element.dataset.label : '';

        let defaults = {

            // User configurable properties.
            // No camelCase because we want to be able to have the same name in data- attributes.

            label: default_label,
            with_label: false,

            rotation: CW,
            center_zero: false,

            default_value: 0,
            value_min: 0.0,             // TODO: rename to min
            value_max: 100.0,           // TODO: rename to max
            value_step: 1,              // null means ignore

            zero_at: 270.0,             // [deg] (polar) the 0 degree will be at 270 polar degrees (6 o'clock).
            angle_min: 30.0,            // [deg] Angle in knob coordinates (0 at 6 0'clock)
            angle_max: 330.0,           // [deg] Angle in knob coordinates (0 at 6 0'clock)

            // background disk:
            back_radius: 32,
            back_border_width: 1,
            back_border_color: '#888',
            back_color: '#333',

            // track background:
            track_bg_radius: 40,
            track_bg_width: 8,
            track_bg_color: '#555',

            // track:
            track_radius: 40,
            track_width: 8,
            track_color_init: '#999',
            track_color: '#bbb',

            // cursor
            cursor_radius: 18,          // same unit as radius
            cursor_length: 10,
            cursor_width: 4,
            cursor_color: '#bbb',

            dot_cursor: false,
            cursor_dot_position: 75,    // % of radius (try 80), ignored when cursor_dot_size <= 0
            cursor_dot_size: 0,         // % of radius (try 10)
            cursor_only: false,         //TODO

            // appearance:
            background: true,
            track_background: true,
            cursor: true,
            linecap: 'round',       // https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke-linecap

            // CSS class names
            class_bg: 'knob-bg',
            class_track_bg : 'knob-track-bg',
            class_track : 'knob-track',
            class_value : 'knob-value',
            class_cursor : 'knob-cursor',

            snap_to_steps: false,       // TODO

            mouse_wheel_acceleration: 1,

            value_formatting: null,     // TODO; callback function
            format: function(v) {
                return v;
            }
        };

        //---------------------------------------------------------------------
        // Merge user config with default config:
        let data_config = JSON.parse(element.dataset.config || '{}');
        let config = Object.assign({}, defaults, conf, data_config);

        //---------------------------------------------------------------------
        // To simplify the internal coordinates transformations, we set the view box as a 100 by 100 square.
        // But, if a label is present, then we add 20 to the height (at the bottom) as a placeholder for the label.
        // In summary:
        // - 0,0..99,99: the knob itself
        // - 0,100..99,119: the label, if any
        const VIEWBOX_WIDTH = 100;
        const VIEWBOX_HEIGHT = config.with_label ? 120 : 100;
        const HALF_WIDTH = 50;      // viewBox/2
        const HALF_HEIGHT = 50;     // viewBox/2

        // Center of arc in knob coordinates and in ViewPort's pixels relative to the <svg> ClientBoundingRect.
        let arcCenterXPixels = 0;
        let arcCenterYPixels = 0; // equal to arcCenterXPixels because the knob is a circle

        //---------------------------------------------------------------------
        // Pre-computed values to speed-up operations:
        // (we use variables instead of const to allow the re-configuration of the knob at any moment)
        let angle_min_polar = 0.0;              // [degrees] initialized in init()
        let angle_max_polar = 0.0;              // [degrees] initialized in init()
        // At the top of the knob, we leave a gap between the left and right tracks.
        // These are the polar angles that delimit this gap:
        let left_track_end_angle_polar = 0;     // angle in [degrees]
        let right_track_start_angle_polar = 0;  // angle in [degrees]

        //---------------------------------------------------------------------
        // internals
        let current_angle_polar = 0.0;      // [degrees] Angle in polar coordinates (0 at 3 o'clock)
        let distance = 0.0;                 // distance from arc center to mouse position
        let mouse_wheel_direction = 1;      // dependant of the OS
        let value = 0.0;                    // current value [value_min..value_max]

        //---------------------------------------------------------------------
        // SVG elements, from back to front:
        let svg_back_disk = null;           // background disk:
        let svg_track_bg = null;            // track background; for non zero-centered knobs
        let svg_track_bg_left = null;       // track background; for zero-centered knobs
        let svg_track_bg_right = null;      // track background; for zero-centered knobs
        let svg_track = null;
        let svg_cursor = null;
        let svg_value_text = null;

        //---------------------------------------------------------------------
        // mouse drag support
        let targetRect;

        //---------------------------------------------------------------------
        // true if the current knob value is different from the default value
        let has_changed = false;    // to spare some getValue() calls when testing if value has changed from default_value

        //---------------------------------------------------------------------
        // Create the knob:

        init();
        draw();
        attachEventHandlers();


        /**
         * Having a init function allow the knob to be re-configured.
         */
        function init() {

            console.group('init');

            // compute min and max angles in polar coord:
            angle_min_polar = knobToPolarAngle(config.angle_min);
            angle_max_polar = knobToPolarAngle(config.angle_max);

            // compute initial viewBox coordinates (independent from browser resizing) of the track starting point:
            // let {x: arcStartX, y: arcStartY} = getViewboxCoord(angle_min_polar);

            // set initial angle:
            setValue(config.default_value);

            // At the top of the knob, we leave a gap between the left and right tracks. These are the polar angles
            // that delimit this gap.
            // Only used if center_zero=true.
            left_track_end_angle_polar = Math.acos(-(config.track_bg_width*1.5)/100.0) * 180.0 / Math.PI;
            right_track_start_angle_polar = Math.acos((config.track_bg_width*1.5)/100.0) * 180.0 / Math.PI;

            // if (config.cursor_only) {
            //     // TODO
            // }

            mouse_wheel_direction = _isMacOS() ? -1 : 1;

            console.groupEnd();
        }

        /**
         *
         * @param polar
         * @returns {*}
         */
        function getDisplayValue(polar) {
            let v = getValue(polar);
            return config.format(v);
        }

        /**
         *
         * @param polar
         * @returns {number}
         */
        function getValue(polar) {
            let i = polarToKnobAngle(polar === undefined ? current_angle_polar : polar);
            let v = ((i - config.angle_min) / (config.angle_max - config.angle_min)) * (config.value_max - config.value_min) + config.value_min;
            if (config.value_step === null) {
                return v;
            }
            return Math.round(v / config.value_step) * config.value_step;
        }

        /**
         *
         * @param v
         */
        function setValue(v) {
            value = v;
            let a = ((v - config.value_min) / (config.value_max - config.value_min)) * (config.angle_max - config.angle_min) + config.angle_min;
            setPolarAngle(knobToPolarAngle(a));
        }

        /**
         * Angle in degrees in polar coordinates (0 degrees at 3 o'clock)
         */
        function setPolarAngle(angle, fireEvent) {

            let previous = current_angle_polar;

            let a = (angle + 360.0) % 360.0;    // we add 360 to handle negative values down to -360

            // apply boundaries
            let b = polarToKnobAngle(a);
            if (b < config.angle_min) {
                a = angle_min_polar;
            } else if (b > config.angle_max) {
                a = angle_max_polar;
            }
            current_angle_polar = a;

            if (fireEvent && (current_angle_polar !== previous)) {
                // does the change of angle affect the value?
                if (getValue(previous) !== getValue()) {
                    notifyChange();
                }
            }

        }

        /**
         *
         * @param increment
         */
        function incPolarAngle(increment) {
            setPolarAngle(current_angle_polar + increment, true);
        }

        /**
         * Angle in degrees in polar coordinates (0 degrees at 3 o'clock)
         */
        // function getPolarAngle() {
        //     return current_angle_polar;
        // }

        /**
         * Return polar coordinates angle from our "knob coordinates" angle
         */
        function knobToPolarAngle(angle) {

            // knobToPolarAngle 30 -> 240
            // knobToPolarAngle 330 -> 300

            let a = config.zero_at - angle;
            if (a < 0) a = a + 360.0;
            if (TRACE) console.log(`knobToPolarAngle ${angle} -> ${a}`);
            return a;
        }

        /**
         *
         * @param angle [deg] with 0 at 3 o'clock
         * @returns {number}
         */
        function polarToKnobAngle(angle) {
            //TODO: CCW or CW. "-" for changing CCW to CW
            return (config.zero_at - angle + 360.0) % 360.0;    // we add 360 to handle negative values down to -360
        }

        /**
         * Return viewBox X,Y coordinates
         * @param angle in [degree]
         * @param radius; defaults to config.radius
         * @returns {{x: number, y: number}}
         */
        function getViewboxCoord(angle, radius) {
            let a = angle * Math.PI / 180.0;
            let r = radius || config.track_radius;
            let x = Math.cos(a) * r;
            let y = Math.sin(a) * r;
            return {
                x: config.rotation === CW ? (HALF_WIDTH + x) : (HALF_WIDTH - x),
                y: HALF_HEIGHT - y
            }
        }

        /**
         * angle is in degrees (polar, 0 at 3 o'clock)
         */
/*
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
*/

        /**
         *
         * @param fromAngle in [degree]
         * @param toAngle in [degree] (polar, 0 at 3 o'clock)
         * @param radius (polar, 0 at 3 o'clock)
         */
        function getArc(fromAngle, toAngle, radius) {

            if (TRACE) console.log(`getArc(${fromAngle}, ${toAngle}, ${radius})`);

            // SVG d: "A rx,ry xAxisRotate LargeArcFlag,SweepFlag x,y".
            // SweepFlag is either 0 or 1, and determines if the arc should be swept in a clockwise (1), or anti-clockwise (0) direction

            let {x: x0, y: y0} = getViewboxCoord(fromAngle, radius);
            let {x: x1, y: y1} = getViewboxCoord(toAngle, radius);

            let deltaAngle = (fromAngle - toAngle + 360.0) % 360.0;

            if (TRACE) console.log("deltaAngle: " + deltaAngle);

            let largeArc = deltaAngle < 180.0 ? 0 : 1;
            let arcDirection = config.rotation === CW ? 1 : 0;

            let p = `M ${x0},${y0} A ${radius},${radius} 0 ${largeArc},${arcDirection} ${x1},${y1}`; //TODO: add terminator

            if (TRACE) console.log("arc: " + p);

            return p;
        }

        /**
         *
         * @returns {*}
         */
        function getTrackPath() {

            let p = null;

            if (config.center_zero) {

                let a = current_angle_polar > config.zero_at ? (current_angle_polar - 360.0) : current_angle_polar;

                console.log(`split: v=${getValue()}, c=${current_angle_polar}, a=${a}, left=${left_track_end_angle_polar}, right=${right_track_start_angle_polar}`);

                if (a > left_track_end_angle_polar) {
                    p = getArc(a, left_track_end_angle_polar, config.track_radius);
                } else if (a < right_track_start_angle_polar) {
                    p = getArc(right_track_start_angle_polar, a, config.track_radius);
                } else {
                    // track is not drawn when the value is at center
                }

            } else {
                p = getArc(angle_min_polar, current_angle_polar, config.track_radius);
            }

            return p;
        }

        function draw_init() {

            // For the use of null argument with setAttributeNS, see https://developer.mozilla.org/en-US/docs/Web/SVG/Namespaces_Crash_Course#Scripting_in_namespaced_XML

            element.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", "http://www.w3.org/1999/xlink");
            element.setAttributeNS(null, "viewBox", `0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`);
        }

        /**
         *
         */
        function draw_background() {

            if (!config.background) return;

            // For the use of null argument with setAttributeNS, see https://developer.mozilla.org/en-US/docs/Web/SVG/Namespaces_Crash_Course#Scripting_in_namespaced_XML

            //
            // back disk:
            //
            svg_back_disk = document.createElementNS(NS, "circle");
            svg_back_disk.setAttributeNS(null, "cx", `${HALF_WIDTH}`);
            svg_back_disk.setAttributeNS(null, "cy", `${HALF_HEIGHT}`);
            svg_back_disk.setAttributeNS(null, "r", `${config.back_radius}`);
            svg_back_disk.setAttribute("fill", `${config.back_color}`);
            svg_back_disk.setAttribute("stroke", `${config.back_border_color}`);
            svg_back_disk.setAttribute("stroke-width", `${config.back_border_width}`);
            // svg_back_disk.setAttribute("stroke-linecap", config.linecap);
            svg_back_disk.setAttribute("class", config.class_bg);
            element.appendChild(svg_back_disk);
        }

        /**
         *
         */
        function draw_track_background() {

            // For the use of null argument with setAttributeNS, see https://developer.mozilla.org/en-US/docs/Web/SVG/Namespaces_Crash_Course#Scripting_in_namespaced_XML

            if (!config.track_background) return;

            //
            // track background:
            //
            if (config.center_zero) {

                // left track background
                svg_track_bg_left = document.createElementNS(NS, "path");
                svg_track_bg_left.setAttributeNS(null, "d", getArc(angle_min_polar, left_track_end_angle_polar, config.track_bg_radius));
                svg_track_bg_left.setAttribute("stroke", `${config.track_bg_color}`);
                svg_track_bg_left.setAttribute("stroke-width", `${config.track_bg_width}`);
                svg_track_bg_left.setAttribute("stroke-linecap", config.linecap);
                svg_track_bg_left.setAttribute("fill", "transparent");
                svg_track_bg_left.setAttribute("class", config.class_track_bg);
                element.appendChild(svg_track_bg_left);

                // right track background
                svg_track_bg_right = document.createElementNS(NS, "path");
                svg_track_bg_right.setAttributeNS(null, "d", getArc(right_track_start_angle_polar, angle_max_polar, config.track_bg_radius));
                svg_track_bg_right.setAttribute("stroke", `${config.track_bg_color}`);
                svg_track_bg_right.setAttribute("stroke-width", `${config.track_bg_width}`);
                svg_track_bg_right.setAttribute("stroke-linecap", config.linecap);
                svg_track_bg_right.setAttribute("fill", "transparent");
                svg_track_bg_right.setAttribute("class", config.class_track_bg);
                element.appendChild(svg_track_bg_right);

            } else {

                svg_track_bg = document.createElementNS(NS, "path");
                svg_track_bg.setAttributeNS(null, "d", getArc(angle_min_polar, angle_max_polar, config.track_bg_radius));
                svg_track_bg.setAttribute("stroke", `${config.track_bg_color}`);
                svg_track_bg.setAttribute("stroke-width", `${config.track_bg_width}`);
                svg_track_bg.setAttribute("fill", "transparent");
                svg_track_bg.setAttribute("stroke-linecap", config.linecap);
                svg_track_bg.setAttribute("class", config.class_track_bg);
                element.appendChild(svg_track_bg);

            }
        }

        /**
         *
         */
        function draw_track() {
            if (config.cursor_only) return;
            let p = getTrackPath();
            if (p) {
                svg_track = document.createElementNS(NS, "path");
                svg_track.setAttributeNS(null, "d", p);
                svg_track.setAttribute("stroke", `${config.track_color_init}`);
                svg_track.setAttribute("stroke-width", `${config.track_width}`);
                svg_track.setAttribute("fill", "transparent");
                svg_track.setAttribute("stroke-linecap", config.linecap);
                svg_track.setAttribute("class", config.class_track);
                element.appendChild(svg_track);
            }
        }

        /**
         *
         * @returns {string}
         */
        function getTrackCursor() {
            let a = current_angle_polar;
            // let from = getViewboxCoord(a, HALF_WIDTH - config.cursor_radius);
            // let to = getViewboxCoord(a, HALF_WIDTH - config.cursor_radius + config.cursor_length);
            let from = getViewboxCoord(a, config.cursor_radius);
            let to = getViewboxCoord(a, config.cursor_radius + config.cursor_length);
            return `M ${from.x},${from.y} L ${to.x},${to.y}`;
        }

        /**
         *
         */
        function draw_cursor() {

            if (!config.cursor) return;

            // TODO: dot cursor

            let p = getTrackCursor();
            if (p) {
                svg_cursor = document.createElementNS(NS, "path");
                svg_cursor.setAttributeNS(null, "d", p);
                svg_cursor.setAttribute("stroke", `${config.cursor_color}`);
                svg_cursor.setAttribute("stroke-width", `${config.cursor_width}`);
                svg_cursor.setAttribute("fill", "transparent");
                svg_cursor.setAttribute("stroke-linecap", config.linecap);
                svg_cursor.setAttribute("class", config.class_cursor);
                element.appendChild(svg_cursor);
            }
        }

        /**
         *
         */
        function draw_value() {
            svg_value_text = document.createElementNS(NS, "text");
            svg_value_text.setAttributeNS(null, "x", `${HALF_WIDTH}`);
            svg_value_text.setAttributeNS(null, "y", `${HALF_HEIGHT + 5}`);
            svg_value_text.setAttribute("text-anchor", "middle");
            svg_value_text.setAttribute("cursor", "default");
            svg_value_text.setAttribute("class", config.class_value);
            svg_value_text.textContent = getDisplayValue();
            element.appendChild(svg_value_text);
        }

        /**
         *
         */
        function draw() {
            draw_init();
            draw_background();
            draw_track_background();
            draw_track();
            draw_cursor();
            draw_value();
        }

        /**
         *
         */
        function redraw() {
            let p = getTrackPath();
            if (p) {
                if (svg_track) {
                    svg_track.setAttributeNS(null, "d", p);
                } else {
                    draw_track();
                }
            } else {
                if (svg_track) {
                    svg_track.setAttributeNS(null, "d", "");    // we hide the track
                }
            }

            if (!has_changed) {
                has_changed = getValue() !== config.default_value;
                if (has_changed) {
                    svg_track.setAttribute("stroke", `${config.track_color}`);
                }
            }

            p = getTrackCursor();
            if (TRACE) console.log(p);
            if (p) {
                if (svg_cursor) {
                    svg_cursor.setAttributeNS(null, "d", p);
                }
            }

            if (svg_value_text) {
                svg_value_text.textContent = getDisplayValue();
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

            if (TRACE) console.log(`mouseUpdate: position in svg = ${dxPixels}, ${dyPixels} pixels; ${dx.toFixed(3)}, ${dy.toFixed(3)} rel.; angle ${angle_rad.toFixed(3)} rad`);

            setPolarAngle(angle_rad * 180.0 / Math.PI, true);     // [rad] to [deg]

            // distance from arc center to mouse position:
            // distance = Math.sqrt(dx*(HALF_WIDTH/config.track_radius)*dx*(HALF_WIDTH/config.track_radius) + dy*(HALF_HEIGHT/config.track_radius)*dy*(HALF_HEIGHT/config.track_radius));
        }

        /**
         *
         * @param e
         */
        function startDrag(e) {

            if (TRACE) console.log('startDrag');

            e.preventDefault();

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
            targetRect = element.getBoundingClientRect();

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
            if (TRACE) console.log('endDrag');
            document.removeEventListener('mousemove', handleDrag, false);
            document.removeEventListener('mouseup', endDrag, false);
        }

        let minDeltaY;

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

            if (dy !== 0) {
                // normalize Y delta
                if (minDeltaY > Math.abs(dy) || !minDeltaY) {
                    minDeltaY = Math.abs(dy);
                }
            }

            incPolarAngle(mouse_wheel_direction * (dy / minDeltaY) * config.mouse_wheel_acceleration);     // TODO: make mousewheel direction configurable

            // TODO: timing --> speed
            // https://stackoverflow.com/questions/22593286/detect-measure-scroll-speed

            redraw();

            return false;
        }

        /**
         *
         */
        function attachEventHandlers() {
            element.addEventListener("mousedown", function(e) {
                startDrag(e);
            });
            element.addEventListener("wheel", function(e) {
                mouseWheelHandler(e);
            });
        }

        /**
         *
         */
        function notifyChange() {
            if (TRACE) console.log('knob value has changed');
            let value = getValue();     // TODO: cache the value
            let event = new CustomEvent('change', { 'detail': value });
            element.dispatchEvent(event);
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
            },
            set config(new_config) {
                config = Object.assign({}, defaults, conf, new_config);
                init();
                draw();
            }
        };

    }
