
    "use strict";

    var knob = (function(config) {

        let defaults = {

        };

        let element;    // DOM element

        const CW = true;    // clock-wise
        const CCW = !CW;    // counter clock-wise

        // user configurable
        const ZERO_AT = 270.0;      // the 0 degree will be at 270 polar degrees (6 o'clock).
        let arcMin = 30.0;          // Angle in dial coordinates (0 at 6 0'clock)
        let arcMax = 330.0;         // Angle in dial coordinates (0 at 6 0'clock)
        let cursorStart = 20;            // 20% of radius
        let cursorEnd = 30;            // 20% of radius
        let cursorOnly = false; //TODO
        let rotation = CW;
        let valueMin = 0.0;
        let valueMax = 100.0;
        let valueResolution = 5;      // null means ignore
        let snapToSteps = false;        // TODO
        let valueFormating = null;      // TODO; callback function

        // NOTE: viewBox must be 100x120: 100x100 for the arc and 100x20 below for the label.

        const HALF_WIDTH = 50;      // viewBox/2
        const HALF_HEIGHT = 50;     // viewBox/2
        const RADIUS = 40;          // a bit less than viewBox/2 to have a margin outside the arc. Must also takes into account the width of the arc stroke.

        // mouse drag support
        let currentTarget;
        let targetRect;

        // Center of arc in dial coordinates and in ViewPort's pixels relative to the <svg> ClientBoundingRect.
        let arcCenterXPixels = 0;
        let arcCenterYPixels = 0; // equal to arcCenterXPixels because the dial is a circle

        // start of arc, in ViewBox coordinates, computed once during the init
        let arcStartX;     // dial coordinates
        let arcStartY;     // dial coordinates

        // internals
        let minAngle = 0.0;      // initialized in init()
        let maxAngle = 0.0;      // initialized in init()
        let polarAngle = 0.0;       // Angle in polar coordinates (0 at 3 o'clock)
        let distance = 0.0;         // distance, in polar coordinates, from center of arc to last mouse position
        let path_start = '';        // SVG path syntax
        let mouseWheelDirection = 1;

        let value = 0.0;

        // let value = init;   // value is directly accessible via the getter and setter defined below
        // let getValue = function() {
        //     return value;
        // };
        // let setValue = function(v) {
        //     value = v;
        // };

        function _getOS() {
            let userAgent = window.navigator.userAgent,
                platform = window.navigator.platform,
                macosPlatforms = ['Macintosh', 'MacIntel', 'MacPPC', 'Mac68K'],
                windowsPlatforms = ['Win32', 'Win64', 'Windows', 'WinCE'],
                iosPlatforms = ['iPhone', 'iPad', 'iPod'],
                os = null;

            if (macosPlatforms.indexOf(platform) !== -1) {
                os = 'Mac OS';
            } else if (iosPlatforms.indexOf(platform) !== -1) {
                os = 'iOS';
            } else if (windowsPlatforms.indexOf(platform) !== -1) {
                os = 'Windows';
            } else if (/Android/.test(userAgent)) {
                os = 'Android';
            } else if (!os && /Linux/.test(platform)) {
                os = 'Linux';
            }

            return os;
        }


        var init = function() {

            console.log('INIT');

            // compute min and max angles:
            minAngle = dialToPolarAngle(arcMin);
            maxAngle = dialToPolarAngle(arcMax);

            // set initial angle:
            setPolarAngle(minAngle);   // init polarAngle

            let angle_rad = getPolarAngle() * Math.PI / 180.0;

            // compute initial viewBox coordinates (independent from browser resizing)
            arcStartX = getViewboxX(Math.cos(angle_rad) * RADIUS);
            arcStartY = getViewboxY(Math.sin(angle_rad) * RADIUS);

            if (cursorOnly) {
                // TODO
            }

            if (cursorStart > 0) {
                let cursorLength = RADIUS * ((100.0 - cursorStart) / 100.0);  // cursor is in percents
                let cursorEndX = getViewboxX(Math.cos(angle_rad) * cursorLength);
                let cursorEndY = getViewboxY(Math.sin(angle_rad) * cursorLength);
                path_start = `M ${cursorEndX},${cursorEndY} L`;
            } else {
                path_start = 'M';
            }

            path_start += `${arcStartX},${arcStartY} A ${RADIUS},${RADIUS}`;

            mouseWheelDirection = _getOS() === 'Mac OS' ? -1 : 1;

            draw();
            attachEventHandlers();
        };

        const NS = "http://www.w3.org/2000/svg";

        function getValue() {
            let i = polarToDialAngle(polarAngle);
            let v = ((i - arcMin) / (arcMax - arcMin)) * (valueMax - valueMin) + valueMin;
            if (valueResolution === null) {
                return v;
            }
            return Math.round(v / valueResolution) * valueResolution;
        }

        /**
         * Angle in degrees in polar coordinates (0 degrees at 3 o'clock)
         */
        function setPolarAngle(angle) {
            let a = (angle + 360.0) % 360.0;    // we add 360 to handle negative values down to -360
            // apply boundaries
            let b = polarToDialAngle(a);
            if (b < arcMin) {
                a = minAngle;
            } else if (b > arcMax) {
                a = maxAngle;
            }
            polarAngle = a;
        }

        function incPolarAngle(increment) {
            setPolarAngle(polarAngle + increment);
        }

        /**
         * Angle in degrees in polar coordinates (0 degrees at 3 o'clock)
         */
        function getPolarAngle() {
            return polarAngle;
        }

        /**
         * Return polar coordinates angle from our "dial coordinates" angle
         */
        function dialToPolarAngle(angle) {
            let a = ZERO_AT - angle;
            if (a < 0) a = a + 360.0;
            console.log(`dialToPolarAngle ${angle} -> ${a}`);
            return a;
        }

        function polarToDialAngle(angle) {
            //TODO: CCW or CW. "-" for changing CCW to CW
            return (ZERO_AT - angle + 360.0) % 360.0;       // we add 360 to handle negative values down to -360
        }

        /**
         * Return viewBox X coordinates from cartesian -1..1 X
         */
        function getViewboxX(x) {

            // CW:  x = 20 --> 50 + 20 = 70
            // CCW: x = 20 --> 50 - 20 = 30

            return rotation === CW ? (HALF_WIDTH + x) : (HALF_WIDTH - x);
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
        function getPath(endAngle) {

            // SVG d: "A rx,ry xAxisRotate LargeArcFlag,SweepFlag x,y".
            // SweepFlag is either 0 or 1, and determines if the arc should be swept in a clockwise (1), or anti-clockwise (0) direction

            console.log(`getPath from ${minAngle} to ${endAngle}`);     // 240 330; 240-330=-90 + 360=270

            let a_rad = endAngle * Math.PI / 180.0;
            let endX = getViewboxX(Math.cos(a_rad) * RADIUS);
            let endY = getViewboxY(Math.sin(a_rad) * RADIUS);

            let deltaAngle = (minAngle - endAngle + 360.0) % 360.0;
            let largeArc = deltaAngle < 180.0 ? 0 : 1;

//        console.log(`deltaAngle ${deltaAngle} largeArc ${largeArc}`);

            let arcDirection = rotation === CW ? 1 : 0;

            if (cursorOnly) {
                // TODO
            }

            let path = path_start + ` 0 ${largeArc},${arcDirection} ${endX},${endY}`;

            if (cursorEnd > 0) {
                let cursorLength = RADIUS * ((100.0 - cursorEnd) / 100.0);  // cursor is in percents
                let cursorEndX = getViewboxX(Math.cos(a_rad) * cursorLength);
                let cursorEndY = getViewboxY(Math.sin(a_rad) * cursorLength);
                path += `L ${cursorEndX},${cursorEndY}`;
            }

            console.log(path);

            return path;
        }

        /**
         *
         */
        function redraw() {
            //TODO: setLabel()
            //TODO: setValue()
            currentTarget.childNodes[1].textContent = polarToDialAngle(getPolarAngle()).toFixed(0);
            currentTarget.childNodes[2].textContent = getValue().toFixed(3);
            currentTarget.childNodes[3].setAttributeNS(null, "d", getPath(getPolarAngle()));
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

            if (rotation === CCW) dx = - dx;

            // convert to polar coordinates
            let angle_rad = Math.atan2(dy, dx);

            if (angle_rad < 0) angle_rad = 2.0*Math.PI + angle_rad;

            console.log(`mouseUpdate: position in svg = ${dxPixels}, ${dyPixels} pixels; ${dx.toFixed(3)}, ${dy.toFixed(3)} rel.; angle ${angle_rad.toFixed(3)} rad`);

            setPolarAngle(angle_rad * 180.0 / Math.PI);     // rads to degs

            // distance from arc center to mouse position
            distance = Math.sqrt(dx*(HALF_WIDTH/RADIUS)*dx*(HALF_WIDTH/RADIUS) + dy*(HALF_HEIGHT/RADIUS)*dy*(HALF_HEIGHT/RADIUS));

        }

        /**
         *
         * @param e
         */
        function startDrag(e) {

            e.preventDefault();

            // API: Event.currentTarget
            //      Identifies the current target for the event, as the event traverses the DOM. It always REFERS TO THE ELEMENT
            //      TO WHICH THE EVENT HANDLER HAS BEEN ATTACHED, as opposed to event.target which identifies the element on
            //      which the event occurred.
            //      https://developer.mozilla.org/en-US/docs/Web/API/Event/currentTarget

            currentTarget = e.currentTarget;

            // API: Element.getBoundingClientRect() (standard: YES)
            //      The Element.getBoundingClientRect() method returns the size of an element
            //      and its POSITION RELATIVE TO THE VIEWPORT.
            //      The amount of scrolling that has been done of the viewport area (or any other
            //      scrollable element) is taken into account when computing the bounding rectangle.
            //      This means that the rectangle's boundary edges (top, left, bottom, and right)
            //      change their values every time the scrolling position changes (because their
            //      values are relative to the viewport and not absolute).
            //      https://developer.mozilla.org/en/docs/Web/API/Element/getBoundingClientRect

            targetRect = currentTarget.getBoundingClientRect(); // currentTarget must be the <svg...> object

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
            currentTarget = e.currentTarget;

            incPolarAngle(mouseWheelDirection * (dy / minDeltaY));     // TODO: make mousewheel direction configurable

            // TODO: timing --> speed
            // https://stackoverflow.com/questions/22593286/detect-measure-scroll-speed

            redraw();

            return false;
        }

        var draw = function() {

            // https://www.w3.org/TR/SVG/render.html#RenderingOrder:
            // Elements in an SVG document fragment have an implicit drawing order, with the first elements in the SVG document
            // fragment getting "painted" first. Subsequent elements are painted on top of previously painted elements.
            // ==> first element -> "painted" first

            let back = document.createElementNS(NS, "circle");
            back.setAttributeNS(null, "cx", "50");
            back.setAttributeNS(null, "cy", "50");
            back.setAttributeNS(null, "r", "40");
            back.setAttribute("class", "back");
            element.append(back);

            let valueText = document.createElementNS(NS, "text");
            valueText.setAttributeNS(null, "x", "50");
            valueText.setAttributeNS(null, "y", "55");
            valueText.setAttribute("class", "value");
            valueText.textContent = dialAngle;
            element.appendChild(valueText);

            let labelText = document.createElementNS(NS, "text");
            labelText.setAttributeNS(null, "x", "50");
            labelText.setAttributeNS(null, "y", "110");
            labelText.setAttribute("class", "label");
            labelText.textContent = label;
            element.appendChild(labelText);

            // setPolarAngle(dialToPolarAngle(dialAngle));     // TODO: remove setPolarAngle()
            // let p = getPath(dialToPolarAngle(dialAngle));     // TODO: value to arc

            let path = document.createElementNS(NS, "path");
            path.setAttributeNS(null, "d", p);
            path.setAttribute("class", "arc");

            element.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", "http://www.w3.org/1999/xlink");
            element.setAttributeNS(null, "viewBox", "0 0 100 120");
            element.setAttribute("class", "dial");
            element.appendChild(path);

        };  // draw()

        var attachEventHandlers = function() {
            element.addEventListener("mousedown", function(e) {
                startDrag(e);
            });
            element.addEventListener("wheel", function(e) {
                mouseWheelHandler(e);
            });
        };

        return {
            // get value() {
            //     return value;
            // },
            // set value(v) {
            //     value = v;
            // }
        };

    });
