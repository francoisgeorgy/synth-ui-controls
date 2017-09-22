import knob from './knob.js';

document.addEventListener("DOMContentLoaded", function(event) {

    const k1 = new knob(document.getElementById('knob1'), {});
    const k2 = new knob(document.getElementById('knob2'), {center_zero: true, value_min:-100, value_max:100});
    new knob(document.getElementById('knob3'), {zero_at: 90});
    new knob(document.getElementById('knob4'), {
        angle_min: 10,
        angle_max: 350,
        track_radius: 30,
        track_width: 16,
    });
    new knob(document.getElementById('knob5'), {
        linecap: 'butt'
    });
    new knob(document.getElementById('knob6'), {
        background: false,
        cursor: false,
        linecap: 'butt',
        track_bg_width: 20,
        track_width: 20,
        mouse_wheel_acceleration: 20
    });
    const k7 = new knob(document.getElementById('knob7'), {
        background: false,
        cursor_only: true,
        cursor_radius: 30,          // same unit as radius
        cursor_length: 20,
        cursor_width: 10,
        linecap: 'butt',
        track_bg_width: 20,
        mouse_wheel_acceleration: 10
    });
    new knob(document.getElementById('knob8'), {
        background: false,
        // back_color: 'transparent',
        // back_radius: 50,
        track_bg_radius: 50,
        track_bg_width: 1,
        // track_background: false,
        cursor_only: true,
        cursor_radius: 15,          // same unit as radius
        cursor_length: 30,
        cursor_width: 10,

    });

/*
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", "http://www.w3.org/1999/xlink");
    svg.setAttribute("style","width:100px");
    new knob(svg, {
        zero_at: 90,
        center_zero: true,
        angle_min: 190,
        angle_max: 170
    });
    document.getElementsByTagName('body')[0].appendChild(svg);
*/

    document.getElementById('reconf2').onclick = function() {
        console.log('reconfigure #knob2');
        k2.config = {
            center_zero: false
        };
    };

/*
    let knobs = {};

    // var knobs = document.querySelectorAll('svg.knob');
    [].forEach.call(document.querySelectorAll('svg.knob'), function(element) {
        knobs[element.id] = new knob(element);
        // element.addEventListener("change", function(event) {
        //     document.getElementById('v-' + element.id).innerHTML = event.detail;
        // });
    });

    // var k = new knob(document.getElementById('knob'), {});
    console.log(knobs);
*/

});
